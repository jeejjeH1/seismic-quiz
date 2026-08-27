FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ../prisma/
RUN npx prisma generate --schema=../prisma/schema.prisma
COPY . .
EXPOSE 4000
CMD ["node", "server.mjs"]
