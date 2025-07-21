import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator, Animated, FlatList, Linking, ScrollView, Vibration } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Settings from './Settings';
import * as Localization from 'expo-localization';
import i18n from 'i18n-js';

let BACKEND_BASE_URL = 'https://8ee58e81-aaf6-4f97-8977-e5e3dab7598b-00-2akwa9443cie2.pike.replit.dev'; // fallback

// Load backend URL from BackendURL.txt file
const loadBackendURL = async () => {
  try {
    const response = await fetch('/BackendURL.txt');
    if (response.ok) {
      const url = await response.text();
      BACKEND_BASE_URL = url.trim();
      console.log('Backend URL loaded from file:', BACKEND_BASE_URL);
    }
  } catch (error) {
    console.log('Failed to load backend URL from file, using fallback:', BACKEND_BASE_URL);
  }
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidImportance.HIGH,
  }),
});

const HeartbeatDot = ({ isConnected, animationsEnabled = true }) => {
  const heartbeatAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(1)).current; // 1 = online, 0 = offline
  const [animationState, setAnimationState] = useState('normal'); // normal, dying, dead, reviving
  const [previousConnection, setPreviousConnection] = useState(isConnected);
  const animationRef = useRef(null);

  // Handle connection state changes
  useEffect(() => {
    if (previousConnection !== isConnected) {
      console.log('Connection state changed:', previousConnection, '->', isConnected);

      // IMMEDIATELY stop any current animation when connection state changes
      if (animationRef.current) {
        console.log('Stopping current animation due to connection change');
        animationRef.current.stop();
        animationRef.current = null;
      }

      if (!isConnected && previousConnection) {
        // Going offline - start dying animation
        console.log('Going offline - starting dying animation');
        setAnimationState('dying');
      } else if (isConnected && !previousConnection) {
        // Coming back online - start reviving animation
        console.log('Coming online - starting reviving animation');
        setAnimationState('reviving');
      }
      setPreviousConnection(isConnected);
    }
  }, [isConnected, previousConnection]);

  // Separate effect to handle offline state enforcement and force stop animations
  useEffect(() => {
    if (!isConnected) {
      // If we're offline, ALWAYS stop any running animation immediately
      if (animationRef.current) {
        console.log('Force stopping animation - backend offline');
        animationRef.current.stop();
        animationRef.current = null;
      }

      // If we're offline and in normal/reviving state, go to dead
      if (animationState === 'normal' || animationState === 'reviving') {
        console.log('Setting animation to dead due to offline state');
        setAnimationState('dead');
      }
    }
  }, [isConnected, animationState]);

  // Color transition animation
  useEffect(() => {
    Animated.timing(colorAnim, {
      toValue: isConnected ? 1 : 0,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [isConnected]);

  // Main heartbeat animation logic
  useEffect(() => {
    // Clean up any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    const normalHeartbeat = () => {
      // Skip animations if disabled
      if (!animationsEnabled) {
        heartbeatAnim.setValue(1);
        return;
      }

      // Double check we're still connected and in normal state
      if (!isConnected || animationState !== 'normal') {
        console.log('Stopping normal heartbeat - not connected or wrong state');
        return;
      }

      // Create individual animations that can be stopped
      const beat1Up = Animated.timing(heartbeatAnim, {
        toValue: 1.4,
        duration: 150,
        useNativeDriver: true,
      });

      const beat1Down = Animated.timing(heartbeatAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      });

      const beat2Up = Animated.timing(heartbeatAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      });

      const beat2Down = Animated.timing(heartbeatAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      });

      const pause = Animated.delay(800);

      const sequence = Animated.sequence([
        beat1Up,
        beat1Down, 
        beat2Up,
        beat2Down,
        pause,
      ]);

      animationRef.current = sequence;
      sequence.start((finished) => {
        // Clear the ref when animation completes or stops
        animationRef.current = null;
        // Only continue if animation completed naturally AND we're still connected and in normal state
        if (finished && animationState === 'normal' && isConnected && animationsEnabled) {
          // Double check one more time before recursing
          if (isConnected && animationState === 'normal' && animationsEnabled) {
            normalHeartbeat();
          } else {
            console.log('Connection lost during heartbeat, stopping');
          }
        } else {
          console.log('Normal heartbeat stopped - finished:', finished, 'state:', animationState, 'connected:', isConnected);
        }
      });
    };

    const dyingAnimation = () => {
      // Skip animations if disabled
      if (!animationsEnabled) {
        setAnimationState('dead');
        return;
      }

      // 2 quick beeps, then 2 slow beeps, then stop
      const sequence = Animated.sequence([
        // First quick beep
        Animated.timing(heartbeatAnim, {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(200),
        // Second quick beep
        Animated.timing(heartbeatAnim, {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(500),
        // First slow beep
        Animated.timing(heartbeatAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(800),
        // Second slow beep
        Animated.timing(heartbeatAnim, {
          toValue: 1.1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]);

      animationRef.current = sequence;
      sequence.start((finished) => {
        // Clear the ref when animation completes
        animationRef.current = null;
        // Only set to dead if animation completed naturally
        if (finished) {
          console.log('Dying animation completed, setting to dead');
          setAnimationState('dead');
        }
      });
    };

    const revivingAnimation = () => {
      // Skip animations if disabled
      if (!animationsEnabled) {
        setAnimationState('normal');
        return;
      }

      // Slow beeps getting faster, then normal
      const sequence = Animated.sequence([
        // Very slow beep
        Animated.timing(heartbeatAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(600),
        // Medium slow beep
        Animated.timing(heartbeatAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(400),
        // Getting faster
        Animated.timing(heartbeatAnim, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(300),
      ]);

      animationRef.current = sequence;
      sequence.start((finished) => {
        // Clear the ref when animation completes
        animationRef.current = null;
        // Only set to normal if animation completed naturally and still connected
        if (finished && isConnected) {
          console.log('Reviving animation completed, setting to normal');
          setAnimationState('normal');
        }
      });
    };

    switch (animationState) {
      case 'normal':
        // Only start normal heartbeat if connected
        if (isConnected) {
          console.log('Starting normal heartbeat');
          normalHeartbeat();
        } else {
          console.log('Not connected, setting to dead instead of normal');
          setAnimationState('dead');
        }
        break;
      case 'dying':
        console.log('Starting dying animation');
        dyingAnimation();
        break;
      case 'reviving':
        console.log('Starting reviving animation');
        revivingAnimation();
        break;
      case 'dead':
        // No animation when dead - stay still
        console.log('Animation state: dead - no movement');
        heartbeatAnim.setValue(1);
        break;
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [animationState, isConnected]);

  // Interpolate colors based on connection state
  const backgroundColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FF6B6B', '#B383FF'],
  });

  return (
    <Animated.View
      style={[
        {
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: backgroundColor,
          transform: [{ scale: heartbeatAnim }],
          shadowColor: isConnected ? '#B383FF' : '#FF6B6B',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.6,
          shadowRadius: 4,
          elevation: 4,
        }
      ]}
    />
  );
};

// Create Language Context
const LanguageContext = createContext();

// Language Provider Component
const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState(Localization.locale);
  const [languageLoading, setLanguageLoading] = useState(true);

  const translations = {
    en: {
      appTitle: 'Prototype - G',
      systemText: 'Gift Alert System',
      connected: 'Online',
      connectionFailed: 'Connection Failed',
      monitoringStatus: 'Monitoring Status',
      activelyMonitoring: 'Actively Monitoring For New Gifts!',
      nextRefresh: 'Next refresh in: {{seconds}} seconds',
      sendTestNotification: 'Send Test Notification',
      refresh: 'Refresh',
      recentGiftNews: 'Recent Gift News',
      alerts: 'alerts',
      noGiftNews: 'No gift news yet',
      noGiftNewsDesc: 'Send a test notification or wait for new gift opportunities to be detected!',
    },
    ru: {
      appTitle: 'Прототип - G',
      systemText: 'Система оповещений о подарках',
      connected: 'Онлайн',
      connectionFailed: 'Не удалось подключиться',
      monitoringStatus: 'Статус мониторинга',
      activelyMonitoring: 'Активно отслеживаем новые подарки!',
      nextRefresh: 'Следующее обновление через: {{seconds}} секунд',
      sendTestNotification: 'Отправить тестовое уведомление',
      refresh: 'Обновить',
      recentGiftNews: 'Последние новости о подарках',
      alerts: 'оповещения',
      noGiftNews: 'Пока нет новостей о подарках',
      noGiftNewsDesc: 'Отправьте тестовое уведомление или дождитесь обнаружения новых возможностей получения подарков!',
    },
  };

  i18n.translations = translations;
  i18n.locale = locale;
  i18n.fallbacks = true;

  const setI18nConfig = () => {
    // set i18n-js config
    i18n.translations = translations;
    i18n.locale = locale;
  };

  useEffect(() => {
    setI18nConfig();
    setLanguageLoading(false);
  }, [locale]);

  const setLanguage = (newLocale) => {
    setLocale(newLocale);
    i18n.locale = newLocale;
  };

  const t = (key, params) => i18n.t(key, params);

  const value = { locale, setLanguage, t, languageLoading };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

function AppContent() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const [testButtonLoading, setTestButtonLoading] = useState(false);
  const [refreshButtonLoading, setRefreshButtonLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [notifications, setNotifications] = useState([]);
  const [isPolling, setIsPolling] = useState(isPolling);
  const [expandedNotifications, setExpandedNotifications] = useState(new Set());
  const [countdown, setCountdown] = useState(5);
  const notificationListener = useRef();
  const responseListener = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pollInterval = useRef(null);
  const countdownInterval = useRef(null);
  const [sound, setSound] = useState();
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    vibration: true,
    darkMode: true,
    animations: true,
    fontSize: 1,
    notificationSound: 'default',
  });
  const { t, languageLoading } = useLanguage();

  useEffect(() => {
    // Load settings first
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('tgift_settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        console.log('Failed to load settings:', error);
      }
    };

    // Load backend URL from file first
    loadBackendURL().then(async () => {
      // Load settings
      await loadSettings();

      // Load cached notifications first to show immediately
      const cachedNotifications = await loadCachedNotifications();
      console.log('App initialized with cached notifications:', cachedNotifications.length);

      // Check backend status
      checkBackendStatus();

      // Start polling for notifications
      startPolling();
    });

    // Animate in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Simplified token registration to reduce loading time
    registerForPushNotificationsAsync()
      .then(token => {
        setExpoPushToken(token);
        registerDeviceWithBackend(token);
      })
      .catch(() => {
        console.log('Failed to get push token');
        setExpoPushToken('dev-mode');
      });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadCachedNotifications = async () => {
    try {
      const cached = await AsyncStorage.getItem('tgift_notifications');
      if (cached) {
        const parsedNotifications = JSON.parse(cached);

        // Filter to only show NEWS notifications (not test notifications)
        const newsOnlyNotifications = parsedNotifications.filter(notification => 
          notification.message && (
            notification.message.toLowerCase().includes('news') ||
            notification.headline && notification.headline.toLowerCase().includes('news')
          ) && !notification.headline?.includes('🧪 Test')
        );

        // Remove duplicates when loading
        const uniqueNotifications = newsOnlyNotifications.filter((notification, index, self) =>
          index === self.findIndex((n) => 
            n.timestamp === notification.timestamp && 
            n.message === notification.message
          )
        );
        console.log('Loaded cached NEWS notifications:', uniqueNotifications.length);
        setNotifications(uniqueNotifications);
        return uniqueNotifications;
      }
      return [];
    } catch (error) {
      console.log('Failed to load cached notifications:', error);
      return [];
    }
  };

  const cacheNotifications = async (newNotifications) => {
    try {
      await AsyncStorage.setItem('tgift_notifications', JSON.stringify(newNotifications));
      console.log('Cached notifications:', newNotifications.length);
    } catch (error) {
      console.log('Failed to cache notifications:', error);
    }
  };

  const checkBackendStatus = async () => {
    try {
      console.log('Checking backend status at:', `${BACKEND_BASE_URL}/status`);
      const response = await fetch(`${BACKEND_BASE_URL}/status`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      console.log('Status response:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('Status data:', data);
        setIsConnected(true);
        setBackendStatus('Connected');
      } else {
        const errorText = await response.text();
        console.log('Status error response:', errorText);
        setIsConnected(false);
        setBackendStatus(`Backend Error (${response.status})`);
      }
    } catch (error) {
      setIsConnected(false);
      setBackendStatus('Connection Failed');
      console.error('Backend status check failed:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/notifications`);
      if (response.ok) {
        const data = await response.json();
        if (data.notifications && data.notifications.length > 0) {
          // Filter to only show NEWS notifications from backend
          const newsNotifications = data.notifications.filter(notification => 
            notification.message && (
              notification.message.toLowerCase().includes('news') ||
              notification.headline && notification.headline.toLowerCase().includes('news')
            )
          );

          if (newsNotifications.length > 0) {
            // Get current notifications (either from state or cache)
            const currentNotifications = notifications.length > 0 ? notifications : await loadCachedNotifications();

            // Merge new news notifications with existing ones
            const allNotifications = [...currentNotifications, ...newsNotifications];

            // Remove duplicates based on timestamp, message content, and headline
            const uniqueNotifications = allNotifications.filter((notification, index, self) =>
              index === self.findIndex((n) => 
                n.timestamp === notification.timestamp && 
                n.message === notification.message &&
                n.headline === notification.headline
              )
            );

            // Sort by timestamp (newest first)
            uniqueNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            console.log('Fetched NEWS notifications:', newsNotifications.length, 'Total unique:', uniqueNotifications.length);
            setNotifications(uniqueNotifications);
            await cacheNotifications(uniqueNotifications);
          } else {
            console.log('No NEWS notifications from server');
          }
        } else {
          // No new notifications from server, keep existing cached ones
          console.log('No new notifications from server');
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const startPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
    }
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
    }

    setIsPolling(true);
    fetchNotifications(); // Initial fetch
    checkBackendStatus(); // Initial status check
    setCountdown(5);

    // Countdown timer that updates every second and refreshes everything when it reaches 0
    countdownInterval.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Do the same job as the refresh button
          fetchNotifications();
          checkBackendStatus();
          return 5; // Reset to 5
        }
        return prev - 1;
      });
    }, 1000);
  };

  const playNotificationSound = async () => {
    try {
      // Apply vibration setting for 8 seconds like an alarm
      if (settings.vibration) {
        // Continuous vibration pattern for 8 seconds (8000ms)
        const vibrationPattern = [];
        for (let i = 0; i < 16; i++) { // 16 cycles of 500ms vibrate = 8 seconds
          vibrationPattern.push(500);
        }
        Vibration.vibrate(vibrationPattern, true); // true for repeat until stopped

        // Stop vibration after 8 seconds
        setTimeout(() => {
          Vibration.cancel();
        }, 8000);
      }

      // Play notification sound based on user preference
      if (settings.notificationSound === 'custom') {
        // For custom sound, we rely on device's default notification sound
        // The actual custom file selection would be handled by the OS
        console.log('Using device custom notification sound');
      } else {
        // Play default app sound
        try {
          const { sound } = await Audio.Sound.createAsync(
            require('./LongSound.ogg'),
            { shouldPlay: true, volume: 0.8 }
          );
          setSound(sound);
        } catch (soundError) {
          console.log('Failed to load sound file, using system notification sound');
          // Fallback to system notification sound if file loading fails
        }

        setTimeout(async () => {
          if (sound) {
            await sound.unloadAsync();
          }
        }, 8000); // 8 seconds duration
      }
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  const sendTestNotification = async () => {
    if (testButtonLoading) return; // Prevent double clicks
    setTestButtonLoading(true);
    try {
      const testData = {
        headline: "🧪 Test Notification",
        message: "Test notification from TGift app! This is working correctly.",
        timestamp: new Date().toISOString(),
        channel_id: "-1002417640134"
      };

      const response = await fetch(`${BACKEND_BASE_URL}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        await playNotificationSound();
        Alert.alert('✅ Success', 'Test notification sent to backend! You should receive a push notification shortly.');

        // Don't add test notifications to the Recent Gift News section
        // That section is only for NEWS notifications from the backend

        setTimeout(() => {
          checkBackendStatus();
          fetchNotifications();
        }, 1000);
      } else {
        const errorData = await response.json();
        Alert.alert('❌ Error', `Failed to send: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      Alert.alert('❌ Network Error', 'Could not connect to backend');
      console.error('Test notification error:', error);
    }
    setTestButtonLoading(false);
  };

  const registerDeviceWithBackend = async (pushToken) => {
    try {
      if (pushToken && !pushToken.includes('dev') && !pushToken.includes('simulator') && !pushToken.includes('web')) {
        const response = await fetch(`${BACKEND_BASE_URL}/register-device`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            expo_push_token: pushToken,
            device_id: Device.modelName || 'unknown-device'
          })
        });

        if (response.ok) {
          console.log('✅ Device successfully registered with backend for push notifications');
        } else {
          console.log('⚠️ Failed to register device with backend:', response.status);
        }
      } else {
        console.log('⚠️ Skipping backend registration - development mode token');
      }
    } catch (error) {
      console.error('❌ Error registering device with backend:', error);
    }
  };

  const refreshConnection = async () => {
    if (refreshButtonLoading) return; // Prevent double clicks
    setRefreshButtonLoading(true);
    try {
      // Check backend status
      await checkBackendStatus();
      // Fetch latest notifications
      await fetchNotifications();

      Alert.alert('🔄 Refreshed', 'Connection status and notifications updated!');
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to refresh connection');
    }
    setRefreshButtonLoading(false);
  };

  async function registerForPushNotificationsAsync() {
    if (!Device.isDevice && Platform.OS !== 'web') {
      return 'simulator-token';
    }

    if (Platform.OS === 'web') {
      return 'web-dev-token';
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return 'no-permissions';
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'TGift Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8088fc',
          sound: true,
          enableLights: true,
          enableVibrate: true,
        });
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId || projectId === 'your-project-id-here') {
        return 'dev-mode-active';
      }

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      return token;
    } catch (error) {
      return 'fallback-mode';
    }
  }

  const StatusIndicator = ({ connected }) => (
    <View style={[styles.statusIndicator, connected ? styles.statusConnected : styles.statusDisconnected]}>
      <View style={[styles.statusDot, connected ? styles.dotConnected : styles.dotDisconnected]} />
      <Text style={styles.statusText}>
        {connected ? 'Online' : 'Offline'}
      </Text>
    </View>
  );

  const toggleNotificationExpansion = (index) => {
    const newExpanded = new Set(expandedNotifications);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedNotifications(newExpanded);
  };

  const openTelegramChannel = () => {
    Linking.openURL('https://t.me/PrototypeGifts');
  };

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    // Apply vibration setting immediately
    if (newSettings.vibration !== settings.vibration) {
      console.log('Vibration setting changed:', newSettings.vibration);
    }
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMs = now - notificationTime;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else {
      return 'Just now';
    }
  };

  const renderNotificationItem = ({ item, index }) => {
    const headline = item.headline || "New Gift Alert";
    // Clean the message by removing standalone "news" text and "— NEWS" patterns
    let message = (item.message || "")
      .replace(/^\s*news\s*$/gmi, '') // Remove standalone "news" lines
      .replace(/^—\s*NEWS\s*$/gmi, '') // Remove "— NEWS" lines  
      .replace(/\n\s*news\s*\n/gi, '\n') // Remove "news" between newlines
      .replace(/\n\s*—\s*NEWS\s*\n/gi, '\n') // Remove "— NEWS" between newlines
      .trim();
    const shouldShowReadMore = message.length > 100;
    const isExpanded = expandedNotifications.has(index);
    const displayMessage = (shouldShowReadMore && !isExpanded) ? message.substring(0, 100) + '...' : message;

    return (
      <View style={styles.notificationItem}>
        <View style={styles.notificationCard}>
          <View style={styles.notificationHeader}>
            <Ionicons name="gift" size={16} color="#8088fc" style={styles.notificationIcon} />
            <Text style={styles.notificationHeadline}>{headline}</Text>
          </View>
          <View style={styles.messageContainer}>
            <Text style={styles.notificationMessage}>
              {displayMessage}
            </Text>
            <View style={styles.notificationActions}>
              {shouldShowReadMore && (
                <TouchableOpacity 
                  style={styles.readMoreButton}
                  onPress={() => toggleNotificationExpansion(index)}
                >
                  <Text style={styles.readMoreText}>
                    {isExpanded ? 'Show less' : 'Read more'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.viewChannelButton}
                onPress={openTelegramChannel}
              >
                <Ionicons name="arrow-forward" size={12} color="#8088fc" style={styles.viewChannelIcon} />
                <Text style={styles.viewChannelText}>
                  View Channel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.notificationTimestamp}>
            {getRelativeTime(item.timestamp)}
          </Text>