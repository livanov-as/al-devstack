# Use official lightweight Python stable bookworm image for seamless Playwright compatibility
FROM python:3.11-slim-bookworm

WORKDIR /app

# Ensure apt package lists are updated and clean
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy environments manifest first to leverage Docker layer caching efficiently
COPY requirements.txt ./

# Install python packages dependencies cleanly
RUN pip install --no-cache-dir -r requirements.txt

# Install Chromium binary AND its specific system dependencies only, saving up to 70% of storage
RUN playwright install chromium
RUN playwright install-deps chromium

# Copy core parser script tracking logic assets
COPY . .

# Run the scraping synchronization lifecycle pipeline
CMD ["python", "main.py"]
