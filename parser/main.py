import os
import re
import sys
import random
import asyncio
import traceback
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

# FreeCodeCamp v9 Launch milestone date boundary - shifted 24h back for safety buffer
V9_LAUNCH_DATE = datetime(2024, 12, 24, 0, 0, tzinfo=timezone.utc)

# Infrastructure Context Flags
IS_DOCKER = os.getenv("IS_DOCKER_ENV", "false").lower() == "true"


def get_mongo_db():
    """Initializes MongoDB connection pooling and returns active client instance targets."""
    if not MONGO_URI:
        raise ValueError("MONGO_URI environment variable is missing in environment secrets")
    client = MongoClient(MONGO_URI)
    return client["al-devstack"]


def fetch_active_telemetry_queue(db, target_username: str = None) -> list:
    """
    Queries MongoDB Atlas to dynamically build the execution processing queue.
    Strictly filters out sandbox/demo accounts and caps total size to 11 for FinOps safety.
    Supports targeted single-user scraping if target_username parameter is provided.
    """
    try:
        # Build query criteria ensuring FinOps Guard blocks the automated sandbox boundary
        query_filter = {"username": {"$ne": "recruiter-tech-lead"}}
        
        if target_username:
            query_filter["username"] = target_username
            print(f" 🎯 Targeted Queue Filter: Isolated queue route specifically for user '{target_username}'.")

        cursor = db["users"].find(
            query_filter,
            {"username": 1, "role": 1}
        ).sort([("createdAt", 1)]).limit(11)
        
        queue = list(cursor)
        print(f" 📋 Telemetry Queue compiled: Mapped {len(queue)} profiles from MongoDB Atlas nodes.")
        return queue
    except Exception as e:
        print(f" ⚠️ Failed to resolve active cluster telemetry queue: {str(e)}. Falling back to emergency vector.")
        return []


def resolve_user_runtime_limits(user_doc) -> int:
    """
    Dynamically parses resolved SaaS role settings for the active iteration profile.
    Returns calculated MAX_PAGES_LIMIT strictly enforcing platform safety parameters.
    """
    if not user_doc:
        return 30
    user_role = str(user_doc.get("role", "USER")).lower()
    
    # Smart Depth Control Enforcement (Circuit Breaker)
    if IS_DOCKER or user_role == "user":
        return 30
    return 0 # Absolute unmetered tracking infrastructure access for ADMIN profiles


async def parse_certifications(page, username: str) -> list:
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
                "_id": f"{username}-{slug}",
                "slug": slug,
                "title": title,
                "url": f"freecodecamp.org{href}"
            })
    return certs


async def parse_timeline_page(page, username: str) -> list:
    """Parses a single pagination page of the freeCodeCamp v9 timeline asynchronously."""
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
            "username": username,
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
    except Exception as e:
        print(f" ⚠️ Webhook Exception: Failed to dispatch cache-flush trigger payload ({str(e)}). Pipeline preserved.")


