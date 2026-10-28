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
  },
}
