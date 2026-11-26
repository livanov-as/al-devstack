// Define explicit layout structure shape to enforce complete dictionary key parity
export interface TranslationKeys {
  certificatesTitle: string
  noCertificates: string
  worldMapTitle: string
  taskTimelineTitle: string
  taskTimelineSubtitle: string
  activityCalendarTitle: string
  activityCalendarSubtitle: string
  activityCalendarBadge: string
  less: string
  more: string
  taskSingular: string
  taskFew: string
  tasks: string
  noTasks: string
  categoryPython: string
  categoryFrontend: string
  categoryBackend: string
  fullStackIslandTitle: string
  fullStackIslandActive: string
  fullStackIslandLocked: string
  fullStackIslandSecretTitle: string
  fullStackIslandSecretProgress: string
  fullStackIslandSecretSteps: string
  fullStackIslandSecretUnlocked: string
  fullStackIslandSecretLocked: string
  mapTooltipTerritory: string
  mapTooltipTech: string
  mapTooltipExplored: string
  mapTooltipSynced: string
  mapLoading: string
  mapError: string
  mapLegendTitle: string
  mapLegendOffline: string
  mapLegendInit: string
  mapLegendSyncing: string
  mapLegendComplete: string
  mapLegendTrophy: string
  mapLegendAccessBtn: string
  certActiveArchitecture: string
  certLegacyInfrastructure: string
  certLinkOffline: string
  region_europe: string
  region_asia: string
  region_africa: string
  region_north_america: string
  region_south_america: string
  region_australia_oceania: string
  authTitle: string
  authSubtitle: string
  authErrorHeader: string
  authUsernameLabel: string
  authPasswordLabel: string
  authNoticeHeader: string
  authNoticeBody: string
  authBtnLogin: string
  authBtnRegister: string
  authDividerOr: string
  authBtnDemo: string
  authToggleRegister: string
  authToggleLogin: string
  logoutTooltip: string
  authSessionExpired: string
  syncingTitle: string
  syncingSubtitle: string
  syncingHint: string
  syncingSandboxHint: string
  resetBtnHeader: string
  resetModalTitle: string
  resetModalSubtitle: string
  resetSectorLabel: string
  resetSectorAll: string
  resetStrictLabel: string
  resetStrictHint: string
  resetCertNotice: string
  resetConfirmBtn: string
  resetConfirmingBtn: string
  resetSuccessMsg: string
  resetSandboxBanner: string
  sandboxLockedTooltip: string
  adminBtnHeader: string
  adminReadOnlyBadge: string
  adminModalTitle: string
  adminModalSubtitle: string
  adminSandboxBanner: string
  adminSlotsLabel: string
  adminProgressDocsLabel: string
  adminCertDocsLabel: string
  adminClusterStatusLabel: string
  adminFlushCacheBtn: string
  adminFlushingCacheBtn: string
  adminCacheFlushedMsg: string
  adminUsersTableTitle: string
  adminColUser: string
  adminColRole: string
  adminColTasks: string
  adminColActions: string
  adminSyncTooltip: string
  adminRoleToggleTooltip: string
  adminDeleteTooltip: string
  adminDeleteConfirm: string
  adminSyncDispatchedMsg: string
  taskDifficultyLabel: string
  aiBtnHeader: string
  aiModalTitle: string
  aiModalSubtitle: string
  aiDemoBanner: string
  aiStartBtn: string
  aiTryLiveBtn: string
  aiLiveQuotaLabel: string
  aiAnswerPlaceholder: string
  aiSubmitAnswerBtn: string
  aiNextQuestionBadge: string
  aiUserLabel: string
  aiScoreLabel: string
  aiCompletedTitle: string
  aiRestartBtn: string
  aiDemoQ1: string
  aiDemoF1: string
  aiDemoQ2: string
  aiDemoF2: string
  aiDemoShortHint: string
  aiPresetCardTitle: string
  aiPresetCardDesc: string
  aiLiveCardTitle: string
  aiLiveCardDesc: string
  aiInputHint: string
  aiQuotaExhaustedTitle: string
  aiQuotaExhaustedBody: string
}

