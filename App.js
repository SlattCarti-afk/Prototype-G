
import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator, Animated, FlatList } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

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
      const response = await fetch(`${BACKEND_BASE_URL}/status`);
      if (response.ok) {
        const data = await response.json();
        setIsConnected(true);
        setBackendStatus(`Connected - Client: ${data.telegram_connected ? 'Online' : 'Offline'}`);
      } else {
        setIsConnected(false);
        setBackendStatus('Backend Error');
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
        Alert.alert('✅ Success', 'Test notification sent to backend!');
        // Fetch notifications immediately after sending
        setTimeout(fetchNotifications, 1000);
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
        {connected ? 'Connected' : 'Disconnected'}
      </Text>
    </View>
  );

  const renderNotificationItem = ({ item, index }) => (
    <View style={styles.notificationItem}>
      <Text style={styles.notificationMessage}>{item.message}</Text>
      <Text style={styles.notificationTimestamp}>
        {new Date(item.timestamp).toLocaleString()}
      </Text>
    </View>
  );

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
            <Text style={styles.headerSubtitle}>{backendStatus}</Text>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Status Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>🎁 Service Status</Text>
              </View>
              <Text style={styles.cardDescription}>
                {isPolling ? 'Monitoring for new notifications...' : 'Notification monitoring paused'}
              </Text>
              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{isConnected ? '✓' : '✗'}</Text>
                  <Text style={styles.metricLabel}>Backend</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{notifications.length}</Text>
                  <Text style={styles.metricLabel}>Messages</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{isPolling ? '🟢' : '🔴'}</Text>
                  <Text style={styles.metricLabel}>Polling</Text>
                </View>
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
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonIcon}>🧪</Text>
                    <Text style={styles.primaryButtonText}>Send Test Notification</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
                onPress={connectToBackend}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#7289DA" size="small" />
                ) : (
                  <>
                    <Text style={styles.secondaryButtonIcon}>🔄</Text>
                    <Text style={styles.secondaryButtonText}>Refresh Status</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Notifications List */}
            <View style={styles.notificationsCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>📨 Recent Notifications</Text>
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
                  No notifications yet. Send a test notification to get started!
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
    backgroundColor: '#151515',
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
    color: '#A0A0A0',
    fontWeight: '500',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusConnected: {
    backgroundColor: 'rgba(114, 137, 218, 0.15)',
  },
  statusDisconnected: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotConnected: {
    backgroundColor: '#7289DA',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
    color: '#B0B0B0',
    lineHeight: 24,
    marginBottom: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7289DA',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#A0A0A0',
    fontWeight: '500',
  },
  buttonContainer: {
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#7289DA',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7289DA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryButton: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7289DA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
    color: '#7289DA',
  },
  notificationsCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 300,
  },
  notificationsList: {
    maxHeight: 200,
  },
  notificationItem: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#7289DA',
  },
  notificationMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 8,
  },
  notificationTimestamp: {
    fontSize: 12,
    color: '#A0A0A0',
    fontWeight: '400',
  },
  emptyNotifications: {
    fontSize: 16,
    color: '#A0A0A0',
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
    backgroundColor: 'rgba(114, 137, 218, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tokenBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7289DA',
  },
  tokenContainer: {
    backgroundColor: '#0F0F0F',
    borderRadius: 12,
    padding: 16,
  },
  tokenText: {
    fontSize: 12,
    color: '#A0A0A0',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
});
