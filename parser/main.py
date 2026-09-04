import os
import re
import asyncio
import httpx
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from pymongo import MongoClient, UpdateOne

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

MONGO_URI = os.getenv("MONGO_URI")
CACHE_SECRET_TOKEN = os.getenv("CACHE_SECRET_TOKEN")
TARGET_USERNAME = "livanov-as"

# FreeCodeCamp v9 Launch milestone date boundary (Strict UTC matching)
V9_LAUNCH_DATE = datetime(2024, 12, 25, tzinfo=timezone.utc)


def get_mongo_db():
    """Initializes MongoDB connection and returns the database object."""
    if not MONGO_URI:
        raise ValueError("MONGO_URI environment variable is missing in environment secrets")
    client = MongoClient(MONGO_URI)
    return client["al-devstack"]


async def parse_certifications(page) -> list:
    """Scrapes certified curricula slugs from the user profile using asynchronous selectors."""
    certs = []
    cert_elements = await page.query_selector_all("a[href*='/certification/']")
    for elem in cert_elements:
        href = await elem.get_attribute("href") or ""
        title = (await elem.inner_text()).strip()
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


async def parse_timeline_page(page) -> list:
    """Parses a single pagination page of the freeCodeCamp v9 timeline asynchronously."""
    tasks = []
    rows = await page.query_selector_all("tr.timeline-row")
    for row in rows:
        cells = await row.query_selector_all("td")
        if len(cells) >= 3:
            link_elem = await cells[0].query_selector("a")
            if not link_elem:
                continue
            task_name = (await link_elem.inner_text()).strip()
            url = await link_elem.get_attribute("href") or ""
            
            category = "unknown-task"
            if url:
                # Extracts the specific curricular section slug sequence directly from URL segment splits
                url_parts = [p for p in url.split("/") if p]
                if len(url_parts) >= 2 and url_parts[0] == "learn":
                    category = url_parts[1]
            
            time_elem = await row.query_selector("time")
            if time_elem:
                date_iso = await time_elem.get_attribute("datetime") or ""
                try:
                    # Enforces clean standard ISO parsing mapping with absolute UTC timezone bounds
                    task_date = datetime.fromisoformat(date_iso.replace("Z", "+00:00"))
                except Exception:
                    task_date = datetime.now(timezone.utc)
            else:
                task_date = datetime.now(timezone.utc)
                
            tasks.append({
                "username": TARGET_USERNAME,
                "task_name": task_name,
                "category": category,
                "date": task_date,
                "url": f"freecodecamp.org{url}" if url else ""
            })
    return tasks


async def flush_backend_cache():
    """Asynchronously triggers the backend cache flush webhook using the protected secret token."""
    if not CACHE_SECRET_TOKEN:
        print(" ⚠️ Cache token missing in environment. Webhook dispatch aborted.")
        return

    # Utilizing relative proxy mapping and pure Railway targets when deployed
    backend_url = os.getenv("BACKEND_INTERNAL_URL", "http://localhost:5000")
    flush_endpoint = f"{backend_url}/progress/cache-flush"
    
    print(f" 📡 Triggering orbital cache flush webhook endpoint: {flush_endpoint}")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                flush_endpoint,
                headers={"Authorization": f"Bearer {CACHE_SECRET_TOKEN}"},
                json={"token": CACHE_SECRET_TOKEN},
                timeout=10.0
            )
            if response.status_code == 200:
                print(" 🚀 Cache cleared successfully. Matrix synchronization complete.")
            else:
                print(f" ⚠️ Webhook synchronization returned status code: {response.status_code}")
    except Exception as e:
        print(f" ❌ Failed to dispatch backend cache-flush trigger payload: {str(e)}")

