
import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator, Animated, FlatList, Linking, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

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

const PulsingDot = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: 20,
          height: 20,
          borderRadius: 10,
          transform: [{ scale: pulseAnim }],
        }
      ]}
    >
      <LinearGradient
        colors={['#B383FF', '#C5AFFF', '#9B74FF']}
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
        }}
      />
    </Animated.View>
  );
};

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const [testButtonLoading, setTestButtonLoading] = useState(false);
  const [refreshButtonLoading, setRefreshButtonLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [notifications, setNotifications] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const [expandedNotifications, setExpandedNotifications] = useState(new Set());
  const [countdown, setCountdown] = useState(5);
  const notificationListener = useRef();
  const responseListener = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pollInterval = useRef(null);
  const countdownInterval = useRef(null);
  const [sound, setSound] = useState();

  useEffect(() => {
    // Load backend URL from file first
    loadBackendURL().then(() => {
      // Load cached notifications first to show immediately
      const cachedNotifications = loadCachedNotifications();
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

  const loadCachedNotifications = () => {
    try {
      // In a real app, you'd use AsyncStorage, but for web we'll use localStorage
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const cached = window.localStorage.getItem('tgift_notifications');
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
      }
      return [];
    } catch (error) {
      console.log('Failed to load cached notifications:', error);
      return [];
    }
  };

  const cacheNotifications = (newNotifications) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem('tgift_notifications', JSON.stringify(newNotifications));
        console.log('Cached notifications:', newNotifications.length);
      }
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
            const currentNotifications = notifications.length > 0 ? notifications : loadCachedNotifications();
            
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
            cacheNotifications(uniqueNotifications);
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
      const { sound } = await Audio.Sound.createAsync(
        require('./Sound.ogg'),
        { shouldPlay: true, volume: 0.8 }
      );
      setSound(sound);
      
      setTimeout(async () => {
        if (sound) {
          await sound.unloadAsync();
        }
      }, 3000);
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
    Linking.openURL('https://t.me/PrototypeOff');
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
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View style={styles.headerTitleContainer}>
                  <Ionicons name="gift" size={22} color="#8088fc" style={styles.headerIcon} />
                  <Text style={styles.headerTitle}>TGift</Text>
                </View>
                <StatusIndicator connected={isConnected} />
              </View>
              <Text style={styles.headerSubtitle}>Gift Detection & Alert System</Text>
              <View style={styles.connectionStatusContainer}>
                <Ionicons 
                  name={isConnected ? "checkmark-circle" : "close-circle"} 
                  size={12} 
                  color={isConnected ? "#4CAF50" : "#FF6B6B"} 
                  style={styles.connectionStatusIcon} 
                />
                <Text style={styles.connectionStatus}>{backendStatus}</Text>
              </View>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              {/* Status Card */}
              <View style={styles.statusCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <Ionicons name="search" size={18} color="#8088fc" style={styles.cardIcon} />
                    <Text style={styles.cardTitle}>Monitoring Status</Text>
                  </View>
                </View>
                <Text style={styles.cardDescription}>
                  Actively Monitoring For New Gifts!
                </Text>
                <View style={styles.statusInfo}>
                  <View style={styles.statusInfoRow}>
                    <Ionicons name="time" size={14} color="#C0C0C0" style={styles.statusIcon} />
                    <Text style={styles.statusInfoText}>
                      Next refresh in: {countdown} seconds
                    </Text>
                  </View>
                </View>
                <View style={styles.statusPulse}>
                  <View style={[styles.pulseRing, isPolling && styles.pulsing]} />
                  {isConnected ? (
                    <PulsingDot />
                  ) : (
                    <View style={styles.pulseCoreOffline} />
                  )}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.primaryButton, testButtonLoading && styles.buttonDisabled]}
                  onPress={sendTestNotification}
                  disabled={testButtonLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#B383FF', '#9B74FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    {testButtonLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="flask" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                        <Text style={styles.primaryButtonText}>Send Test Notification</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.secondaryButton, refreshButtonLoading && styles.buttonDisabled]}
                  onPress={refreshConnection}
                  disabled={refreshButtonLoading}
                  activeOpacity={0.8}
                >
                  <View style={styles.secondaryButtonContent}>
                    {refreshButtonLoading ? (
                      <ActivityIndicator color="#8088fc" size="small" />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={20} color="#8088fc" style={styles.buttonIcon} />
                        <Text style={styles.secondaryButtonText}>Refresh</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Notifications List */}
              <View style={styles.notificationsCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <Ionicons name="mail" size={18} color="#8088fc" style={styles.cardIcon} />
                    <Text style={styles.cardTitle}>Recent Gift News</Text>
                  </View>
                  <Text style={styles.notificationCount}>
                    {notifications.length} alerts
                  </Text>
                </View>
                {notifications.length > 0 ? (
                  <View style={styles.notificationsListContainer}>
                    <FlatList
                      data={notifications.slice(0, 20)} // Show only latest 20
                      renderItem={renderNotificationItem}
                      keyExtractor={(item, index) => `${item.timestamp}-${index}`}
                      style={styles.notificationsList}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                      scrollEnabled={true}
                      contentContainerStyle={styles.flatListContent}
                    />
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="gift-outline" size={56} color="#8088fc" style={styles.emptyStateIcon} />
                    <Text style={styles.emptyStateTitle}>No gift news yet</Text>
                    <Text style={styles.emptyStateDescription}>
                      Send a test notification or wait for new gift opportunities to be detected!
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B14',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 50,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(11, 11, 20, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 175, 255, 0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
    color: '#C5AFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowColor: 'rgba(197, 175, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#B0B0C0',
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  connectionStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionStatusIcon: {
    marginRight: 4,
  },
  connectionStatus: {
    fontSize: 11,
    color: '#B0B0C0',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 25,
    backgroundColor: 'rgba(30, 20, 50, 0.7)',
    backdropFilter: 'blur(20px)',
    shadowColor: 'rgba(197, 175, 255, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statusConnected: {
    backgroundColor: 'rgba(179, 131, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(179, 131, 255, 0.4)',
    shadowColor: '#B383FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  statusDisconnected: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  dotConnected: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },
  dotDisconnected: {
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  statusCard: {
    backgroundColor: 'rgba(20, 15, 35, 0.8)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(197, 175, 255, 0.15)',
    backdropFilter: 'blur(20px)',
    shadowColor: 'rgba(197, 175, 255, 0.3)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 8,
    color: '#C5AFFF',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(197, 175, 255, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  notificationCount: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    backgroundColor: 'rgba(197, 175, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(197, 175, 255, 0.4)',
    shadowColor: '#C5AFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  cardDescription: {
    fontSize: 16,
    color: '#B0B0C0',
    lineHeight: 24,
    marginBottom: 18,
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statusInfo: {
    marginBottom: 20,
  },
  statusInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 6,
    color: '#C5AFFF',
  },
  statusInfoText: {
    fontSize: 14,
    color: '#B0B0C0',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statusPulse: {
    alignSelf: 'center',
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: 'rgba(197, 175, 255, 0.4)',
    opacity: 0.8,
    shadowColor: '#C5AFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  pulsing: {
    // Animation placeholder
  },
  pulseCore: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  pulseCoreOnline: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#B383FF',
  },
  pulseCoreOffline: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButton: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(179, 131, 255, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  secondaryButton: {
    backgroundColor: 'rgba(20, 15, 35, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(197, 175, 255, 0.3)',
    backdropFilter: 'blur(10px)',
    shadowColor: 'rgba(197, 175, 255, 0.2)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  secondaryButtonContent: {
    paddingVertical: 20,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#C5AFFF',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  notificationsCard: {
    backgroundColor: 'rgba(20, 15, 35, 0.8)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(197, 175, 255, 0.15)',
    backdropFilter: 'blur(20px)',
    minHeight: 300,
    shadowColor: 'rgba(197, 175, 255, 0.3)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  notificationsListContainer: {
    flex: 1,
    height: 300,
  },
  notificationsList: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: 12,
  },
  notificationItem: {
    marginBottom: 16,
  },
  notificationCard: {
    backgroundColor: 'rgba(30, 20, 50, 0.8)',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(197, 175, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    shadowColor: 'rgba(197, 175, 255, 0.2)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(197, 175, 255, 0.1)',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  notificationIcon: {
    marginRight: 8,
    color: '#C5AFFF',
  },
  notificationHeadline: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    flex: 1,
  },
  messageContainer: {
    marginBottom: 10,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#B0B0C0',
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: 8,
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readMoreButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(197, 175, 255, 0.1)',
  },
  readMoreText: {
    fontSize: 12,
    color: '#C5AFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  viewChannelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(197, 175, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(197, 175, 255, 0.3)',
  },
  viewChannelIcon: {
    marginRight: 4,
    color: '#C5AFFF',
  },
  viewChannelText: {
    fontSize: 11,
    color: '#C5AFFF',
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  notificationTimestamp: {
    fontSize: 11,
    color: '#9090A0',
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    marginBottom: 16,
    opacity: 0.7,
    color: '#C5AFFF',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(197, 175, 255, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#B0B0C0',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