// Strictly typed translation registry matching supported language domains
export const translations: Record<string, TranslationKeys> = {
  en: {
    // Component Headers
    certificatesTitle: 'Earned Certificates',
    noCertificates: 'No certificates earned yet',
    worldMapTitle: 'Global GIS Infrastructure',
    taskTimelineTitle: 'Live Task Feed',
    taskTimelineSubtitle: 'Latest curriculum execution telemetry feed',
    activityCalendarTitle: 'Activity Matrix',

    // Calendar sub-labels & legends
    activityCalendarSubtitle:
      'Satellite data synchronization for the last 31 days',
    activityCalendarBadge: '31-Day Strip',
    less: 'Less',
    more: 'More',
    taskSingular: 'task',
    taskFew: 'tasks',
    tasks: 'tasks',
    noTasks: 'no tasks',

    // Task Category Labels
    categoryPython: 'Parser Engine',
    categoryFrontend: 'Frontend Core',
    categoryBackend: 'Backend Server',

    // Global Full-Stack Island (The Core)
    fullStackIslandTitle: 'The Core: Full-Stack Domain',
    fullStackIslandActive:
      'System Fully Synchronized! Click to decode the Grand Certificate. 🏆',
    fullStackIslandLocked:
      'Sector Unknown. Complete 100% synchronization across all continents.',
    fullStackIslandSecretTitle: '️ Full-Stack Secret Island',
    fullStackIslandSecretProgress: 'Progression',
    fullStackIslandSecretSteps: 'Steps Unlocked',
    fullStackIslandSecretUnlocked: 'Core System Unlocked',
    fullStackIslandSecretLocked: 'Encrypted Frequency',

    // Interactive Map Tooltips & Labels
    mapTooltipTerritory: 'Sector',
    mapTooltipTech: 'Tech Stack',
    mapTooltipExplored: 'Explored',
    mapTooltipSynced: 'Synced',
    mapLoading: 'Initializing orbital GIS connection...',
    mapError: 'GIS uplink failed. Check backend status.',

    // GIS Matrix Legend Modal
    mapLegendTitle: 'GIS Matrix Legend',
    mapLegendOffline: '0% — Core Offline',
    mapLegendInit: '1 - 30% — Sync Initialized',
    mapLegendSyncing: '31 - 99% — Sector Syncing',
    mapLegendComplete: '100% — Full Sync Complete',
    mapLegendTrophy: 'Trophy — Milestone Cleared',
    mapLegendAccessBtn: 'Access Core URL',

    // Certificates Grid Sub-headers & fallbacks
    certActiveArchitecture: '// Active Full-Stack Architecture (v9)',
    certLegacyInfrastructure:
      '// Transferred Infrastructure (Legacy Curriculum)',
    certLinkOffline: 'Certificates Link Offline',

    // Flat Region Technology Names
    region_europe: 'Responsive Web Design Certification',
    region_asia: 'JavaScript Certification',
    region_africa: 'Front-End Development Libraries Certification',
    region_north_america: 'Python Certification',
    region_south_america: 'Relational Databases Certification',
    region_australia_oceania: 'Back-End Development and APIs Certification',

    // Authentication & Core Gatekeeper Elements
    authTitle: 'al-devstack // core',
    authSubtitle: 'Telemetry Authentication Boundary Layer',
    authErrorHeader: '// CRITICAL STATUS ALERT',
    authUsernameLabel: 'freeCodeCamp Username',
    authPasswordLabel: 'Secure Password',
    authNoticeHeader: '// SYNCHRONIZATION LATENCY NOTICE',
    authNoticeBody:
      'Initial telemetry profiling tasks (Total Sync) require roughly 2 to 4 minutes due to anti-bot jitter masking safeguards.',
    authBtnLogin: 'Initialize Session',
    authBtnRegister: 'Provision Account',
    authDividerOr: 'Or',
    authBtnDemo: 'Explore Sandbox (Demo Mode)',
    authToggleRegister: "Don't have an active cluster profile? Provision here",
    authToggleLogin: 'Already authorized in active cluster? Mount profile',
    logoutTooltip: 'Terminate active telemetry session',
    authSessionExpired: 'Session expired. Telemetry authentication required.',

    // Live Telemetry Synchronization Overlay
    syncingTitle: 'freeCodeCamp Satellite Sync Active...',
    syncingSubtitle:
      'Scraping curriculum telemetry & verified certificates in cloud queue',
    syncingHint: '// AUTO-REFRESH VIA WEBSOCKET UPLINK ENABLED',
    syncingSandboxHint: '// SANDBOX SIMULATION: REPLAYING TELEMETRY UPLINK',

    // Reset Progress Modal & Controls
    resetBtnHeader: 'Reset Progress',
    resetModalTitle: 'Reset Sector Telemetry',
    resetModalSubtitle: 'Clear recorded lessons to replay curriculum progress',
    resetSectorLabel: 'Target Geographical Sector',
    resetSectorAll: 'All Sectors (Global Wipe)',
    resetStrictLabel: 'Calculate map percentage strictly by lessons',
    resetStrictHint:
      'Prevents earned certificates from auto-locking continents at 100% after reset.',
    resetCertNotice:
      'Earned certificates and map trophies are permanently preserved.',
    resetConfirmBtn: 'Execute Progress Reset',
    resetConfirmingBtn: 'Purging Records...',
    resetSuccessMsg: 'Telemetry records cleared. Map matrix updated.',
    resetSandboxBanner: '// SANDBOX READ-ONLY MODE (MUTATIONS LOCKED)',
    sandboxLockedTooltip: '// Disabled in Sandbox Mode (RBAC Protected)',

    // Admin Control Panel Modal
    adminBtnHeader: 'Admin Core',
    adminReadOnlyBadge: 'READ-ONLY',
    adminModalTitle: 'Cluster Admin & FinOps Core',
    adminModalSubtitle:
      'Multi-user capacity governance and scraper orchestration',
    adminSandboxBanner:
      '// SANDBOX READ-ONLY MODE (VIEWING SIMULATED FINOPS TELEMETRY)',
    adminSlotsLabel: 'Active User Slots',
    adminProgressDocsLabel: 'Progress Docs',
    adminCertDocsLabel: 'Certificates',
    adminClusterStatusLabel: 'Atlas Cluster',
    adminFlushCacheBtn: 'Flush GIS Cache',
    adminFlushingCacheBtn: 'Flushing...',
    adminCacheFlushedMsg:
      'In-memory GIS cache invalidated across all sessions.',
    adminUsersTableTitle: 'Cluster Registry & FIFO Queue',
    adminColUser: 'User',
    adminColRole: 'Role',
    adminColTasks: 'Tasks',
    adminColActions: 'Actions',
    adminSyncTooltip: 'Trigger out-of-schedule GitHub Actions sync',
    adminRoleToggleTooltip: 'Toggle role (USER ↔ ADMIN)',
    adminDeleteTooltip: 'Cascade delete user & all records',
    adminDeleteConfirm: 'Confirm cascade deletion for',
    adminSyncDispatchedMsg: 'GitHub Actions parser workflow dispatched for',

    // AI Enricher & Tech Interviewer
    taskDifficultyLabel: 'Difficulty',
    aiBtnHeader: 'AI Interview',
    aiModalTitle: 'AI Tech Interviewer',
    aiModalSubtitle:
      'Adaptive mock interview grounded in your 31-day curriculum',
    aiDemoBanner: '// SANDBOX PRESET ACTIVE (ZERO-COST RAM SCENARIO)',
    aiStartBtn: 'Start AI Interview',
    aiTryLiveBtn: 'Test Live AI',
    aiLiveQuotaLabel: 'Live quota left',
    aiAnswerPlaceholder: 'Type your technical explanation here...',
    aiSubmitAnswerBtn: 'Submit Answer',
    aiNextQuestionBadge: 'ACTIVE QUESTION',
    aiUserLabel: 'YOU',
    aiScoreLabel: 'Score',
    aiCompletedTitle: 'Interview Session Completed',
    aiRestartBtn: 'New Session',
    aiDemoQ1:
      'In the "Envelope Budget App (JavaScript v9)" workshop, you worked with transaction arrays and closures. Explain the trade-offs between Array.prototype.reduce() and a standard for-loop when aggregating balances, and how you prevent state mutation?',
    aiDemoF1:
      'Solid breakdown! reduce() declaratively folds an array into a new value without external mutable variables, whereas a for-loop offers finer control (such as early exit via break). State immutability is preserved via spread, map, or filter.',
    aiDemoQ2:
      'Final demo question: how would you enforce strict validation for budget form inputs across TypeScript and a NestJS backend to prevent negative or NaN transactions?',
    aiDemoF2:
      'Great validation strategy! On the frontend, enforce strict TypeScript types and Number.isFinite() / > 0 checks, and on the NestJS backend, validate incoming DTO payloads before reaching the service layer.',
    aiDemoShortHint:
      'RAM Demo Mode: showing reference review — select "Live AI" for real LLM evaluation.',
    aiPresetCardTitle: 'Demo Scenario (RAM · Unlimited)',
    aiPresetCardDesc:
      'Instant pre-scripted walkthrough based on recent JavaScript v9 tasks with zero token cost.',
    aiLiveCardTitle: 'Live AI (OpenRouter LLM)',
    aiLiveCardDesc:
      'Real-time question generation and grading by LLM (up to 2 live questions per day).',
    aiInputHint: 'Press Enter to send · Shift + Enter for new line',
    aiQuotaExhaustedTitle: 'Daily Live AI Quota Reached (2 / 2)',
    aiQuotaExhaustedBody:
      'Your daily live LLM allowance for Sandbox Mode is used up and resets tomorrow. You can continue unlimited practice in the RAM Demo Scenario or sign in with a personal account.',
  },
  ru: {
    // Заголовки компонентов
    certificatesTitle: 'Полученные сертификаты',
    noCertificates: 'Нет полученных сертификатов',
    worldMapTitle: 'Глобальная ГИС-Инфраструктура',
    taskTimelineTitle: 'Лента активных задач',
    taskTimelineSubtitle: 'Телеметрия последних выполненных задач',
    activityCalendarTitle: 'Матрица активности',

    // Подписи календаря и легенды
    activityCalendarSubtitle: 'Синхронизация за последние 31 день',
    activityCalendarBadge: '31 день',
    less: 'Меньше',
    more: 'Больше',
    taskSingular: 'задача',
    taskFew: 'задачи',
    tasks: 'задач',
    noTasks: 'нет задач',

    // Метки категорий задач
    categoryPython: 'Парсер',
    categoryFrontend: 'Фронтенд',
    categoryBackend: 'Бэкенд',

    // Главный Остров Фулстека (Ядро)
    fullStackIslandTitle: 'Ядро: Фулстек-Домен',
    fullStackIslandActive:
      'Система полностью синхронизирована! Нажми для расшифровки главного сертификата. 🏆',
    fullStackIslandLocked:
      'Сектор неизвестен. Требуется 100% синхронизация всех континентов.',
    fullStackIslandSecretTitle: '️ Секретный Фулстек-Остров',
    fullStackIslandSecretProgress: 'Прогресс',
    fullStackIslandSecretSteps: 'шагов пройдено',
    fullStackIslandSecretUnlocked: 'Доступ к ядру открыт',
    fullStackIslandSecretLocked: 'Зашифрованная частота',

    // Всплывающие подсказки и метки карты
    mapTooltipTerritory: 'Сектор',
    mapTooltipTech: 'Техстек',
    mapTooltipExplored: 'Исследовано',
    mapTooltipSynced: 'Синхронизировано',
    mapLoading: 'Установка орбитальной связи с ГИС...',
    mapError: 'Ошибка связи с ГИС. Проверьте статус бэкенда.',

    // Модальное окно легенды ГИС
    mapLegendTitle: 'Легенда ГИС-Матрицы',
    mapLegendOffline: '0% — Ядро оффлайн',
    mapLegendInit: '1 - 30% — Синхронизация запущена',
    mapLegendSyncing: '31 - 99% — Сектор синхронизируется',
    mapLegendComplete: '100% — Синхронизация завершена',
    mapLegendTrophy: 'Трофей — Континент пройден',
    mapLegendAccessBtn: 'Доступ к Core URL',

    // Подзаголовки карточек сертификатов
    certActiveArchitecture: '// Активная Фулстек-Архитектура (v9)',
    certLegacyInfrastructure:
      '// Перенесенная Инфраструктура (Старая программа)',
    certLinkOffline: 'Связь с базой сертификатов оффлайн',

    // Плоские ключи технологий регионов
    region_europe: 'Responsive Web Design Certification',
    region_asia: 'JavaScript Certification',
    region_africa: 'Front-End Development Libraries Certification',
    region_north_america: 'Python Certification',
    region_south_america: 'Relational Databases Certification',
    region_australia_oceania: 'Back-End Development and APIs Certification',

    // Элементы аутентификации и защиты ядра
    authTitle: 'al-devstack // ядро',
    authSubtitle: 'Инфраструктура аутентификации телеметрии',
    authErrorHeader: '// КРИТИЧЕСКИЙ СБОЙ СИСТЕМЫ',
    authUsernameLabel: 'Имя пользователя freeCodeCamp',
    authPasswordLabel: 'Надежный пароль',
    authNoticeHeader: '// ПРЕДУПРЕЖДЕНИЕ О ЗАДЕРЖКЕ',
    authNoticeBody:
      'Первичная синхронизация профиля (Total Sync) занимает от 2 до 4 минут из-за работы алгоритмов маскировки парсера.',
    authBtnLogin: 'Инициализировать сессию',
    authBtnRegister: 'Создать аккаунт',
    authDividerOr: 'Или',
    authBtnDemo: 'Войти в Демо-режим (Песочница)',
    authToggleRegister: 'Нет активного профиля в кластере? Создать здесь',
    authToggleLogin: 'Профиль уже создан? Подключить сессию',
    logoutTooltip: 'Завершить активную сессию телеметрии',
    authSessionExpired:
      'Время сессии истекло. Требуется повторная авторизация телеметрии.',

    // Оверлей живой синхронизации телеметрии
    syncingTitle: 'Идет синхронизация freeCodeCamp...',
    syncingSubtitle:
      'Сбор телеметрии прогресса и сертификатов в облачной очереди',
    syncingHint: '// АВТООБНОВЛЕНИЕ ПО WEBSOCKET-КАНАЛУ АКТИВНО',
    syncingSandboxHint: '// СИМУЛЯЦИЯ ПЕСОЧНИЦЫ: ВОСПРОИЗВЕДЕНИЕ ТЕЛЕМЕТРИИ',

    // Модальное окно сброса прогресса
    resetBtnHeader: 'Сброс прогресса',
    resetModalTitle: 'Сброс телеметрии сектора',
    resetModalSubtitle: 'Очистка пройденных уроков для повторного прохождения',
    resetSectorLabel: 'Целевой географический сектор',
    resetSectorAll: 'Все сектора (Полный сброс)',
    resetStrictLabel: 'Считать прогресс карты строго по урокам',
    resetStrictHint:
      'Не дает полученным сертификатам автоматически удерживать 100% на карте после сброса.',
    resetCertNotice:
      'Полученные сертификаты и кубки на карте сохраняются навсегда.',
    resetConfirmBtn: 'Выполнить сброс прогресса',
    resetConfirmingBtn: 'Очистка записей...',
    resetSuccessMsg: 'Записи прогресса очищены. Матрица карты обновлена.',
    resetSandboxBanner:
      '// РЕЖИМ ПЕСОЧНИЦЫ READ-ONLY (ИЗМЕНЕНИЯ ЗАБЛОКИРОВАНЫ)',
    sandboxLockedTooltip: '// Отключено в демо-режиме (защита RBAC)',

    // Модальное окно панели администратора
    adminBtnHeader: 'Admin Core',
    adminReadOnlyBadge: 'READ-ONLY',
    adminModalTitle: 'Панель администратора и FinOps',
    adminModalSubtitle: 'Управление слотами пользователей и запуск скрейпера',
    adminSandboxBanner:
      '// РЕЖИМ ПЕСОЧНИЦЫ READ-ONLY (СИМУЛЯЦИЯ ТЕЛЕМЕТРИИ FINOPS)',
    adminSlotsLabel: 'Занято слотов',
    adminProgressDocsLabel: 'Задач в БД',
    adminCertDocsLabel: 'Сертификатов',
    adminClusterStatusLabel: 'Кластер Atlas',
    adminFlushCacheBtn: 'Сбросить кэш ГИС',
    adminFlushingCacheBtn: 'Сброс кэша...',
    adminCacheFlushedMsg: 'Кэш ГИС-карты в памяти сброшен для всех сессий.',
    adminUsersTableTitle: 'Реестр кластера и очередь FIFO',
    adminColUser: 'Пользователь',
    adminColRole: 'Роль',
    adminColTasks: 'Задачи',
    adminColActions: 'Действия',
    adminSyncTooltip: 'Запустить внеплановую синхронизацию в GitHub Actions',
    adminRoleToggleTooltip: 'Переключить роль (USER ↔ ADMIN)',
    adminDeleteTooltip: 'Каскадно удалить пользователя и все его данные',
    adminDeleteConfirm: 'Подтвердить каскадное удаление для',
    adminSyncDispatchedMsg: 'Воркфлоу парсера GitHub Actions запущен для',

    // AI Обогащение и Технический Интервьюер
    taskDifficultyLabel: 'Сложность',
    aiBtnHeader: 'AI-Интервью',
    aiModalTitle: 'AI Технический Интервьюер',
    aiModalSubtitle:
      'Адаптивное собеседование по вашим задачам за последние 31 день',
    aiDemoBanner: '// АКТИВЕН ДЕМО-СЦЕНАРИЙ (БЕЗ ЗАТРАТ ТОКЕНОВ)',
    aiStartBtn: 'Начать AI-интервью',
    aiTryLiveBtn: 'Живой ИИ-тест',
    aiLiveQuotaLabel: 'Живых запросов осталось',
    aiAnswerPlaceholder: 'Введите ваш технический ответ...',
    aiSubmitAnswerBtn: 'Отправить ответ',
    aiNextQuestionBadge: 'ТЕКУЩИЙ ВОПРОС',
    aiUserLabel: 'ВЫ',
    aiScoreLabel: 'Оценка',
    aiCompletedTitle: 'Сессия интервью завершена',
    aiRestartBtn: 'Новая сессия',
    aiDemoQ1:
      'В проекте «Envelope Budget App (JavaScript v9)» вы работали с массивами транзакций и замыканиями. Объясните разницу между Array.prototype.reduce() и обычным циклом for при агрегации баланса, а также как избежать мутации исходного состояния?',
    aiDemoF1:
      'Хороший разбор! reduce() декларативно сворачивает массив в новое значение без внешних мутируемых переменных, тогда как цикл for даёт больше контроля (например, ранний выход через break). Для защиты состояния используем spread, map или filter.',
    aiDemoQ2:
      'Финальный вопрос демо-сессии: как бы вы организовали валидацию входящих данных формы бюджета на уровне TypeScript и NestJS, чтобы исключить отрицательные или NaN-транзакции?',
    aiDemoF2:
      'Отличный подход к валидации! На фронтенде используем строгие TypeScript-типы и проверку Number.isFinite() / > 0, а на уровне NestJS — DTO с валидацией входных полей до попадания в сервис.',
    aiDemoShortHint:
      'Демо-режим RAM: показан эталонный разбор — для реальной проверки ответа нейросетью выберите «Живой ИИ».',
    aiPresetCardTitle: 'Демо-сценарий (RAM · Безлимитно)',
    aiPresetCardDesc:
      'Мгновенный предзаготовленный разбор по недавним задачам JavaScript v9 без расхода токенов.',
    aiLiveCardTitle: 'Живой ИИ (OpenRouter LLM)',
    aiLiveCardDesc:
      'Реальная генерация вопросов и проверка ответа нейросетью (до 2 живых вопросов в день).',
    aiInputHint: 'Enter — отправить · Shift + Enter — новая строка',
    aiQuotaExhaustedTitle: 'Дневной лимит живого ИИ исчерпан (2 / 2)',
    aiQuotaExhaustedBody:
      'Суточная квота живых запросов в песочнице израсходована и обновится завтра. Вы можете продолжить безлимитно в RAM демо-сценарии или войти под личным аккаунтом.',
  },
}
