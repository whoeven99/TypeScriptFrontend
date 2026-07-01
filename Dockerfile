# Spark-style deploy: prod deps only, build in image, fast container start (prisma generate only).
FROM node:20-slim

RUN apt-get update -y \
  && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

EXPOSE 8080

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* .npmrc ./
COPY patches ./patches

RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

COPY . .

RUN npm run build

CMD ["npm", "run", "docker-start"]
