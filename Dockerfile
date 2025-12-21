# NOTA: Este Dockerfile es un placeholder para compatibilidad con workflows antiguos
#
# Los Dockerfiles reales están en:
# - packages/backend/Dockerfile  (Backend - Node.js API)
# - packages/frontend/Dockerfile (Frontend - React + Nginx)
#
# Para compilar las imágenes correctas, usa:
#   docker build -f packages/backend/Dockerfile -t backend ./packages/backend
#   docker build -f packages/frontend/Dockerfile -t frontend ./packages/frontend
#
# Este archivo existe solo para evitar errores en workflows antiguos
# Los workflows correctos son:
# - .github/workflows/build-test.yml
# - .github/workflows/deploy.yml

FROM alpine:latest

RUN echo "⚠️  Este es un Dockerfile placeholder" && \
    echo "📁 Los Dockerfiles reales están en:" && \
    echo "   - packages/backend/Dockerfile" && \
    echo "   - packages/frontend/Dockerfile" && \
    echo "" && \
    echo "✅ Usa los workflows correctos:" && \
    echo "   - build-test.yml" && \
    echo "   - deploy.yml"

CMD ["sh", "-c", "echo '⚠️ Este contenedor no debe ejecutarse. Usa los Dockerfiles en packages/'"]
