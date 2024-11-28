FROM node:18-alpine

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=test
ENV SHOPIFY_APP_URL="https://typescriptfrontend.onrender.com"
ENV SHOPIFY_API_KEY="dec512b68e658e4f21588e3d4de0e748"
ENV SHOPIFY_API_SECRET="33c771fde1fb426020ae1a441cce56c4"

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force
# Remove CLI packages since we don't need them in production by default.
# Remove this line if you want to run CLI commands in your container.
RUN npm remove @shopify/cli

COPY . .

RUN npm run build

CMD ["npm", "run", "docker-start"]
