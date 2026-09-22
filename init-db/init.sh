#!/bin/bash

# Print cloud-native data injection sequence initialization message
echo "=== STARTING CLOUD-NATIVE DATABASE PRE-SEEDING INJECTION ==="

# Determine available database network host (fallback to container_name if service name missing)
DB_HOST="mongodb"
if ! ping -c 1 "$DB_HOST" &> /dev/null; then
    DB_HOST="al-mongodb"
fi

echo "Connecting to database host: $DB_HOST"

# Import credentials and tracking collections targeting verified mongodb host node cleanly
mongoimport --host="$DB_HOST" --db=al-devstack --collection=certificates --file=/docker-entrypoint-initdb.d/certificates.json --jsonArray
mongoimport --host="$DB_HOST" --db=al-devstack --collection=progress --file=/docker-entrypoint-initdb.d/progress.json --jsonArray

# Confirm telemetry database seeding orchestration sequence success cleared
echo "=== DATABASE PRE-SEEDING SEQUENCE COMPLETED SUCCESSFULLY ==="
