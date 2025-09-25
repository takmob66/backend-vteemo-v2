# اگر در لیارا Deployment مستقیم Node کافی است، این فایل الزامی نیست.
# در صورت استفاده از TypeScript فرض می‌کنیم خروجی در dist تولید می‌شود.

FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# اگر TypeScript داری:
# RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
# اگر TypeScript و build جدا داری: CMD ["node", "dist/index.js"]
# در حالت ساده:
CMD ["npm", "run", "start"]
