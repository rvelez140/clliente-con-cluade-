FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de workspace desde el root
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/

# Instalar todas las dependencias del workspace
RUN npm ci

# Copiar código fuente del backend
COPY packages/backend ./packages/backend

# Build del backend
WORKDIR /app/packages/backend
RUN npm run build

FROM node:20-alpine

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/

# Instalar dependencias de producción
RUN npm ci --omit=dev

# Copiar build del backend
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

WORKDIR /app/packages/backend

EXPOSE 3000

CMD ["npm", "start"]
