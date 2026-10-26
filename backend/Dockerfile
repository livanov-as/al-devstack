# STEP 1: Build environment and compile TypeScript source code
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./

# Set NPM registry to local fast mirror to avoid connection drops in RU region
RUN npm config set registry https://registry.npmmirror.com

# Install ALL dependencies forcing legacy peer resolutions inside container
RUN npm ci --prefer-offline --no-audit --legacy-peer-deps
COPY . .

# Compile TypeScript to production-ready JavaScript (generates /dist folder)
RUN npm run build

# STEP 2: Minimalist high-performance production runtime environment
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./

# Set NPM registry for the clean production installation step
RUN npm config set registry https://registry.npmmirror.com

# Install ONLY runtime production dependencies cleanly bypassing all dev-linters conflicts
RUN npm ci --omit=dev --prefer-offline --no-audit --legacy-peer-deps

# Copy the compiled JavaScript files and GIS telemetry configuration assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config

EXPOSE 5000
# Run native micro-optimized JavaScript engine directly pointing to NestJS entrypoint
CMD ["node", "dist/main.js"]
