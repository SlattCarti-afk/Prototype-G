
import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator, Animated, FlatList, Linking } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';

const BACKEND_BASE_URL = 'https://8ee58e81-aaf6-4f97-8977-e5e3dab7598b-00-2akwa9443cie2.pike.replit.dev';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [notifications, setNotifications] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const [expandedNotifications, setExpandedNotifications] = useState(new Set());
  const notificationListener = useRef();
  const responseListener = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pollInterval = useRef(null);

  useEffect(() => {
    // Animate in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Check backend status
    checkBackendStatus();

    // Start polling for notifications
    startPolling();

    // Simplified token registration to reduce loading time
    registerForPushNotificationsAsync()
      .then(token => {
        setExpoPushToken(token);
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
    };
  }, []);

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
        setBackendStatus(`Connected - Client: ${data.telegram_connected ? 'Online' : 'Offline'}`);
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
          setNotifications(prev => {
            // Add new notifications and remove duplicates
            const combined = [...data.notifications, ...prev];
            const unique = combined.filter((item, index, self) => 
              index === self.findIndex(t => t.timestamp === item.timestamp && t.message === item.message)
            );
            return unique.slice(0, 50); // Keep only last 50 notifications
          });
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
    
    setIsPolling(true);
    fetchNotifications(); // Initial fetch
    
    pollInterval.current = setInterval(() => {
      fetchNotifications();
    }, 4000); // Poll every 4 seconds
  };

  const sendTestNotification = async () => {
    setIsLoading(true);
    try {
      const testData = {
        message: "🧪 Test notification from TGift app!",
        channel_id: "-1002417640134",
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${BACKEND_BASE_URL}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        Alert.alert('✅ Success', 'Test notification sent to backend! Check the backend logs to confirm receipt.');
        // Also try to refresh the backend status
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
    setIsLoading(false);
  };

  async function schedulePushNotification() {
    setIsLoading(true);
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "✨ TGift",
          body: 'New gift detected! Check your dashboard.',
          data: { type: 'gift_alert' },
        },
        trigger: { seconds: 1 },
      });
      
      // Show success feedback
      setTimeout(() => {
        Alert.alert('🎉 Success', 'Local test notification sent!', [
          { text: 'Great!', style: 'default' }
        ]);
      }, 1200);
    } catch (error) {
      Alert.alert('Error', 'Failed to send notification');
    }
    setIsLoading(false);
  }

  async function registerForPushNotificationsAsync() {
    // Simplified registration to reduce loading time
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
          lightColor: '#7289DA',
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

  const connectToBackend = async () => {
    setIsLoading(true);
    await checkBackendStatus();
    setIsLoading(false);
  };

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
    const isExpanded = expandedNotifications.has(index);
    const headline = item.headline || "New Gift Alert";
    const message = item.message || "";
    const shouldShowReadMore = message.length > 120;
    const displayMessage = !isExpanded && shouldShowReadMore ? message.substring(0, 120) : message;

    return (
      <TouchableOpacity style={styles.notificationItem} onPress={openTelegramChannel}>
        <View style={styles.notificationCard}>
          <Text style={styles.notificationHeadline}>{headline}</Text>
          <View style={styles.messageContainer}>
            <Text style={styles.notificationMessage}>
              {displayMessage}
              {shouldShowReadMore && !isExpanded && '...'}
            </Text>
            {shouldShowReadMore && (
              <TouchableOpacity 
                style={styles.readMoreButton}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleNotificationExpansion(index);
                }}
              >
                <Text style={styles.readMoreText}>
                  {isExpanded ? 'Show less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.notificationTimestamp}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle}>TGift</Text>
              <StatusIndicator connected={isConnected} />
            </View>
            <Text style={styles.headerSubtitle}>Gift Detection System</Text>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Status Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>🎁 Monitoring For New Gifts</Text>
              </View>
              <Text style={styles.cardDescription}>
                Actively scanning channels for gift opportunities and notifications
              </Text>
              <View style={styles.statusPulse}>
                <View style={[styles.pulseRing, isPolling && styles.pulsing]} />
                <LinearGradient
                  colors={['#8088fc', '#b1ecfd']}
                  style={styles.pulseCore}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={sendTestNotification}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#8088fc', '#b1ecfd']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonIcon}>🧪</Text>
                      <Text style={styles.primaryButtonText}>Send Test Notification</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
                onPress={connectToBackend}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <View style={styles.secondaryButtonContent}>
                  {isLoading ? (
                    <ActivityIndicator color="#8088fc" size="small" />
                  ) : (
                    <>
                      <Text style={styles.secondaryButtonIcon}>🔄</Text>
                      <Text style={styles.secondaryButtonText}>Refresh Connection</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Notifications List */}
            <View style={styles.notificationsCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>📨 Recent Gift Alerts</Text>
              </View>
              {notifications.length > 0 ? (
                <FlatList
                  data={notifications}
                  renderItem={renderNotificationItem}
                  keyExtractor={(item, index) => `${item.timestamp}-${index}`}
                  style={styles.notificationsList}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <Text style={styles.emptyNotifications}>
                  No gift alerts yet. Send a test notification to get started! 🎁
                </Text>
              )}
            </View>

            {/* Token Information */}
            {expoPushToken && (
              <View style={styles.tokenCard}>
                <View style={styles.tokenHeader}>
                  <Text style={styles.tokenTitle}>🔑 Push Token</Text>
                  <View style={styles.tokenBadge}>
                    <Text style={styles.tokenBadgeText}>
                      {expoPushToken.includes('dev') ? 'DEV' : 'PROD'}
                    </Text>
                  </View>
                </View>
                <View style={styles.tokenContainer}>
                  <Text style={styles.tokenText} numberOfLines={3} ellipsizeMode="middle">
                    {expoPushToken}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151515',
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#888888',
    fontWeight: '500',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
  },
  statusConnected: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  statusDisconnected: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotConnected: {
    backgroundColor: '#4CAF50',
  },
  dotDisconnected: {
    backgroundColor: '#FF6B6B',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 16,
    color: '#CCCCCC',
    lineHeight: 24,
    marginBottom: 20,
  },
  statusPulse: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#8088fc',
    opacity: 0.6,
  },
  pulsing: {
    // Note: CSS animation won't work in React Native, but keeping for web compatibility
  },
  pulseCore: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  primaryButton: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  secondaryButton: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8088fc',
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  secondaryButtonContent: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#8088fc',
  },
  notificationsCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    maxHeight: 400,
  },
  notificationsList: {
    maxHeight: 300,
  },
  notificationItem: {
    marginBottom: 12,
  },
  notificationCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8088fc',
  },
  notificationHeadline: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
  },
  messageContainer: {
    marginBottom: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '400',
    lineHeight: 20,
  },
  readMoreButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: 12,
    color: '#8088fc',
    fontWeight: '600',
  },
  notificationTimestamp: {
    fontSize: 11,
    color: '#888888',
    fontWeight: '400',
  },
  emptyNotifications: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  tokenCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tokenTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tokenBadge: {
    backgroundColor: '#8088fc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tokenBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tokenContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
  },
  tokenText: {
    fontSize: 12,
    color: '#CCCCCC',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
});
