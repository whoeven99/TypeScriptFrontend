FROM node:18-alpine

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=test
ENV SHOPIFY_APP_URL="https://typescriptfrontend.onrender.com"
ENV SHOPIFY_API_KEY="7a5eae5811d6629e9b3299748e852a6b"
ENV SHOPIFY_API_SECRET="bdada26c401b6b2bdc537fc67f001cc6"

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force
# Remove CLI packages since we don't need them in production by default.
# Remove this line if you want to run CLI commands in your container.
RUN npm remove @shopify/cli

COPY . .

RUN npm run build

CMD ["npm", "run", "docker-start"]
