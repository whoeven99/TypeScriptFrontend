FROM node:18-alpine

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=local

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force
# Remove CLI packages since we don't need them in production by default.
# Remove this line if you want to run CLI commands in your container.
RUN npm remove @shopify/cli

COPY . .

RUN npm run build

ENV SHOPIFY_APP_URL="https://localhost:3000"
ENV SHOPIFY_API_KEY="6e0ef7be80edbf81020e200228a86d01"
ENV SHOPIFY_API_SECRET="b7b5a1967c270c9f1e660aee6b570e08"

CMD ["npm", "run", "docker-start"]
