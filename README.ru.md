# al-devstack: Full-Stack GIS Monitoring for freeCodeCamp

Минималистичный ГИС-дашборд и автоматизированный конвейер скрейпинга для визуализации и мониторинга прогресса обучения на freeCodeCamp в реальном времени.

🌐 *The English version of the documentation is available [here](./README.md).*

---

### 🏗️ System Architecture & Data Flow

```
[ freeCodeCamp Profile ] (Target User)
│
▼ (Headless Automation)
[ Parser Engine ] (Python 3.11 / Playwright / Async Core)
│
▼ (Bulk Ops / Upsert)
[ Database Layer ] (MongoDB Atlas / Cluster 'al-devstack')
▲
│ (Mongoose ODM / Aggregation Facets)
[ Backend API Server ] (Node.js / Express 5.2)
▲
│ (REST API / JSON Proxy Routing)
[ Frontend Web App ] (React 19 / Vite 8 / Tailwind v4 / Nginx)
```

---

### 🚀 Quick Start (Infrastructure Orchestration)

Проект поддерживает два гибких сценария развертывания локальной инфраструктуры:

#### Вариант А: Быстрый запуск из Docker Hub (Production-готовые образы)
Идеально для мгновенного запуска дашборда без необходимости компилировать исходный код:
```bash
docker compose -f docker-compose.hub.yml up -d
```

#### Вариант Б: Локальная сборка из исходников (Development/Build Mode)
Используется для разработки, кастомизации и компиляции контейнеров напрямую на локальной машине:
```bash
docker compose up -d --build
```
*После запуска интерфейс доступен по адресу `http://localhost:3000`, API бэкенда — `http://localhost:5000`.*

---

### 📊 FinOps & Container Optimization

Результаты глубокого рефакторинга окружения и оптимизации Docker-слоёв (удаление избыточных зависимостей, многоэтапная сборка `Multi-stage`, миграция на Alpine-образы и изоляция браузерных движков Playwright):

| Service Container | Base Platform / Server | Deployment | Build Type | Initial Size | Optimized Size | Resource Saving |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **frontend** | Nginx 1.25-alpine | Vercel | Multi-stage | ~450 MB | **48.8 MB** | **-89.1%** |
| **backend** | Node.js 20-alpine | Railway | Multi-stage | ~320 MB | **147.5 MB** | **-53.9%** |
| **parser** | Python 3.11-slim (Bookworm) | GitHub Actions | Single-browser | 2.9 GB | **1.52 GB** | **-47.5%** |

*Ключевой инжиниринг: Из контейнера парсера полностью удалены избыточные браузерные движки WebKit/Firefox и пакеты Microsoft, оставлен только изолированный headless-Chromium.*

---

### 🗺️ Future Project Roadmap

#### 1. Core Architecture & Stability
- [ ] **TypeScript Migration**: Полный перевод бэкенда и фронтенда на строгую типизацию для исключения ошибок на этапе компиляции.
- [ ] **Cloud-Native Logging**: Внедрение легковесных логов платформ (Railway & GitHub Actions Streams) без оверхеда на производительность.
- [ ] **Automated Testing**: Покрытие логики парсера и критических эндпоинтов интеграционными тестами (Playwright / Vitest).

#### 2. API Documentation
- [ ] **Swagger / OpenAPI**: Интеграция интерактивной песочницы по адресу `/api-docs` для прямого тестирования эндпоинтов из браузера.

#### 3. Frontend & UX Optimizations
- [ ] **Client-Side Caching**: Внедрение TanStack Query (React Query) для интеллектуального фонового обновления ГИС-данных.
- [ ] **React Error Boundary**: Добавление предохранителя интерфейса для предотвращения «белого экрана» при runtime-сбоях.

#### 4. Admin Domain & Dynamic Data
- [ ] **Admin Dashboard**: Панель управления для оперативного изменения лимитов `maxLessons` под обновления курсов freeCodeCamp.

#### 5. Multi-User Scale & Security
- [ ] **RBAC (Role-Based Access Control)**: Введение ролей безопасности (Администратор / Пользователь).
- [ ] **Multi-User Environment**: Полноценная авторизация и изоляция данных для одновременного отслеживания прогресса до 10 пользователей по никнеймам.
- [ ] **Personal Course Reset**: Функция персонального сброса курса (по аналогии с freeCodeCamp) для безопасной очистки личной истории прогресса в базе данных без влияния на данные других пользователей.

<details>
<summary><b>✓ Completed Milestones (Click to expand)</b></summary>

- [x] **Zero-Cost Cloud Architecture**: Спроектирована и развернута стабильная production-инфраструктура с бюджетом \$0 (Vercel + Railway + Atlas + GitHub Actions).
- [x] **Orchestration**: Реализованы дублирующие конфигурации контейнеров через `docker-compose` (Local Build / Hub Streams).
- [x] **Database Type Fixing**: Решена проблема мутации типов данных MongoDB Atlas String-to-Date для корректного таймлайна.
- [x] **Mobile Optimization**: Адаптирована сетка дашборда под экраны ультрамалых устройств уровня iPhone SE (`p-4` grid tuning).
- [x] **iPad Pro Adaptive Layout**: Смещена точка излома (`lg` breakpoint shift) для безупречного отображения двух колонок на экранах планшетов.
- [x] **A11Y Accessibility**: Интегрированы векторы фокуса клавиатуры и теги screen-reader `aria-live` для доступности интерфейса.
</details>
