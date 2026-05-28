FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev --no-audit --no-fund

COPY . .

FROM base AS dev

EXPOSE 3000

CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && npm run dev -- --hostname 0.0.0.0 --port 3000"]

FROM base AS production

RUN npx prisma generate && npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start -- --hostname 0.0.0.0 --port 3000"]
