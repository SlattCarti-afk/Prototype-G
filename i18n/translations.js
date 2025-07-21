
const translations = {
  en: {
    // Header
    appTitle: "Prototype - G",
    systemText: "Gift Alert System",
    
    // Status
    online: "Online",
    offline: "Offline",
    connected: "Connected",
    connectionFailed: "Connection Failed",
    backendError: "Backend Error",
    
    // Monitoring Status
    monitoringStatus: "Monitoring Status",
    activelyMonitoring: "Actively Monitoring For New Gifts!",
    nextRefresh: "Next refresh in: {seconds} seconds",
    
    // Buttons
    sendTestNotification: "Send Test Notification",
    refresh: "Refresh",
    
    // Notifications
    recentGiftNews: "Recent Gift News",
    alerts: "alerts",
    noGiftNews: "No gift news yet",
    noGiftNewsDesc: "Send a test notification or wait for new gift opportunities to be detected!",
    readMore: "Read more",
    showLess: "Show less",
    viewChannel: "View Channel",
    hoursAgo: "{hours} hour{plural} ago",
    daysAgo: "{days} day{plural} ago",
    justNow: "Just now",
    
    // Test notification
    testNotificationTitle: "🧪 Test Notification",
    testNotificationMessage: "Test notification from TGift app! This is working correctly.",
    
    // Alerts
    success: "✅ Success",
    error: "❌ Error",
    networkError: "❌ Network Error",
    testNotificationSuccess: "Test notification sent to backend! You should receive a push notification shortly.",
    testNotificationError: "Failed to send: {error}",
    networkErrorMessage: "Could not connect to backend",
    refreshed: "🔄 Refreshed",
    refreshSuccess: "Connection status and notifications updated!",
    refreshError: "Failed to refresh connection",
    
    // Settings
    settings: "Settings",
    notifications: "Notifications",
    vibration: "Vibration",
    vibrationDesc: "Vibrate when gift notifications arrive",
    giftNotificationSound: "Gift Notification Sound",
    giftNotificationSoundDesc: "Choose notification sound for gift alerts",
    default: "Default",
    customRingtone: "Custom Ringtone",
    customRingtoneTitle: "🎵 Custom Ringtone",
    customRingtoneMessage: "To use a custom ringtone:\n\n1. Place your audio file in your device storage\n2. Go to your device Settings > Sounds & Haptics > Ringtone\n3. Select your custom audio file\n4. This app will use your device's notification sound setting",
    useDefault: "Use Default",
    
    // Appearance
    appearance: "Appearance",
    darkMode: "Dark Mode",
    darkModeDesc: "Use dark theme throughout the app",
    animations: "Animations",
    animationsDesc: "Enable smooth animations and transitions",
    fontSize: "Font Size",
    small: "Small",
    medium: "Medium",
    large: "Large",
    extraLarge: "Extra Large",
    language: "Language",
    languageDesc: "Choose your preferred language",
    
    // Security
    securityPrivacy: "Security & Privacy",
    deviceRegistration: "Device Registration",
    clearAllData: "Clear All Data",
    
    // Device Management
    deviceManagement: "🔐 Device Management",
    currentDevice: "Current Device: {device}",
    registeredDevices: "Registered Devices: {count}",
    deviceManagementOptions: "Would you like to:",
    cancel: "Cancel",
    viewDevices: "View Devices",
    registerDevice: "Register This Device",
    registeredDevicesTitle: "Registered Devices",
    noDevicesRegistered: "No devices registered yet.",
    deviceRegistrationSuccess: "✅ Success",
    deviceRegistered: "Device registered successfully!",
    deviceRegistrationError: "❌ Error",
    deviceRegistrationFailed: "Failed to register device.",
    deviceManagementError: "Failed to access device management.",
    
    // Clear Data
    clearDataTitle: "🗑️ Clear All Data",
    clearDataMessage: "This will reset the app to its default state:\n\n• All cached notifications will be removed\n• App settings will be reset to defaults\n• Device registration will be cleared\n\nThis action cannot be undone.",
    resetApp: "Reset App",
    appResetComplete: "✅ App Reset Complete",
    appResetSuccess: "The app has been reset to its default state successfully.",
    appResetError: "❌ Error",
    appResetFailed: "Failed to reset app data. Please try again.",
    ok: "OK",
    
    // About
    about: "About",
    appVersion: "Prototype-G v1.0.0",
    appDescription: "Gift Detection & Alert System",
    telegramChannel: "Our Official Telegram Channel ",
    telegramChannelLink: "@PrototypeGifts",
    madeWith: "Made with JavaScript And Hope"
  },
  
  ru: {
    // Header
    appTitle: "Прототип - G",
    systemText: "Система оповещения о подарках",
    
    // Status
    online: "Онлайн",
    offline: "Офлайн",
    connected: "Подключено",
    connectionFailed: "Ошибка подключения",
    backendError: "Ошибка сервера",
    
    // Monitoring Status
    monitoringStatus: "Статус мониторинга",
    activelyMonitoring: "Активно отслеживаем новые подарки!",
    nextRefresh: "Следующее обновление через: {seconds} сек",
    
    // Buttons
    sendTestNotification: "Отправить тестовое уведомление",
    refresh: "Обновить",
    
    // Notifications
    recentGiftNews: "Последние новости о подарках",
    alerts: "уведомлений",
    noGiftNews: "Новостей о подарках пока нет",
    noGiftNewsDesc: "Отправьте тестовое уведомление или дождитесь обнаружения новых возможностей получить подарки!",
    readMore: "Читать далее",
    showLess: "Скрыть",
    viewChannel: "Перейти к каналу",
    hoursAgo: "{hours} час{plural} назад",
    daysAgo: "{days} дн{plural} назад",
    justNow: "Только что",
    
    // Test notification
    testNotificationTitle: "🧪 Тестовое уведомление",
    testNotificationMessage: "Тестовое уведомление от приложения TGift! Все работает корректно.",
    
    // Alerts
    success: "✅ Успешно",
    error: "❌ Ошибка",
    networkError: "❌ Сетевая ошибка",
    testNotificationSuccess: "Тестовое уведомление отправлено на сервер! Вскоре вы должны получить push-уведомление.",
    testNotificationError: "Не удалось отправить: {error}",
    networkErrorMessage: "Не удалось подключиться к серверу",
    refreshed: "🔄 Обновлено",
    refreshSuccess: "Статус подключения и уведомления обновлены!",
    refreshError: "Не удалось обновить подключение",
    
    // Settings
    settings: "Настройки",
    notifications: "Уведомления",
    vibration: "Вибрация",
    vibrationDesc: "Вибрировать при получении уведомлений о подарках",
    giftNotificationSound: "Звук уведомления о подарках",
    giftNotificationSoundDesc: "Выберите звук для оповещений о подарках",
    default: "По умолчанию",
    customRingtone: "Пользовательский рингтон",
    customRingtoneTitle: "🎵 Пользовательский рингтон",
    customRingtoneMessage: "Чтобы использовать пользовательский рингтон:\n\n1. Поместите аудиофайл в память устройства\n2. Перейдите в Настройки устройства > Звуки и тактильные сигналы > Рингтон\n3. Выберите свой аудиофайл\n4. Приложение будет использовать настройку звука уведомлений устройства",
    useDefault: "Использовать по умолчанию",
    
    // Appearance
    appearance: "Внешний вид",
    darkMode: "Темная тема",
    darkModeDesc: "Использовать темную тему во всем приложении",
    animations: "Анимации",
    animationsDesc: "Включить плавные анимации и переходы",
    fontSize: "Размер шрифта",
    small: "Маленький",
    medium: "Средний",
    large: "Большой",
    extraLarge: "Очень большой",
    language: "Язык",
    languageDesc: "Выберите предпочитаемый язык",
    
    // Security
    securityPrivacy: "Безопасность и приватность",
    deviceRegistration: "Регистрация устройства",
    clearAllData: "Очистить все данные",
    
    // Device Management
    deviceManagement: "🔐 Управление устройствами",
    currentDevice: "Текущее устройство: {device}",
    registeredDevices: "Зарегистрированные устройства: {count}",
    deviceManagementOptions: "Что вы хотите сделать:",
    cancel: "Отмена",
    viewDevices: "Просмотреть устройства",
    registerDevice: "Зарегистрировать это устройство",
    registeredDevicesTitle: "Зарегистрированные устройства",
    noDevicesRegistered: "Устройства еще не зарегистрированы.",
    deviceRegistrationSuccess: "✅ Успешно",
    deviceRegistered: "Устройство успешно зарегистрировано!",
    deviceRegistrationError: "❌ Ошибка",
    deviceRegistrationFailed: "Не удалось зарегистрировать устройство.",
    deviceManagementError: "Не удалось получить доступ к управлению устройствами.",
    
    // Clear Data
    clearDataTitle: "🗑️ Очистить все данные",
    clearDataMessage: "Это сбросит приложение к состоянию по умолчанию:\n\n• Все кэшированные уведомления будут удалены\n• Настройки приложения будут сброшены к значениям по умолчанию\n• Регистрация устройства будет очищена\n\nЭто действие нельзя отменить.",
    resetApp: "Сбросить приложение",
    appResetComplete: "✅ Сброс приложения завершен",
    appResetSuccess: "Приложение успешно сброшено к состоянию по умолчанию.",
    appResetError: "❌ Ошибка",
    appResetFailed: "Не удалось сбросить данные приложения. Попробуйте еще раз.",
    ok: "ОК",
    
    // About
    about: "О приложении",
    appVersion: "Прототип-G в1.0.0",
    appDescription: "Система обнаружения и оповещения о подарках",
    telegramChannel: "Наш официальный Telegram-канал ",
    telegramChannelLink: "@PrototypeGifts",
    madeWith: "Сделано с помощью JavaScript и надежды"
  }
};

// Helper function to format strings with placeholders
export const formatString = (template, values = {}) => {
  return template.replace(/{(\w+)}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match;
  });
};

// Helper function to get plural form for Russian
export const getRussianPlural = (count, forms) => {
  // forms should be [one, few, many] e.g., ['час', 'часа', 'часов']
  const mod10 = count % 10;
  const mod100 = count % 100;
  
  if (mod10 === 1 && mod100 !== 11) {
    return forms[0];
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return forms[1];
  } else {
    return forms[2];
  }
};

export default translations;
