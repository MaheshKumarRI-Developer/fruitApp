# Backend Dockerfile for Fruit App
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
# Dataset file is included from the build context (project root)
# It is copied to /25_fruits_rag_dataset.json (one level above /app)
COPY 25_fruits_rag_dataset.json /25_fruits_rag_dataset.json
EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production
CMD ["node", "index.js"]
