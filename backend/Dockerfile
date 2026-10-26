# Step 1: Build environment and compile TypeScript source code
FROM node:20-alpine AS builder
WORKDIR /app

# Copy all configuration manifests including Nest CLI schema frameworks
COPY package*.json tsconfig.json nest-cli.json ./

# Set NPM registry to local fast mirror to avoid connection drops in RU region
RUN npm config set registry https://registry.npmmirror.com

# Install ALL dependencies forcing legacy peer resolutions inside container
RUN npm ci --prefer-offline --no-audit --legacy-peer-deps
COPY . .

# Compile TypeScript to production-ready JavaScript (generates /dist folder)
RUN npm run build

# Step 2: Minimalist high-performance production runtime environment
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./

# Set NPM registry for the clean production installation step
RUN npm config set registry https://registry.npmmirror.com

# Install ONLY runtime production dependencies cleanly bypassing all dev-linters conflicts
RUN npm ci --omit=dev --prefer-offline --no-audit --legacy-peer-deps

# Copy only the compiled JavaScript files and core environment configs from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config

EXPOSE 5000
# Run micro-optimized Node engine directly pointing to the accurate NestJS compiled entrypoint file
CMD ["node", "dist/src/main.js"]
