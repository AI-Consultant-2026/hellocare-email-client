# Single-service production image: builds the React frontend, builds the Express
# backend, then serves the frontend's static build from the same process/origin as the
# API (see backend/src/app.ts) -- one Render web service, no separate static site.

FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app/backend
# The full backend-build output (not just dist/) is copied, because .sequelizerc loads
# migrations via ts-node/register at runtime, so src/, tsconfig.json, and the full
# node_modules (incl. devDependencies, which include ts-node/sequelize-cli) are needed.
COPY --from=backend-build /app/backend ./
COPY --from=frontend-build /app/frontend/dist ./public
EXPOSE 4100
CMD ["sh", "-c", "npm run migrate && npm start"]
