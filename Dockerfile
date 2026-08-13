# ==========================================
# DOCKERFILE - STRIPE TERMINAL DEMO
# Repo: https://github.com/infodukwat-debug/stripe-terminal-js-demo
# Multi-stage build
# ==========================================

# Stage 1: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Copier package files
COPY package*.json ./

# Installer dépendances
RUN npm ci

# Copier code source
COPY public ./public
COPY src ./src

# Build app avec variables d'environnement
ARG REACT_APP_BACKEND_URL=https://qnook-backend-unified.onrender.com
ARG REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV REACT_APP_STRIPE_PUBLISHABLE_KEY=$REACT_APP_STRIPE_PUBLISHABLE_KEY

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copier config nginx optimisée
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf

# Copier les fichiers buildés
COPY --from=builder /app/build /usr/share/nginx/html

# Permissions
RUN chmod -R 755 /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
