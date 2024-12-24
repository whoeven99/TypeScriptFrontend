FROM node:20-alpine3.17

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=local
ENV SHOPIFY_APP_URL="https://localhost:3000"
ENV SHOPIFY_API_KEY="4b05c1caefa9e0761a0538b64159b627"
ENV SHOPIFY_API_SECRET="ee60a93b498145dd16acfe018d8379ca"
ENV SHOPIFY_CIWI_SWITCHER_ID="f1916a81-119e-457b-8259-f0e206e01f99"
ENV SHOPIFY_CIWI_SWITCHER_TYPE="shopify://apps/ciwi-ai-fattest/blocks/switcher/f1916a81-119e-457b-8259-f0e206e01f99"

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force
# Remove CLI packages since we don't need them in production by default.
# Remove this line if you want to run CLI commands in your container.
RUN npm remove @shopify/cli

COPY . .

RUN npm run build

CMD ["npm", "run", "docker-start"]
