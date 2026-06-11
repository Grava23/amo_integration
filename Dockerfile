FROM node:20-alpine

WORKDIR /app

# копируем package файлы
COPY package*.json ./

# ставим зависимости
RUN npm install

# копируем код (схема, prisma.config.ts, src)
COPY . .

# генерируем Prisma Client из схемы
RUN npx prisma generate --schema=prisma/schema.prisma

# компилируем TypeScript
RUN npm run build

# запускаем
CMD ["node", "dist/index.js"]