import os
import re
from datetime import datetime, timedelta
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from pymongo import MongoClient, UpdateOne

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

MONGO_URI = os.getenv("MONGO_URI")
TARGET_USERNAME = "livanov-as"

def get_mongo_db():
    """Initializes MongoDB connection and returns the database object."""
    if not MONGO_URI:
        raise ValueError("MONGO_URI environment variable is missing in .env")
    client = MongoClient(MONGO_URI)
    return client["al-devstack"]

def parse_certifications(page) -> list:
    """Scrapes certified curricula slugs from the user profile."""
    certs = []
    cert_elements = page.query_selector_all("a[href*='/certification/']")
    for elem in cert_elements:
        href = elem.get_attribute("href") or ""
        title = elem.inner_text().strip()
        match = re.search(r"/certification/[^/]+/([^/]+)$", href)
        if match:
            slug = match.group(1)
            certs.append({
                "id": f"{TARGET_USERNAME}-{slug}",
                "slug": slug,
                "title": title,
                "url": f"freecodecamp.org{href}"
            })
    return certs

def parse_timeline_page(page) -> list:
    """Parses a single pagination page of the freeCodeCamp v9 timeline."""
    tasks = []
    rows = page.query_selector_all("tr.timeline-row")
    for row in rows:
        cells = row.query_selector_all("td")
        if len(cells) >= 3:
            # Fix DOM selector: strictly search within the first cell of the current row
            link_elem = cells[0].query_selector("a")
            if not link_elem:
                continue
            task_name = link_elem.inner_text().strip()
            url = link_elem.get_attribute("href") or ""
            
            category = "unknown-task"
            if url:
                match = re.search(r"/learn/([^/]+)/", url)
                if match:
                    category = match.group(1)
            
            time_elem = row.query_selector("time")
            if time_elem:
                date_iso = time_elem.get_attribute("datetime") or ""
                try:
                    date_iso_clean = date_iso.split(".")[0].replace("Z", "")
                    task_date = datetime.strptime(date_iso_clean, "%Y-%m-%dT%H:%M:%S")
                except Exception:
                    task_date = datetime.now()
            else:
                task_date = datetime.now()
                
            tasks.append({
                "username": TARGET_USERNAME,
                "task_name": task_name,
                "category": category,
                "date": task_date,
                "url": f"freecodecamp.org{url}" if url else ""
            })
    return tasks

def main():
    print(" 🚀 Starting total HTML scraper lifecycle (fCC v9 compliance)...")
    db = get_mongo_db()
    
    # Smart increment fallback: check the most recent task date in the database
    last_task = db["progress"].find_one(sort=[("date", -1)])
    if last_task and "date" in last_task:
        # Subtract 1 day as a safety margin against timezone discrepancies
        DEFAULT_TARGET_DATE = last_task["date"] - timedelta(days=1)
        print(f" ℹ️ Found existing records. Incremental sync boundary set to: {DEFAULT_TARGET_DATE}")
    else:
        DEFAULT_TARGET_DATE = datetime(2024, 12, 24)
        print(f" ℹ️ No existing records found. Global sync boundary set to default: {DEFAULT_TARGET_DATE}")

    with sync_playwright() as p:
        # Using headless=True for performance. Switch to False locally if you want visual tracking.
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        profile_url = f"https://freecodecamp.org/{TARGET_USERNAME}"
        
        print(f" 🌐 Navigating to public profile: {profile_url}")
        page.goto(profile_url, wait_until="domcontentloaded", timeout=60000)
        
        page.evaluate("window.scrollTo(0, document.body.scrollHeight);")
        page.wait_for_timeout(3000)
        page.wait_for_selector("tr.timeline-row", timeout=60000)
        
        # --- Synchronize Certifications ---
        print(" 🎖️ Synchronizing active certifications...")
        active_certs = parse_certifications(page)
        if active_certs:
            for cert in active_certs:
                db["certificates"].update_one({"id": cert["id"]}, {"$set": cert}, upsert=True)
            print(f" ✅ Certifications synced successfully. Total: {len(active_certs)}")
            
        # --- Synchronize Timeline Tasks ---
        print(" ⏳ Gathering timeline pagination blocks...")
        all_scraped_tasks = []
        page_number = 1
        should_continue = True
        
        while should_continue:
            empty_page_retries = 2
            page_tasks = []
            
            # Anti-empty-page protective loop against network lags
            while empty_page_retries > 0:
                page_tasks = parse_timeline_page(page)
                if page_tasks:
                    break
                print(f" ⚠️ Warning: Page {page_number} returned 0 tasks. Retrying in 5s... ({empty_page_retries} retries left)")
                page.wait_for_timeout(5000)
                empty_page_retries -= 1
                
            if not page_tasks:
                print(f" 🛑 Page {page_number} is completely empty after retries. Terminating loop.")
                break
                
            page_filtered_count = 0
            # Total Scan: check absolutely every single task to protect against fCC pagination bugs
            for task in page_tasks:
                if task["date"] > DEFAULT_TARGET_DATE:
                    all_scraped_tasks.append(task)
                    page_filtered_count += 1
                    
            print(f" 📄 Page {page_number}: Scraped {len(page_tasks)} tasks. New tasks found on page: {page_filtered_count}")
                
            next_button = page.query_selector("button[aria-label='Go to next page']")
            if next_button and next_button.is_visible() and not next_button.is_disabled():
                page_number += 1
                next_button.click()
                page.wait_for_timeout(4500)
            else:
                print(" 🏁 All available historical pages successfully processed.")
                should_continue = False
                
        # --- Bulk Write Operations ---
        if all_scraped_tasks:
            print(f"\n 📦 Preparing payload bundle of {len(all_scraped_tasks)} tasks...")
            bulk_operations = []
            for task in all_scraped_tasks:
                query = {
                    "username": task["username"],
                    "task_name": task["task_name"],
                    "category": task["category"],
                    "date": task["date"]
                }
                bulk_operations.append(UpdateOne(query, {"$set": task}, upsert=True))
                
            print(" 💾 Executing bulk write stream to MongoDB Atlas...")
            result = db["progress"].bulk_write(bulk_operations, ordered=False)
            
            print("\n=== DATABASE SYNCHRONIZATION SUMMARY ===")
            print(f" 🎉 New unique tasks appended: {result.upserted_count}")
            print(f" 🔄 Existing documents validated/modified: {result.modified_count}")
            print(f" ✨ Total processed incoming records: {len(all_scraped_tasks)}")
            print("========================================")
        else:
            print("\n  No matching lifecycle tasks detected. Atlas is completely up to date!")
            
        browser.close()
        print(" 🎉 Scraper pipeline execution completed successfully.")

if __name__ == "__main__":
    main()