async def main(target_username: str = None):
    print(" 🚀 Starting global asynchronous multi-user HTML scraper matrix...")
    
    try:
        db = get_mongo_db()
        users_queue = fetch_active_telemetry_queue(db, target_username)
        
        if not users_queue:
            print(" 🛑 Active telemetry queue is empty. Lifecycle workflow halted.")
            return

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
            chrome_user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            
            context = await browser.new_context(
                user_agent=chrome_user_agent,
                viewport={"width": 1280, "height": 720}
            )
            page = await context.new_page()

            # Process every extracted target profile sequentially through the pipeline
            for index, user_doc in enumerate(users_queue):
                username = user_doc["username"]
                print(f"\n────────────────────────────────────────────────────────────")
                print(f" 👤 [{index + 1}/{len(users_queue)}] Processing telemetry pipeline for: '{username}'")
                print(f"────────────────────────────────────────────────────────────")

                # Dynamic Role & SaaS Limit Resolution Layer per iteration node
                MAX_PAGES_LIMIT = resolve_user_runtime_limits(user_doc)
                print(f" 📊 Smart Depth Control: MAX_PAGES_LIMIT locked at {MAX_PAGES_LIMIT}")

                total_existing_records = db["progress"].count_documents({"username": username})
                env_parser_mode = os.getenv("PARSER_MODE", "").upper()
                
                if env_parser_mode in ["INCREMENTAL", "TOTAL"]:
                    parser_mode = env_parser_mode
                else:
                    parser_mode = "INCREMENTAL" if total_existing_records > 0 else "TOTAL"
                print(f" 🛠️ Execution mode compiled for '{username}': {parser_mode}")

                # Establish synchronization interval parameters and timezone guards
                if parser_mode == "INCREMENTAL":
                    last_task = db["progress"].find_one({"username": username}, sort=[("date", -1)])
                    if last_task and "date" in last_task:
                        db_date = last_task["date"]
                        if isinstance(db_date, str):
                            try:
                                db_date = datetime.fromisoformat(db_date.replace("Z", "+00:00"))
                            except Exception:
                                db_date = V9_LAUNCH_DATE
                        if db_date.tzinfo is None:
                            db_date = db_date.replace(tzinfo=timezone.utc)
                            
                        TARGET_SYNC_BOUNDARY = db_date - timedelta(hours=48)
                        print(f" ℹ️ Incremental boundary calculated (with 48h buffer): {TARGET_SYNC_BOUNDARY}")
                    else:
                        TARGET_SYNC_BOUNDARY = V9_LAUNCH_DATE
                        parser_mode = "TOTAL"
                else:
                    TARGET_SYNC_BOUNDARY = V9_LAUNCH_DATE
                    print(f" ℹ️ Total scan boundary configured: {V9_LAUNCH_DATE}")

                profile_url = f"https://freecodecamp.org/{username}"
                print(f" 🌐 Mounting browser viewport target: {profile_url}")
                
                try:
                    await page.goto(profile_url, wait_until="domcontentloaded", timeout=60000)
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight);")
                    await page.wait_for_timeout(3000)
                    
                    # Privacy and Visibility Gatekeeper Check
                    try:
                        await page.wait_for_selector("tr.timeline-row", timeout=12000)
                    except Exception:
                        print(f" 🛑 Profile timeline missing or private for '{username}'. Skipping node.")
                        continue

                    # Early Exit: Validate idle state immediately for active users
                    if parser_mode == "INCREMENTAL":
                        first_row = await page.query_selector("tr.timeline-row")
                        if first_row:
                            time_elem = await first_row.query_selector("time")
                            if time_elem:
                                first_date_iso = await time_elem.get_attribute("datetime") or ""
                                try:
                                    first_task_date = datetime.fromisoformat(first_date_iso.replace("Z", "+00:00"))
                                    last_saved_task = db["progress"].find_one({"username": username}, sort=[("date", -1)])
                                    if last_saved_task and "date" in last_saved_task:
                                        last_saved_date = last_saved_task["date"]
                                        if isinstance(last_saved_date, str):
                                            last_saved_date = datetime.fromisoformat(last_saved_date.replace("Z", "+00:00"))
                                        if last_saved_date.tzinfo is None:
                                            last_saved_date = last_saved_date.replace(tzinfo=timezone.utc)
                                        
                                        if first_task_date == last_saved_date:
                                            print(f" 🏁 Early Exit: Timeline state matches DB matrix cache for '{username}'.")
                                            continue
                                except Exception as e:
                                    print(f" ⚠️ Early Exit bypass via validation anomaly: {str(e)}")

                    # --- Synchronize Certifications ---
                    print(" 🎖️ Extraction mapping initialized for verified certificates...")
                    active_certs = await parse_certifications(page, username)
                    if active_certs:
                        for cert in active_certs:
                            db["certificates"].update_one({"_id": cert["_id"]}, {"$set": cert}, upsert=True)
                        print(f" ✅ Certificates synchronized. Matrix count: {len(active_certs)}")

                    # --- Synchronize Timeline Tasks ---
                    print(" ⏳ Scraping temporal curriculum timeline telemetry fragments...")
                    all_scraped_tasks = []
                    page_number = 1
                    should_continue = True
                    
                    while should_continue:
                        page_tasks = await parse_timeline_page(page, username)
                        if not page_tasks:
                            print(f" 🛑 Page {page_number} buffer blank. Halting pagination loop.")
                            break
                            
                        page_filtered_count = 0
                        for task in page_tasks:
                            is_v9_curriculum = "v9" in task["category"].lower()
                            
                            if parser_mode == "TOTAL" and task["date"] < TARGET_SYNC_BOUNDARY:
                                should_continue = False
                                break
                            
                            if is_v9_curriculum and task["date"] > TARGET_SYNC_BOUNDARY:
                                all_scraped_tasks.append(task)
                                page_filtered_count += 1
                                
                        print(f" 📄 Page {page_number}: Collected {len(page_tasks)} nodes. Valid target items: {page_filtered_count}")
                        
                        if not should_continue:
                            break
                        if MAX_PAGES_LIMIT > 0 and page_number >= MAX_PAGES_LIMIT:
                            print(f" 🏁 SaaS Boundary triggered at Page {page_number}.")
                            break
                        if parser_mode == "INCREMENTAL" and page_filtered_count == 0 and page_number > 15:
                            break

                        next_button_item = await page.query_selector("li.timeline-pagination_list_item:has(button[aria-label='Go to next page'])")
                        if next_button_item and should_continue:
                            await next_button_item.scroll_into_view_if_needed()
                            await asyncio.sleep(random.uniform(1.5, 3.5))  # Anti-bot pagination jitter
                            
                            next_button = await next_button_item.query_selector("button")
                            is_disabled = await next_button.get_attribute("disabled") if next_button else "true"
                            
                            if next_button and is_disabled is None:
                                first_row = await page.query_selector("tr.timeline-row a")
                                current_signature = (await first_row.inner_text()).strip() if first_row else ""
                                
                                page_number += 1
                                await next_button.click()
                                
                                try:
                                    await page.wait_for_function(
                                        f"() => {{ const el = document.querySelector('tr.timeline-row a'); return el && el.innerText.strip() !== '{current_signature}'; }}",
                                        timeout=12000
                                    )
                                except Exception:
                                    await page.wait_for_timeout(4000)
                            else:
                                should_continue = False
                        else:
                            should_continue = False

                    # --- Bulk Write Operations per user ---
                    if all_scraped_tasks:
                        bulk_operations = []
                        for task in all_scraped_tasks:
                            bulk_operations.append(UpdateOne({"username": task["username"], "url": task["url"]}, {"$set": task}, upsert=True))
                        
                        result = db["progress"].bulk_write(bulk_operations, ordered=False)
                        print(f" 💾 Database sync summary for '{username}': Upserted: {result.upserted_count}, Modified: {result.modified_count}")
                    else:
                        print(f" ✨ State verified for '{username}'. Storage schemas fully optimized.")

                except Exception as user_err:
                    print(f" ❌ Anomaly skipped on profile '{username}': {str(user_err)}")
                    traceback.print_exc()

                # --- High-Viability FinOps Anti-Ban Jitter Layer ---
                if index < len(users_queue) - 1:
                    anti_ban_delay = random.uniform(30.0, 90.0)
                    print(f" 💤 Cluster Safeguard: Anti-ban jitter activated. Sleeping for {anti_ban_delay:.2f}s before next node...")
                    await asyncio.sleep(anti_ban_delay)

            await browser.close()
            
            # Global Cache Invalidation Step following successful iterations
            await flush_backend_cache()
            print("\n 🎉 Dynamic multi-user scraping lifecycle successfully completed.")

    except Exception as e:
        print("\n❌ CRITICAL CRASH: Global multi-user workflow engine aborted execution.")
        traceback.print_exc()
        raise e

if __name__ == "__main__":
    # Extracted username string parameter mapped sequentially from sys args execution context boundary
    input_username = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(main(input_username))
