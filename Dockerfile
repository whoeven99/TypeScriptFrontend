FROM node:20-alpine3.17

EXPOSE 3000

WORKDIR /app

COPY package.json package-lock.json* ./

ENV NODE_ENV=production

RUN npm ci --omit=dev && npm cache clean --force
# Remove CLI packages since we don't need them in production by default.
# Remove this line if you want to run CLI commands in your container.
RUN npm remove @shopify/cli

COPY . .

RUN npm run build

CMD ["npm", "run", "docker-start"]
