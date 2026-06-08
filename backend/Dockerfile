# Backend Dockerfile for Fruit App
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
EXPOSE 5000
ENV PORT=5000
CMD ["node", "index.js"]
