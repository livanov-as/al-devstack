import os
import re
import asyncio
import httpx
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from pymongo import MongoClient, UpdateOne

# --- CONFIGURATION & ENV SUBSYSTEMS ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

MONGO_URI = os.getenv("MONGO_URI")
CACHE_SECRET_TOKEN = os.getenv("CACHE_SECRET_TOKEN")
TARGET_USERNAME = os.getenv("TARGET_USERNAME", "livanov-as")

# FreeCodeCamp v9 Launch milestone date boundary - shifted 24h back for safety buffer
V9_LAUNCH_DATE = datetime(2024, 12, 24, 0, 0, tzinfo=timezone.utc)

# RBAC & INFRASTRUCTURE CONTEXT ARCHITECTURE
# Role structure fallback to 'user' to ensure strict isolation boundary controls
USER_ROLE = os.getenv("CURRENT_USER_ROLE", "user").lower()
IS_DOCKER = os.getenv("IS_DOCKER_ENV", "false").lower() == "true"

# ULTIMATE DOCKER & MULTI-USER PERFORMANCE OPTIMIZATION
# If executing inside local Docker context (removes init-db necessity) OR user role is standard user,
# restrict pagination lookup window depth strictly to 30 pages to preserve API network bandwidth.
# Full deep scan history is unlocked exclusively for 'admin' running outside Docker container profiles.
if IS_DOCKER or USER_ROLE == "user":
    MAX_PAGES_LIMIT = 30
else:
    MAX_PAGES_LIMIT = 0


def get_mongo_db():
    """Initializes MongoDB connection pooling and returns active client instance targets."""
    if not MONGO_URI:
        raise ValueError("MONGO_URI environment variable is missing in environment secrets")
    client = MongoClient(MONGO_URI)
    return client["al-devstack"]


async def parse_certifications(page) -> list:
    """Scrapes certified curricula slugs from the user profile view layers asynchronously."""
    certs = []
    cert_elements = await page.query_selector_all("a[href*='/certification/']")
    for elem in cert_elements:
        href = await elem.get_attribute("href") or ""
        title = (await elem.inner_text()).strip()
        match = re.search(r"/certification/[^/]+/([^/]+)$", href)
        if match:
            slug = match.group(1)
            certs.append({
                "_id": f"{TARGET_USERNAME}-{slug}",
                "slug": slug,
                "title": title,
                "url": f"freecodecamp.org{href}"
            })
    return certs


async def parse_timeline_page(page) -> list:
    """Parses a single pagination page of the freeCodeCamp v9 timeline asynchronously.
    Looks for links across the entire row structure due to shifting markup layouts.
    """
    tasks = []
    rows = await page.query_selector_all("tr.timeline-row")
    for row in rows:
        link_elem = await row.query_selector("td a[href^='/learn/']")
        if not link_elem:
            continue
            
        task_name = (await link_elem.inner_text()).strip()
        url = await link_elem.get_attribute("href") or ""
        
        category = "unknown-task"
        if url:
            url_parts = [p for p in url.split("/") if p]
            if len(url_parts) >= 2 and url_parts[0] == "learn":
                category = url_parts[1]
        
        time_elem = await row.query_selector("time")
        if time_elem:
            date_iso = await time_elem.get_attribute("datetime") or ""
            try:
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

    backend_url = os.getenv("BACKEND_INTERNAL_URL", "http://localhost:5000")
    flush_endpoint = f"{backend_url}/api/progress/cache-flush"
    
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
            elif response.status_code == 404:
                print(f" ⚠️ Webhook target route missing (404 Not Found) at {flush_endpoint}. Skipping cache flush.")
            else:
                print(f" ⚠️ Webhook synchronization returned unexpected status code: {response.status_code}")
    except httpx.ConnectError:
        print(" ⚠️ Webhook Network Exception: Backend server is unreachable. Pipeline preserved.")
    except httpx.TimeoutException:
        print(" ⚠️ Webhook Timeout Exception: Connection timed out. Pipeline preserved.")
    except Exception as e:
        print(f" ⚠️ Webhook Unknown Exception: Failed to dispatch cache-flush trigger payload ({str(e)}). Pipeline preserved.")


