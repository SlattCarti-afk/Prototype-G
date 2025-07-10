
import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

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
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  async function schedulePushNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "TGift",
        body: 'New gift detected!',
        data: { data: 'goes here' },
      },
      trigger: { seconds: 1 },
    });
  }

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#B23AC7',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }
      
      try {
        // For web development, we'll use a development token
        if (Platform.OS === 'web') {
          console.warn('Push notifications not supported in web preview. Use mobile device for full functionality.');
          return 'web-dev-token';
        }
        
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId || projectId === 'your-project-id-here') {
          console.warn('No project ID configured. Using local development mode.');
          return 'dev-token-local';
        }
        
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        })).data;
        console.log('Push token:', token);
      } catch (error) {
        console.error('Error getting push token:', error);
        console.warn('Push notifications will work locally for testing');
        return 'dev-token-fallback';
      }
    } else {
      console.warn('Must use physical device for Push Notifications');
    }

    return token;
  }

  const connectToBackend = async () => {
    Alert.alert('Backend Connection', 'Ready to connect to your backend for real push notifications!');
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>TGift</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.mainText}>TGift is running and monitoring gifts!</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={schedulePushNotification}
          >
            <Text style={styles.buttonText}>Test Notification</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={connectToBackend}
          >
            <Text style={styles.buttonText}>Connect to Backend</Text>
          </TouchableOpacity>
          {expoPushToken && (
            <View style={styles.tokenContainer}>
              <Text style={styles.tokenLabel}>Push Token:</Text>
              <Text style={styles.tokenText}>{expoPushToken}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151515',
  },
  header: {
    backgroundColor: '#B23AC7',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  mainText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#B23AC7',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
    elevation: 5,
  },
  secondaryButton: {
    backgroundColor: '#F278D3',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tokenContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    maxWidth: '100%',
  },
  tokenLabel: {
    color: '#F278D3',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tokenText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});
