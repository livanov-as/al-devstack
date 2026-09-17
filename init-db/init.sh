#!/bin/bash

# Print initialization message
echo "=== INITIALIZING LOCAL MONGODB DATA REPOSITORIES ==="

# Import credentials collections using native mongoimport utility boundaries
mongoimport --db al-devstack --collection certificates --file /docker-entrypoint-initdb.d/certificates.json --jsonArray --mode upsert
mongoimport --db al-devstack --collection progress --file /docker-entrypoint-initdb.d/progress.json --jsonArray --mode upsert

# Confirm telemetry synchronization matrix success cleared
echo "=== DATABASE PRE-SEEDING SEQUENCE COMPLETED SUCCESSFULLY ==="
