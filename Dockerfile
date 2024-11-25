FROM node:18-alpine

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=prod

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force
# Remove CLI packages since we don't need them in production by default.
# Remove this line if you want to run CLI commands in your container.
RUN npm remove @shopify/cli

COPY . .

RUN npm run build

ENV SHOPIFY_APP_URL="https://typescriptfrontendprod.onrender.com/"
ENV SHOPIFY_API_KEY="fb9fc15cbec02bd735e2a5b491cf8409"
ENV SHOPIFY_API_SECRET="02e88a0c0c3ec60c97cdf7b6d1ab7ac7"

CMD ["npm", "run", "docker-start"]
