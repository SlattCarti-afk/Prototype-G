
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
          toValue: 1.4,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
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
          width: 24,
          height: 24,
          borderRadius: 12,
          transform: [{ scale: pulseAnim }],
        }
      ]}
    >
      <LinearGradient
        colors={['#00D4AA', '#4ECDC4', '#7FDBDA']}
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
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
      // Load cached notifications
      loadCachedNotifications();

      // Check backend status
      checkBackendStatus();

      // Start polling for notifications
      startPolling();
    });

    // Animate in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
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
          // Remove duplicates when loading
          const uniqueNotifications = parsedNotifications.filter((notification, index, self) =>
            index === self.findIndex((n) => 
              n.timestamp === notification.timestamp && 
              n.message === notification.message
            )
          );
          setNotifications(uniqueNotifications);
        }
      }
    } catch (error) {
      console.log('Failed to load cached notifications:', error);
    }
  };

  const cacheNotifications = (newNotifications) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem('tgift_notifications', JSON.stringify(newNotifications));
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
        setBackendStatus('🟢 Connected');
      } else {
        const errorText = await response.text();
        console.log('Status error response:', errorText);
        setIsConnected(false);
        setBackendStatus(`Backend Error (${response.status})`);
      }
    } catch (error) {
      setIsConnected(false);
      setBackendStatus('🔴 Connection Failed');
      console.error('Backend status check failed:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/notifications`);
      if (response.ok) {
        const data = await response.json();
        if (data.notifications && data.notifications.length > 0) {
          // Remove duplicates based on timestamp and message content
          const uniqueNotifications = data.notifications.filter((notification, index, self) =>
            index === self.findIndex((n) => 
              n.timestamp === notification.timestamp && 
              n.message === notification.message &&
              n.headline === notification.headline
            )
          );
          setNotifications(uniqueNotifications);
          cacheNotifications(uniqueNotifications);
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
            <Ionicons name="gift" size={18} color="#7B68EE" style={styles.notificationIcon} />
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
                <Ionicons name="arrow-forward" size={12} color="#7B68EE" style={styles.viewChannelIcon} />
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
                  <Ionicons name="gift" size={26} color="#7B68EE" style={styles.headerIcon} />
                  <Text style={styles.headerTitle}>TGift</Text>
                </View>
                <StatusIndicator connected={isConnected} />
              </View>
              <Text style={styles.headerSubtitle}>Gift Detection & Alert System</Text>
              <Text style={styles.connectionStatus}>{backendStatus}</Text>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              {/* Status Card */}
              <View style={styles.statusCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <Ionicons name="search" size={20} color="#7B68EE" style={styles.cardIcon} />
                    <Text style={styles.cardTitle}>Monitoring Status</Text>
                  </View>
                </View>
                <Text style={styles.cardDescription}>
                  Actively Monitoring For New Gifts!
                </Text>
                <View style={styles.statusInfo}>
                  <View style={styles.statusInfoRow}>
                    <Ionicons name="time" size={16} color="#A8A8B3" style={styles.statusIcon} />
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
                    colors={['#7B68EE', '#9F8AE8', '#C4A8F0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buttonGradient}
                  >
                    {testButtonLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="flask" size={22} color="#FFFFFF" style={styles.buttonIcon} />
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
                      <ActivityIndicator color="#7B68EE" size="small" />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={22} color="#7B68EE" style={styles.buttonIcon} />
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
                    <Ionicons name="mail" size={20} color="#7B68EE" style={styles.cardIcon} />
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
                    <Ionicons name="gift-outline" size={64} color="#7B68EE" style={styles.emptyStateIcon} />
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
    backgroundColor: '#0A0A0F',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 60,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: 'rgba(15, 15, 24, 0.98)',
    backdropFilter: 'blur(20px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(123, 104, 238, 0.08)',
    shadowColor: 'rgba(123, 104, 238, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    textShadowColor: 'rgba(123, 104, 238, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#A8A8B3',
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  connectionStatus: {
    fontSize: 12,
    color: '#C5C5D0',
    fontWeight: '500',
    letterSpacing: 0.4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    backgroundColor: 'rgba(25, 25, 35, 0.85)',
    backdropFilter: 'blur(30px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusConnected: {
    backgroundColor: 'rgba(0, 212, 170, 0.12)',
    borderColor: 'rgba(0, 212, 170, 0.25)',
    shadowColor: '#00D4AA',
  },
  statusDisconnected: {
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderColor: 'rgba(255, 107, 107, 0.25)',
    shadowColor: '#FF6B6B',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  dotConnected: {
    backgroundColor: '#00D4AA',
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  dotDisconnected: {
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 28,
    marginTop: 24,
  },
  statusCard: {
    backgroundColor: 'rgba(20, 20, 30, 0.9)',
    borderRadius: 28,
    padding: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.12)',
    backdropFilter: 'blur(30px)',
    shadowColor: 'rgba(123, 104, 238, 0.25)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    textShadowColor: 'rgba(123, 104, 238, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  notificationCount: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
    backgroundColor: 'rgba(123, 104, 238, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.35)',
    shadowColor: '#7B68EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    letterSpacing: 0.6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  cardDescription: {
    fontSize: 18,
    color: '#E8E8F0',
    lineHeight: 28,
    marginBottom: 24,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  statusInfo: {
    marginBottom: 28,
  },
  statusInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 8,
  },
  statusInfoText: {
    fontSize: 15,
    color: '#A8A8B3',
    fontWeight: '600',
    letterSpacing: 0.4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  statusPulse: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(123, 104, 238, 0.35)',
    opacity: 0.9,
    shadowColor: '#7B68EE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  pulsing: {
    // Animation placeholder
  },
  pulseCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  pulseCoreOnline: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00D4AA',
  },
  pulseCoreOffline: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  buttonContainer: {
    marginBottom: 28,
  },
  buttonIcon: {
    marginRight: 12,
  },
  primaryButton: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: 'rgba(123, 104, 238, 0.5)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  secondaryButton: {
    backgroundColor: 'rgba(20, 20, 30, 0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.25)',
    backdropFilter: 'blur(20px)',
    shadowColor: 'rgba(123, 104, 238, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  buttonGradient: {
    paddingVertical: 24,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  secondaryButtonContent: {
    paddingVertical: 24,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7B68EE',
    letterSpacing: 0.6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  notificationsCard: {
    backgroundColor: 'rgba(20, 20, 30, 0.9)',
    borderRadius: 28,
    padding: 28,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.12)',
    backdropFilter: 'blur(30px)',
    minHeight: 320,
    shadowColor: 'rgba(123, 104, 238, 0.25)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  notificationsListContainer: {
    flex: 1,
    height: 320,
  },
  notificationsList: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: 16,
  },
  notificationItem: {
    marginBottom: 20,
  },
  notificationCard: {
    backgroundColor: 'rgba(28, 28, 40, 0.95)',
    borderRadius: 20,
    padding: 24,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(123, 104, 238, 0.8)',
    backdropFilter: 'blur(20px)',
    shadowColor: 'rgba(123, 104, 238, 0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.08)',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationHeadline: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    flex: 1,
  },
  messageContainer: {
    marginBottom: 14,
  },
  notificationMessage: {
    fontSize: 15,
    color: '#E0E0E8',
    fontWeight: '500',
    lineHeight: 24,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginBottom: 12,
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readMoreButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(123, 104, 238, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.25)',
  },
  readMoreText: {
    fontSize: 13,
    color: '#7B68EE',
    fontWeight: '700',
    letterSpacing: 0.4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  viewChannelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(123, 104, 238, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.35)',
    shadowColor: '#7B68EE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  viewChannelIcon: {
    marginRight: 6,
  },
  viewChannelText: {
    fontSize: 12,
    color: '#7B68EE',
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  notificationTimestamp: {
    fontSize: 12,
    color: '#8E8E9A',
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateIcon: {
    marginBottom: 20,
    opacity: 0.8,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.4,
    textShadowColor: 'rgba(123, 104, 238, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  emptyStateDescription: {
    fontSize: 15,
    color: '#A8A8B3',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});
