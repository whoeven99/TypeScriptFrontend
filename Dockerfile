FROM node:20-alpine3.17

EXPOSE 3000

WORKDIR /app

<<<<<<< HEAD
ENV NODE_ENV=prodution
=======
ENV NODE_ENV=production
>>>>>>> bdcb2bed7b129b84ff086f7860f1d9f27d9cd16f

COPY package.json package-lock.json* ./

RUN npm ci
# Remove CLI packages since we don't need them in production by default.
# Remove this line if you want to run CLI commands in your container.
RUN npm remove @shopify/cli

COPY . .

RUN npm run build

CMD ["npm", "run", "docker-start"]