async def main():
    print(" 🚀 Starting total asynchronous HTML scraper lifecycle (fCC v9 compliance)...")
    db = get_mongo_db()
    
    # 1. Zero-Configuration: Automatically detect active operational profile mode
    total_existing_records = db["progress"].count_documents({})
    
    # Check if manual override flag is provided via environment variables
    env_parser_mode = os.getenv("PARSER_MODE", "").upper()
    
    if env_parser_mode in ["INCREMENTAL", "TOTAL"]:
        parser_mode = env_parser_mode
        print(f" 🛠️ Manual override engaged. Operating profile enforced: {parser_mode}")
    else:
        # Smart fallback allocation depending on local database infrastructure state
        parser_mode = "INCREMENTAL" if total_existing_records > 0 else "TOTAL"
        print(f" 🛠️ Auto-detected operational execution profile mode: {parser_mode}")

    # 2. Establish synchronization interval parameters and timezone guards
    if parser_mode == "INCREMENTAL":
        last_task = db["progress"].find_one(sort=[("date", -1)])
        if last_task and "date" in last_task:
            db_date = last_task["date"]
            
            # Defensive type guard validation: handle raw string seeds safely
            if isinstance(db_date, str):
                try:
                    db_date = datetime.fromisoformat(db_date.replace("Z", "+00:00"))
                except Exception:
                    db_date = V9_LAUNCH_DATE
                    
            # Timezone awareness guard: enforce strict offset-aware UTC standard
            if db_date.tzinfo is None:
                db_date = db_date.replace(tzinfo=timezone.utc)
                
            # Compute the 48-hour safety buffer window against cross-border processing latency
            TARGET_SYNC_BOUNDARY = db_date - timedelta(hours=48)
            print(f" ℹ️ Incremental sync boundary calculated (including 48h buffer): {TARGET_SYNC_BOUNDARY}")
        else:
            TARGET_SYNC_BOUNDARY = V9_LAUNCH_DATE
            parser_mode = "TOTAL"
            print(f" ℹ️ No historical date index records found. Upgraded to mode: TOTAL")
    else:
        TARGET_SYNC_BOUNDARY = V9_LAUNCH_DATE
        print(f" ℹ️ Total scan profile engaged. Historical processing boundary locked: {V9_LAUNCH_DATE}")

    print(f" 📊 Operational parameters allocated. Smart Depth Control: MAX_PAGES_LIMIT = {MAX_PAGES_LIMIT}")

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

        # 3. Circuit Breaker / Early Exit: Validate idle state on the first page immediately
        if parser_mode == "INCREMENTAL":
            first_row = await page.query_selector("tr.timeline-row")
            if first_row:
                time_elem = await first_row.query_selector("time")
                if time_elem:
                    first_date_iso = await time_elem.get_attribute("datetime") or ""
                    try:
                        first_task_date = datetime.fromisoformat(first_date_iso.replace("Z", "+00:00"))
                        last_saved_task = db["progress"].find_one(sort=[("date", -1)])
                        if last_saved_task and "date" in last_saved_task:
                            last_saved_date = last_saved_task["date"]
                            if isinstance(last_saved_date, str):
                                last_saved_date = datetime.fromisoformat(last_saved_date.replace("Z", "+00:00"))
                            if last_saved_date.tzinfo is None:
                                last_saved_date = last_saved_date.replace(tzinfo=timezone.utc)
                            
                            # If dates match second-to-second, break pipeline execution immediately
                            if first_task_date == last_saved_date:
                                print(f" 🏁 Early Exit: First DOM task date ({first_task_date}) matches latest DB record.")
                                await browser.close()
                                print(" 🎉 Scraper safely went into hibernation. Resource usage minimized.")
                                return
                    except Exception as e:
                        print(f" ⚠️ Early Exit validation skipped due to parsing exception: {str(e)}")

        # --- Synchronize Certifications ---
        print(" 🎖️ Synchronizing active verified credentials archive...")
        active_certs = await parse_certifications(page)
        if active_certs:
            for cert in active_certs:
                db["certificates"].update_one({"_id": cert["_id"]}, {"$set": cert}, upsert=True)
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
                is_v9_curriculum = "v9" in task["category"].lower()
                
                # STRICT TOTAL CRITERIA BREAK: Halt entirely if we clear the historical Epoch timeline boundary (Shifted to 24th Dec)
                if parser_mode == "TOTAL" and task["date"] < TARGET_SYNC_BOUNDARY:
                    print(f" 🏁 Epoch Boundary Reached: Task date ({task['date']}) is older than safe V9 launch limit. Initiating sequence shutdown.")
                    should_continue = False
                    break
                
                if is_v9_curriculum and task["date"] > TARGET_SYNC_BOUNDARY:
                    all_scraped_tasks.append(task)
                    page_filtered_count += 1
                    
            print(f" 📄 Page {page_number}: Scraped {len(page_tasks)} tasks. New target v9 tasks: {page_filtered_count}")
            
            if not should_continue:
                break

            # DYNAMIC SAAS / DOCKER BOUNDARY HARD LIMIT CHECK
            if MAX_PAGES_LIMIT > 0 and page_number >= MAX_PAGES_LIMIT:
                print(f" 🏁 SaaS Boundary Reached: Rapid sync limit of {MAX_PAGES_LIMIT} pages enforced. Halting pagination loop.")
                should_continue = False
                break

            # Smart incremental fallback breaker to avoid deep scans when up to date
            if parser_mode == "INCREMENTAL" and page_filtered_count == 0 and page_number > 15:
                print(" 🏁 Safe depth boundary cleared in incremental tracking matrix. Halting iteration loops.")
                break

            # Locate the pagination control button component directly in the DOM
            next_button_item = await page.query_selector("li.timeline-pagination_list_item:has(button[aria-label='Go to next page'])")
            
            if next_button_item and should_continue:
                # Force scroll to the specific list item container
                await next_button_item.scroll_into_view_if_needed()
                await page.wait_for_timeout(1000)
                
                next_button = await next_button_item.query_selector("button")
                is_disabled = await next_button.get_attribute("disabled") if next_button else "true"
                
                if next_button and is_disabled is None:
                    # Extract first timeline entry signature state prior to executing trigger clicks
                    first_row = await page.query_selector("tr.timeline-row a")
                    current_signature = (await first_row.inner_text()).strip() if first_row else ""
                    
                    page_number += 1
                    print(f" 🚀 Executing click sequence for page transition to Page: {page_number}")
                    await next_button.click()
                    
                    try:
                        await page.wait_for_function(
                            f"() => {{ const el = document.querySelector('tr.timeline-row a'); return el && el.innerText.strip() !== '{current_signature}'; }}",
                            timeout=15000
                        )
                    except Exception:
                        await page.wait_for_timeout(4500)
                else:
                    print(" 🏁 Historical terminal pagination node reached successfully (Target button is disabled).")
                    should_continue = False
            else:
                if should_continue:
                    print(" 🏁 Historical terminal pagination node reached successfully (Target button container missing).")
                should_continue = False

        # --- Bulk Write Operations & Webhook Execution ---
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
            
            await flush_backend_cache()
        else:
            print("\n  Data architecture validated. Remote Mongo Atlas clusters fully optimized! Cache flush skipped.")
            
        await browser.close()
        print(" 🎉 Parser application lifecycle context finalized cleanly.")

if __name__ == "__main__":
    asyncio.run(main())
