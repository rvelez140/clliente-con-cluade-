FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de workspace desde el root
COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/

# Instalar todas las dependencias del workspace
RUN npm ci

# Copiar código fuente del frontend
COPY packages/frontend ./packages/frontend

# Build del frontend
WORKDIR /app/packages/frontend
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
