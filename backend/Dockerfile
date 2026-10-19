# STEP 1: Build environment and compile TypeScript source code
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
# Install ALL dependencies (including typescript and @types)
RUN npm ci
COPY . .
# Compile TypeScript to production-ready JavaScript (generates /dist folder)
RUN npm run build
# Prune node_modules to leave ONLY production dependencies
RUN npm prune --production

# STEP 2: Minimalist high-performance production runtime environment
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Copy only the compiled JavaScript files
COPY --from=builder /app/dist ./dist
# Copy only the lightweight production node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 5000
# Run native micro-optimized JavaScript engine directly
CMD ["node", "dist/server.js"]
