# ==========================================
# STAGE 1: Build production static assets
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package.json AND package-lock.json using wildcard target
COPY package*.json ./

# Set NPM registry to local fast mirror to avoid connection drops
RUN npm config set registry https://registry.npmmirror.com

# Run crisp and deterministic clean install using lockfile boundaries
RUN npm ci --prefer-offline --no-audit

# Copy core engine source code files
COPY . .

# Compile localized GIS dashboards distribution
RUN npm run build

# ==========================================
# STAGE 2: Lightweight runner distribution
# ==========================================
FROM nginx:1.25-alpine

# Stream optimized build outputs directly inside web workspace routing target
COPY --from=builder /app/dist /usr/share/nginx/html

# Inject customized reverse proxy configs mapping API architecture pipelines cleanly
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://backend:5000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
