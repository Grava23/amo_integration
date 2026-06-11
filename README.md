# amo_CRM
Настройка ОКК в проекте на амо CRM

Проект разделён на **бэкенд** (корень репозитория) и **фронтенд** (`frontend/`). Запускаются отдельно.

## Бэкенд (API)

Требует Postgres (Docker или локально).

```bash
make up-dev          # Postgres на localhost:5432
cp .env.local.example .env.local   # если DATABASE_URL в .env с docker-хостом
npm run build && npm start         # http://localhost:8080 — только API
```

Проверка: `curl http://localhost:8080/health`

## Фронтенд (авторизация amoCRM)

Без БД. Обращается к API по `VITE_API_URL`.

```bash
cd frontend
cp .env.example .env
npm install
npm run dev          # http://localhost:5173
```

В **другом терминале** должен быть запущен бэкенд (`npm start`).

### amoCRM (важно)

После «Разрешить» amo **всегда** открывает URL из поля **Redirect URI** в настройках интеграции — не из фронта и не из кнопки входа.

1. Откройте http://localhost:5173/ — скопируйте URL из блока настройки (или `GET /api/v1/auth/oauth/setup`).
2. В amoCRM → ваша интеграция → **Redirect URI** — вставьте **ровно этот** URL (обычно `http://localhost:8080/api/v1/auth/oauth/complete`).
3. В `.env` бэка: `AMO_REDIRECT_URI` — **тот же** строкой. `FRONTEND_ORIGIN=http://localhost:5173`.

Если Redirect URI = `google.com` (или другой чужой сайт), `complete` на сервере не вызовется и интеграция не создастся.

Из корня: `npm run dev:web` — то же, что `npm run dev` в `frontend/`.

## Миграция БД

1. Поднять проект локально

```bash
    make up
```

2. Сгенерировать миграцию

```bash
    DATABASE_URL="postgresql://user:password@localhost:5432/db_name?sslmode=disable" \
    npx prisma migrate dev --name migration_name
```

Либо делаем сразу 2 шаг, но указываем удаленную бд

## Продакшен

В проде **два артефакта**: API в Docker и статика фронта (nginx или другой веб-сервер). Локальный `npm start` / Vite dev на сервере не нужны.

### 1. Бэкенд (Docker)

На сервере в каталоге проекта (у вас: `/home/jupyteruser/conversation_analysis/companies/amoCRM`).

**`.env`** (отличия от локальной разработки):

```env
PORT=8080
HOST=0.0.0.0

# Внутри docker-сети — имя сервиса postgres из compose
DATABASE_URL=postgresql://postgres:ВАШ_ПАРОЛЬ@neuro_okk_amo_postgres:5432/neuro_okk_amo?sslmode=disable

# Публичный URL, как его видит браузер (через nginx / домен)
API_PUBLIC_URL=https://ваш-домен.ru
AMO_REDIRECT_URI=https://ваш-домен.ru/api/v1/auth/oauth/complete
FRONTEND_ORIGIN=https://ваш-домен.ru

AMO_CLIENT_ID=...
AMO_CLIENT_SECRET=...
AMO_CHANNEL_ID=...
AMO_CHANNEL_SECRET=...
SERVER_API_KEY=...
```

Запуск:

```bash
make up
# то же: docker compose -f docker/docker-compose.yml up -d --build
```

Проверка на сервере: `curl http://127.0.0.1:8080/health`

`make up-dev` — для локальной разработки (без лишнего volume в prod-compose).

### 2. Фронтенд (сборка статики)

Один раз после деплоя или при смене API-URL:

```bash
cd frontend
npm ci
# тот же origin, что FRONTEND_ORIGIN (если API за nginx на том же домене — без /api в VITE)
VITE_API_URL=https://ваш-домен.ru npm run build
```

Каталог `frontend/dist/` отдайте nginx (или скопируйте в `/var/www/...`).

### 3. Nginx (рекомендуется один домен)

Пример: весь трафик на `https://ваш-домен.ru`, API проксируется на контейнер `:8080`.

```nginx
server {
    listen 443 ssl;
    server_name ваш-домен.ru;

    root /path/to/amo_CRM/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /oauth/callback/ {
        try_files $uri $uri/ /oauth/callback/index.html;
    }
}
```

Тогда в amoCRM **Redirect URI** = `https://ваш-домен.ru/api/v1/auth/oauth/complete` (как в `AMO_REDIRECT_URI`).

### 4. amoCRM в проде

| Параметр | Значение |
|----------|----------|
| Redirect URI в кабинете amo | `https://ваш-домен.ru/api/v1/auth/oauth/complete` |
| `AMO_REDIRECT_URI` в `.env` | **то же** |
| `FRONTEND_ORIGIN` | `https://ваш-домен.ru` |
| Страница входа для пользователей | `https://ваш-домен.ru/` |

### 5. Деплой (GitHub Actions)

При push в `main` workflow `.github/workflows/deploy.yml`:

1. **Deploy backend** — `git pull`, `docker compose up -d --build`, проверка `/health`
2. **Deploy frontend** — `scripts/deploy-frontend.sh` (сборка + `vite preview` на порту `FRONTEND_PORT`, по умолчанию 4173)

`VITE_API_URL` при сборке берётся из `API_PUBLIC_URL` в `.env` на сервере.

Ручной запуск на сервере:

```bash
docker compose -f docker/docker-compose.yml up -d --build
bash scripts/deploy-frontend.sh
```

Без nginx: откройте `http://IP:4173/` (фронт) и убедитесь, что в amo Redirect URI = `API_PUBLIC_URL/api/v1/auth/oauth/complete`.

### Схема

```
Браузер → https://домен/          → nginx → frontend/dist
        → https://домен/api/...   → nginx → docker app :8080 → postgres
        ← amo Redirect URI на .../api/v1/auth/oauth/complete
```
