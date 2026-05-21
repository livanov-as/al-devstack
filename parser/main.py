import os
import re
from datetime import datetime
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from pymongo import MongoClient
import certifi

# --- CONFIGURATION & SETTINGS ---
# Dynamically locate the .env file in the root project folder
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))

MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
DEFAULT_TARGET_DATE = datetime(2024, 12, 25)  # Baseline cutoff date if DB is empty
USERNAME = "livanov-as"


def get_mongo_db():
    """Initializes MongoDB connection using SSL certificate with an explicit database name."""
    if not MONGO_URI:
        raise ValueError("Error: MONGO_URI or MONGODB_URI variable not found in the .env file")
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
    return client.get_database("al-devstack")


def get_latest_task_date(db, username):
    """Retrieves the timestamp of the most recently saved task from MongoDB to enable incremental scraping."""
    latest_task = db["progress"].find_one(
        {"username": username},
        sort=[("date", -1)]  # Sort by date descending (most recent on top)
    )
    if latest_task and "date" in latest_task:
        print(f"Sync point found in DB: {latest_task['date'].strftime('%Y-%m-%d %H:%M:%S')}")
        return latest_task["date"]
    
    print(f"Database is empty. Starting sync from baseline date: {DEFAULT_TARGET_DATE.strftime('%Y-%m-%d')}")
    return DEFAULT_TARGET_DATE


def parse_date(date_str):
    """Converts a freeCodeCamp timestamp or ISO string into a Python datetime object."""
    try:
        if date_str.isdigit():
            return datetime.fromtimestamp(int(date_str) / 1000)
        return datetime.fromisoformat(date_str.replace("Z", "+00:00")).replace(tzinfo=None)
    except:
        return None


# --- SCRAPING LOGIC ---
def scrape_certificates(page, username):
    """Scrapes valid certificates from the profile page, filtering out legacy ones."""
    print("Scanning active certifications...")
    selectors = page.query_selector_all("a[href*='/certification/']")
    certs = []
    
    for item in selectors:
        title = item.inner_text().strip()
        href = item.get_attribute("href") or ""
        
        if not title or not href or "legacy" in title.lower():
            continue
            
        category_match = re.search(rf'/certification/{username}/([^/?#]+)', href)
        course_category = category_match.group(1) if category_match else "unknown-certification"
        
        # Fixed: Protocol added to guarantee correct URL mapping
        full_url = f"https://freecodecamp.org{href}" if href.startswith("/") else href
        
        certs.append({
            "username": username,
            "title": title,
            "course_category": course_category,
            "url": full_url
        })
    return certs


def parse_page_tasks(page, username, stop_date):
    """Parses timeline tasks from the current active pagination page with an incremental stop condition."""
    rows = page.query_selector_all("tr.timeline-row")
    page_data = []
    should_continue = True 

    for row in rows:
        cols = row.query_selector_all("td")
        if len(cols) < 3: 
            continue
        
        # Querying inside the current row element context
        link = row.query_selector("a")
        time_elem = row.query_selector("time")
        
        if not link or not time_elem: 
            continue

        dt_attr = time_elem.get_attribute("datetime")
        task_date = parse_date(dt_attr)
        
        if task_date:
            # If the task is strictly newer than the database sync point, capture it
            if task_date > stop_date:
                href = link.get_attribute("href") or ""
                match = re.search(r'/learn/([^/]+)/', href)
                category = match.group(1) if match else "unknown-task"
                full_url = f"https://freecodecamp.org{href}" if href.startswith("/") else href
                
                page_data.append({
                    "username": username,
                    "task_name": link.inner_text().strip(),
                    "category": category,
                    "date": task_date,
                    "url": full_url
                })
            else:
                # Target sync date reached. Stop pagination loop.
                should_continue = False
                break

    return page_data, should_continue


# --- MAIN DISPATCHER ---
def main():
    try:
        db = get_mongo_db()
    except ValueError as e:
        print(e)
        return

    # Dynamically determine the incremental sync threshold
    stop_date = get_latest_task_date(db, USERNAME)
    url = f"https://freecodecamp.org/{USERNAME}"

    with sync_playwright() as p:
        print("Launching headless Chromium browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print(f"Navigating to user profile: {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        
        print("Waiting for profile elements to render...")
        page.wait_for_selector("h1", timeout=15000)
        page.wait_for_timeout(3000)  # Allow React SPA components to fully stabilize

        # 1. Sync Certifications
        certs = scrape_certificates(page, USERNAME)
        if certs:
            db["certificates"].delete_many({"username": USERNAME})
            db["certificates"].insert_many(certs)
            print(f"Certificates sync completed. Total in DB: {len(certs)}")

        # 2. Incremental Timeline Scraping via Pagination
        print("Starting incremental data synchronization...")
        new_tasks = []
        current_page_num = 1

        while True:
            print(f"Analyzing pagination page {current_page_num}...")
            page_tasks, loop_continue = parse_page_tasks(page, USERNAME, stop_date)
            new_tasks.extend(page_tasks)
            
            if len(page_tasks) > 0:
                print(f"Page {current_page_num}: Found {len(page_tasks)} new tasks.")

            if not loop_continue:
                print("Reached already synchronized records. Stopping sequence.")
                break

            next_btn = page.query_selector("button[aria-label='Go to next page']")
            if next_btn and next_btn.is_visible() and not next_btn.is_disabled():
                next_btn.scroll_into_view_if_needed()
                next_btn.click()
                current_page_num += 1
                page.wait_for_timeout(2000)  # Wait for React DOM state transition
            else:
                print("Next page button is unavailable. Reached end of timeline pagination.")
                break

        # 3. Store results to MongoDB without wiping out the historical records
        if new_tasks:
            db["progress"].insert_many(new_tasks)
            print(f"Successfully appended {len(new_tasks)} new tasks to the progress collection.")
        else:
            print("Sync complete. No new completed tasks detected.")

        browser.close()
        print("Scraper lifecycle executed successfully.")


if __name__ == "__main__":
    main()
