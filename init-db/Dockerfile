# Use ultra-lightweight alpine linux distribution for optimal finops foot-print
FROM alpine:latest

# Install clean native mongodb database tools package with glibc compatibility layer
RUN apk add --no-cache mongodb-tools bash gcompat

# Copy tracking telemetry data and orchestration injection sequence cleanly
COPY certificates.json progress.json init.sh /docker-entrypoint-initdb.d/

# Grant executable lifecycle permissions to the initialization shell script layer
RUN chmod +x /docker-entrypoint-initdb.d/init.sh