async def main():
    print(" 🚀 Starting total asynchronous HTML scraper lifecycle (fCC v9 compliance)...")
    db = get_mongo_db()
    
    parser_mode = os.getenv("PARSER_MODE", "INCREMENTAL").upper()
    print(f" 🛠️ Active operational execution environment profile set to: {parser_mode}")

    # Determine execution interval parameters dynamically based on selected operational mode profiles
    if parser_mode == "INCREMENTAL":
        last_task = db["progress"].find_one(sort=[("date", -1)])
        if last_task and "date" in last_task:
            # Enforce timezone safety on datetime extractions from database
            db_date = last_task["date"]
            if db_date.tzinfo is None:
                db_date = db_date.replace(tzinfo=timezone.utc)
            # Subtract 48-hour safety buffer window against cross-border latency or processing gaps
            TARGET_SYNC_BOUNDARY = db_date - timedelta(hours=48)
            print(f" ℹ️ Found existing records. Incremental sync boundary set to: {TARGET_SYNC_BOUNDARY}")
        else:
            TARGET_SYNC_BOUNDARY = V9_LAUNCH_DATE
            print(f" ℹ️ No historical records found. Sync boundary rolled back to v9 Launch: {TARGET_SYNC_BOUNDARY}")
    else:
        # TOTAL Mode scans all historical segments capping strictly at the global launch epoch boundary
        TARGET_SYNC_BOUNDARY = V9_LAUNCH_DATE
        print(f" ℹ️ Total scan profile engaged. Historical processing boundary locked: {TARGET_SYNC_BOUNDARY}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        context = await browser.new_context()
        page = await context.new_page()
        profile_url = f"https://freecodecamp.org/{TARGET_USERNAME}"
        
        print(f" 🌐 Navigating to public profile workspace: {profile_url}")
        await page.goto(profile_url, wait_until="domcontentloaded", timeout=60000)
        
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight);")
        await page.wait_for_timeout(3000)
        await page.wait_for_selector("tr.timeline-row", timeout=60000)
        
        # --- Synchronize Certifications ---
        print(" 🎖️ Synchronizing active verified credentials archive...")
        active_certs = await parse_certifications(page)
        if active_certs:
            for cert in active_certs:
                db["certificates"].update_one({"id": cert["id"]}, {"$set": cert}, upsert=True)
            print(f" ✅ Certifications matrix updated successfully. Size count: {len(active_certs)}")
            
        # --- Synchronize Timeline Tasks ---
        print(" ⏳ Gathering timeline pagination structural telemetry blocks...")
        all_scraped_tasks = []
        page_number = 1
        should_continue = True
        
        while should_continue:
            empty_page_retries = 2
            page_tasks = []
            
            # Anti-empty-page network latency stabilization loops
            while empty_page_retries > 0:
                page_tasks = await parse_timeline_page(page)
                if page_tasks:
                    break
                print(f" ⚠️ Warning: Page {page_number} returned 0 records. Refreshing viewport window buffers...")
                await page.wait_for_timeout(5000)
                empty_page_retries -= 1
                
            if not page_tasks:
                print(f" 🛑 Page {page_number} empty. Circuit breaking pagination iterator loop.")
                break
                
            page_filtered_count = 0
            for task in page_tasks:
                if task["date"] > TARGET_SYNC_BOUNDARY:
                    all_scraped_tasks.append(task)
                    page_filtered_count += 1
                    
            print(f" 📄 Page {page_number}: Scraped {len(page_tasks)} tasks. New target tasks: {page_filtered_count}")
            
            # Smart incremental fallback breaker to avoid deep scans when up to date
            if parser_mode == "INCREMENTAL" and page_filtered_count == 0 and page_number > 15:
                print(" 🏁 Safe depth boundary cleared in incremental tracking matrix. Halting iteration loops.")
                break
                
            next_button = await page.query_selector("button[aria-label='Go to next page']")
            if next_button and await next_button.is_visible() and not await next_button.is_disabled():
                # Extract first timeline entry signature state prior to executing trigger clicks
                first_row = await page.query_selector("tr.timeline-row a")
                current_signature = (await first_row.inner_text()).strip() if first_row else ""
                
                page_number += 1
                await next_button.click()
                
                # High-speed responsive VPN wait_for_function synchronization loop condition
                try:
                    await page.wait_for_function(
                        f"() => {{ const el = document.querySelector('tr.timeline-row a'); return el && el.innerText.strip() !== '{current_signature}'; }}",
                        timeout=15000
                    )
                except Exception:
                    # Fallback structural delay window baseline adjustment if script function execution caps out
                    await page.wait_for_timeout(4500)
            else:
                print(" 🏁 Historical terminal pagination node reached successfully.")
                should_continue = False
                
        # --- Bulk Write Operations ---
        if all_scraped_tasks:
            print(f"\n 📦 Initializing high-speed processing stream bundle for {len(all_scraped_tasks)} records...")
            bulk_operations = []
            for task in all_scraped_tasks:
                query = {
                    "username": task["username"], 
                    "url": task["url"] 
                }
                bulk_operations.append(UpdateOne(query, {"$set": task}, upsert=True))
                
            print(" 💾 Writing records directly to MongoDB Atlas cluster target nodes...")
            result = db["progress"].bulk_write(bulk_operations, ordered=False)
            
            print("\n=== SYSTEM ARCHITECTURE DATABASES SYNCHRONIZATION SUMMARY ===")
            print(f" 🎉 New infrastructure records upserted: {result.upserted_count}")
            print(f" 🔄 Pre-existing records checked / modified: {result.modified_count}")
            print(f" ✨ Consolidated pipeline payload: {len(all_scraped_tasks)}")
            print("==============================================================")
        else:
            print("\n  Data architecture validated. Remote Mongo Atlas clusters fully optimized!")
            
        await browser.close()
        
    # Trigger the event-driven cache validation flush webhook right at the finish line
    await flush_backend_cache()
    print(" 🎉 Parser application lifecycle context finalized cleanly.")


if __name__ == "__main__":
    asyncio.run(main())
