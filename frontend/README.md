# amoCRM — фронтенд

Статические страницы авторизации. Сборка: Vite.

## Разработка

```bash
npm install
cp .env.example .env
npm run dev
```

Бэкенд должен быть на `http://localhost:8080` (или другой URL в `VITE_API_URL`).

## Сборка

```bash
npm run build   # артефакты в dist/
npm run preview
```

На проде `dist/` обычно отдаёт nginx; `VITE_API_URL` задаётся при сборке.
