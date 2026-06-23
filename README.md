# al-devstack: ГИС-Мониторинг freeCodeCamp (WSL/Mono)

## Стек и архитектура
1. **Parser (Python 3.11/Playwright/PyMongo):** Хедлес-скрейпер профиля `livanov-as`. Фильтрует задачи по `DEFAULT_TARGET_DATE`. Пишет в базу пакетами (`bulk_write`, `UpdateOne`, `upsert=True`).
2. **Backend (Node.js/Express/Mongoose):** БД `al-devstack` на MongoDB Atlas. Роут `/api/progress/geo-stats` считает ГИС-прогресс по `GEO_MAPPING`: если есть сертификат (`certSlugs`) = 100%, иначе доля уроков от `maxLessons`. Глобальный супер-сертификат зажигает всю карту.
3. **Frontend (React 19/Vite/Tailwind v4):** Карта мира (`@vnedyalk0v/react19-simple-maps`), сетка активности 7x16 ячеек (16 недель), живая лента (последние 50 задач). Локализация через Context API (`ru`/`en`). Базовый шрифт 18px. Сетка: Left Zone 60%, Right Zone 40%.

## Навигация по коду
* `backend/server.js` — Точка входа, листенер PORT, Mongo-коннект, Health Check.
* `backend/config/constants.js` — Матрица `GEO_MAPPING` (регулярки и лимиты `maxLessons`).
* `backend/models/Certificate.js` & `Progress.js` — Mongoose-схемы (коллекции `certificates` и `progress`).
* `backend/routes/api.js` — Эндпоинты бэкенда и ГИС-агрегация.
* `frontend/src/` — `main.jsx` и `App.jsx` (инициализация и лэйаут).
* `frontend/src/context/LanguageProvider.jsx` & `hooks/useLanguage.js` — Локализация.
* `frontend/src/pages/dashboard/` — Компоненты (`WorldMap`, `ActivityCalendar`, `TaskTimeline`, `CertificatesGrid`).
* `frontend/src/index.css` — Стили Tailwind v4, темы, скроллбары.
* `parser/main.py` & `requirements.txt` — Скрипт парсера и его зависимости.

## Спецификация API (JSON)
* `GET /health` -> `{"status": "OK", "timestamp": "..."}` (без БД, для UptimeRobot).
* `GET /api/progress` -> `[ { _id, username, task_name, category, date, url }, ... ]` (все задачи, сортировка по дате).
* `GET /api/certificates` -> `[ { _id, id, slug, title, url }, ... ]` (все сертификаты, сортировка по `createdAt: -1`).
* `GET /api/progress/geo-stats` -> `{"regions": { "europe": { id, name, completed, total, percentage, hasCertificate }, ... }, "globalFullStack": boolean }` (ГИС-агрегация).

## ГИС-Матрица (constants.js)
1. `europe` (Responsive Web Design) — `maxLessons: 1552`
2. `asia` (JavaScript Certification) — `maxLessons: 1318`
3. `africa` (Front-End Libraries) — `maxLessons: 525`
4. `north_america` (Python Certification) — `maxLessons: 531`
5. `south_america` (Relational Databases) — `maxLessons: 63`
6. `australia_oceania` (Backend & APIs) — `maxLessons: 100`
