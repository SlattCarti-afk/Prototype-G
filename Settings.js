
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform, Alert, Vibration, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

const AnimatedIcon = ({ name, color, size, isEnabled, style, animationsEnabled = true }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animationsEnabled) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isEnabled, animationsEnabled]);

  return (
    <Animated.View style={[style, { transform: animationsEnabled ? [{ scale: scaleAnim }] : [] }]}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
};

const SettingToggle = ({ title, description, isEnabled, onToggle, iconName, children, animationsEnabled = true, styles }) => {
  const slideAnim = useRef(new Animated.Value(isEnabled ? 1 : 0)).current;
  const backgroundColorAnim = useRef(new Animated.Value(isEnabled ? 1 : 0)).current;

  useEffect(() => {
    if (animationsEnabled) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: isEnabled ? 1 : 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundColorAnim, {
          toValue: isEnabled ? 1 : 0,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      slideAnim.setValue(isEnabled ? 1 : 0);
      backgroundColorAnim.setValue(isEnabled ? 1 : 0);
    }
  }, [isEnabled, animationsEnabled]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  const backgroundColor = backgroundColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(60, 60, 70, 0.8)', 'rgba(179, 131, 255, 0.8)'],
  });

  const thumbColor = backgroundColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#9090A0', '#FFFFFF'],
  });

  return (
    <View style={styles.settingContainer}>
      <View style={styles.settingHeader}>
        <View style={styles.settingInfo}>
          <View style={styles.settingTitleRow}>
            <AnimatedIcon 
              name={iconName} 
              size={20} 
              color={isEnabled ? '#B383FF' : '#9090A0'} 
              isEnabled={isEnabled}
              style={styles.settingIcon}
              animationsEnabled={animationsEnabled}
            />
            <Text style={styles.settingTitle}>{title}</Text>
          </View>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
        <TouchableOpacity 
          style={styles.toggleContainer} 
          onPress={onToggle}
          activeOpacity={0.8}
        >
          <Animated.View style={[styles.toggleTrack, { backgroundColor }]}>
            <Animated.View 
              style={[
                styles.toggleThumb, 
                { 
                  backgroundColor: thumbColor,
                  transform: animationsEnabled ? [{ translateX }] : [{ translateX: isEnabled ? 22 : 2 }] 
                }
              ]} 
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
};

const FontSizeSlider = ({ value, onValueChange, styles }) => {
  const sizes = ['Small', 'Medium', 'Large', 'Extra Large'];
  const sizeValues = [12, 16, 20, 24];

  return (
    <View style={styles.sliderContainer}>
      <Text style={styles.sliderLabel}>Font Size: {sizes[value]}</Text>
      <View style={styles.sliderTrack}>
        {sizes.map((size, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.sliderDot,
              value === index && styles.sliderDotActive,
            ]}
            onPress={() => onValueChange(index)}
          >
            <Text style={[
              styles.sliderDotText,
              value === index && styles.sliderDotTextActive,
              { fontSize: sizeValues[index] * 0.8 }
            ]}>
              A
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const SoundSelector = ({ selectedSound, onSoundChange, styles }) => {
  const handleCustomSoundSelection = () => {
    Alert.alert(
      '🎵 Custom Ringtone',
      'To use a custom ringtone:\n\n1. Place your audio file in your device storage\n2. Go to your device Settings > Sounds & Haptics > Ringtone\n3. Select your custom audio file\n4. This app will use your device\'s notification sound setting',
      [
        { text: 'OK' },
        { 
          text: 'Use Default', 
          onPress: () => onSoundChange('default')
        }
      ]
    );
  };

  return (
    <View style={styles.soundContainer}>
      <Text style={styles.soundLabel}>Notification Sound</Text>
      <View style={styles.soundOptionsContainer}>
        <TouchableOpacity
          style={[
            styles.soundOption,
            selectedSound === 'default' && styles.soundOptionActive,
          ]}
          onPress={() => onSoundChange('default')}
        >
          <Ionicons 
            name="musical-notes" 
            size={24} 
            color={selectedSound === 'default' ? '#FFFFFF' : '#B383FF'} 
          />
          <Text style={[
            styles.soundOptionText,
            selectedSound === 'default' && styles.soundOptionTextActive,
          ]}>
            Default
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.customSoundOption}
          onPress={handleCustomSoundSelection}
        >
          <Ionicons 
            name="folder-open" 
            size={24} 
            color="#B383FF" 
          />
          <Text style={styles.customSoundOptionText}>
            Custom Ringtone
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const SecuritySection = ({ onDeviceManagement, onClearData, styles }) => {
  return (
    <View style={styles.securityContainer}>
      <View style={styles.sectionHeader}>
        <Ionicons name="shield-checkmark" size={20} color="#B383FF" style={styles.sectionIcon} />
        <Text style={styles.sectionTitle}>Security & Privacy</Text>
      </View>
      
      <TouchableOpacity style={styles.securityOption} onPress={onDeviceManagement}>
        <View style={styles.securityOptionContent}>
          <Ionicons name="phone-portrait" size={18} color="#C5AFFF" />
          <Text style={styles.securityOptionText}>Device Registration</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9090A0" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.securityOption} onPress={onClearData}>
        <View style={styles.securityOptionContent}>
          <Ionicons name="trash" size={18} color="#FF6B6B" />
          <Text style={[styles.securityOptionText, { color: '#FF6B6B' }]}>Clear All Data</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9090A0" />
      </TouchableOpacity>
    </View>
  );
};

export default function Settings({ visible, onClose, onSettingsChange, currentSettings }) {
  const [settings, setSettings] = useState({
    vibration: true,
    darkMode: true,
    animations: true,
    fontSize: 1, // 0=small, 1=medium, 2=large, 3=xl
    notificationSound: 'default',
  });

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (currentSettings) {
      setSettings(prev => ({ ...prev, ...currentSettings }));
    }
  }, [currentSettings]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

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

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('tgift_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      onSettingsChange?.(newSettings);
    } catch (error) {
      console.log('Failed to save settings:', error);
    }
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    
    // Add a small delay for dark mode toggle to show visual feedback
    if (key === 'darkMode' && settings.animations) {
      setTimeout(() => {
        saveSettings(newSettings);
      }, 100);
    } else {
      saveSettings(newSettings);
    }
  };

  const handleDeviceManagement = async () => {
    try {
      // Get current device info
      const deviceInfo = await AsyncStorage.getItem('device_info');
      const registeredDevices = await AsyncStorage.getItem('registered_devices') || '[]';
      const parsedDevices = JSON.parse(registeredDevices);
      
      Alert.alert(
        '🔐 Device Management',
        `Current Device: ${Device.modelName || 'Unknown'}\nRegistered Devices: ${parsedDevices.length}\n\nWould you like to:`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'View Devices', 
            onPress: () => {
              Alert.alert(
                'Registered Devices',
                parsedDevices.length > 0 
                  ? parsedDevices.map((device, index) => `${index + 1}. ${device.name || 'Unknown Device'}`).join('\n')
                  : 'No devices registered yet.'
              );
            }
          },
          {
            text: 'Register This Device',
            onPress: async () => {
              try {
                const newDevice = {
                  id: Date.now().toString(),
                  name: Device.modelName || 'Unknown Device',
                  registeredAt: new Date().toISOString()
                };
                const updatedDevices = [...parsedDevices, newDevice];
                await AsyncStorage.setItem('registered_devices', JSON.stringify(updatedDevices));
                Alert.alert('✅ Success', 'Device registered successfully!');
              } catch (error) {
                Alert.alert('❌ Error', 'Failed to register device.');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to access device management.');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      '🗑️ Clear All Data',
      'This will reset the app to its default state:\n\n• All cached notifications will be removed\n• App settings will be reset to defaults\n• Device registration will be cleared\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset App', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all AsyncStorage data
              await AsyncStorage.clear();
              
              // Reset settings to default
              const defaultSettings = {
                vibration: true,
                darkMode: true,
                animations: true,
                fontSize: 1,
                notificationSound: 'default',
              };
              
              await AsyncStorage.setItem('tgift_settings', JSON.stringify(defaultSettings));
              setSettings(defaultSettings);
              
              Alert.alert(
                '✅ App Reset Complete', 
                'The app has been reset to its default state successfully.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Close settings modal and refresh the app
                      onClose();
                      if (onSettingsChange) {
                        onSettingsChange(defaultSettings);
                      }
                    }
                  }
                ]
              );
            } catch (error) {
              Alert.alert('❌ Error', 'Failed to reset app data. Please try again.');
              console.error('Clear data error:', error);
            }
          }
        }
      ]
    );
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  if (!visible) return null;

  const styles = getSettingsStyles(settings);

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
        <LinearGradient
          colors={settings.darkMode ? ['rgba(20, 15, 35, 0.98)', 'rgba(11, 11, 20, 0.98)'] : ['rgba(248, 249, 250, 0.98)', 'rgba(240, 242, 247, 0.98)']}
          style={styles.gradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerTitleContainer}>
                <Ionicons name="settings" size={24} color="#B383FF" style={styles.headerIcon} />
                <Text style={styles.headerTitle}>Settings</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={settings.darkMode ? "#FFFFFF" : "#1A1A1A"} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Notification Settings */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="notifications" size={20} color="#B383FF" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Notifications</Text>
              </View>

              <SettingToggle
                title="Vibration"
                description="Vibrate when gift notifications arrive"
                isEnabled={settings.vibration}
                onToggle={() => updateSetting('vibration', !settings.vibration)}
                iconName={settings.vibration ? "phone-portrait" : "phone-portrait-outline"}
                animationsEnabled={settings.animations}
                styles={styles}
              />

              <View style={styles.settingContainer}>
                <View style={styles.settingHeader}>
                  <View style={styles.settingInfo}>
                    <View style={styles.settingTitleRow}>
                      <Ionicons name="volume-high" size={20} color="#B383FF" style={styles.settingIcon} />
                      <Text style={styles.settingTitle}>Gift Notification Sound</Text>
                    </View>
                    <Text style={styles.settingDescription}>Choose notification sound for gift alerts</Text>
                  </View>
                </View>
                <SoundSelector 
                  selectedSound={settings.notificationSound}
                  onSoundChange={(sound) => updateSetting('notificationSound', sound)}
                  styles={styles}
                />
              </View>
            </View>

            {/* Appearance Settings */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="color-palette" size={20} color="#B383FF" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Appearance</Text>
              </View>

              <SettingToggle
                title="Dark Mode"
                description="Use dark theme throughout the app"
                isEnabled={settings.darkMode}
                onToggle={() => updateSetting('darkMode', !settings.darkMode)}
                iconName={settings.darkMode ? "moon" : "sunny"}
                animationsEnabled={settings.animations}
                styles={styles}
              />

              <SettingToggle
                title="Animations"
                description="Enable smooth animations and transitions"
                isEnabled={settings.animations}
                onToggle={() => updateSetting('animations', !settings.animations)}
                iconName={settings.animations ? "play-circle" : "pause-circle"}
                animationsEnabled={settings.animations}
                styles={styles}
              />

              <View style={styles.fontSizeContainer}>
                <FontSizeSlider 
                  value={settings.fontSize}
                  onValueChange={(value) => updateSetting('fontSize', value)}
                  styles={styles}
                />
              </View>
            </View>

            {/* Security & Privacy */}
            <SecuritySection 
              onDeviceManagement={handleDeviceManagement}
              onClearData={handleClearData}
              styles={styles}
            />

            {/* App Info */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle" size={20} color="#B383FF" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>About</Text>
              </View>
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>Prototype-G v1.0.0</Text>
                <Text style={styles.infoSubtext}>Gift Detection & Alert System</Text>
                <View style={styles.telegramChannelContainer}>
                  <Ionicons name="paper-plane" size={16} color="#B383FF" style={styles.telegramIcon} />
                  <Text style={styles.telegramChannelText}>Our Official Telegram Channel </Text>
                  <TouchableOpacity 
                    onPress={() => Linking.openURL('https://t.me/PrototypeGifts')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.telegramChannelLink}>@PrototypeGifts</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.infoSubtext}>Made with JavaScript And Hope</Text>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const getSettingsStyles = (settingsTheme) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 175, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: settingsTheme.darkMode ? '#FFFFFF' : '#1A1A1A',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: settingsTheme.darkMode ? 'rgba(197, 175, 255, 0.1)' : 'rgba(179, 131, 255, 0.2)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: settingsTheme.darkMode ? '#FFFFFF' : '#1A1A1A',
    letterSpacing: -0.3,
  },
  settingContainer: {
    backgroundColor: settingsTheme.darkMode ? 'rgba(30, 20, 50, 0.6)' : 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: settingsTheme.darkMode ? 'rgba(197, 175, 255, 0.1)' : 'rgba(179, 131, 255, 0.2)',
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingIcon: {
    marginRight: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: settingsTheme.darkMode ? '#FFFFFF' : '#1A1A1A',
    letterSpacing: -0.2,
  },
  settingDescription: {
    fontSize: 14,
    color: settingsTheme.darkMode ? '#B0B0C0' : '#495057',
    lineHeight: 20,
  },
  toggleContainer: {
    padding: 4,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderContainer: {
    marginTop: 16,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: settingsTheme.darkMode ? '#FFFFFF' : '#1A1A1A',
    marginBottom: 12,
  },
  sliderTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(60, 60, 70, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(197, 175, 255, 0.2)',
  },
  sliderDotActive: {
    backgroundColor: 'rgba(179, 131, 255, 0.8)',
    borderColor: '#B383FF',
  },
  sliderDotText: {
    fontWeight: '600',
    color: '#9090A0',
  },
  sliderDotTextActive: {
    color: '#FFFFFF',
  },
  soundContainer: {
    marginTop: 16,
  },
  soundLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: settingsTheme.darkMode ? '#FFFFFF' : '#1A1A1A',
    marginBottom: 12,
  },
  soundOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  soundOption: {
    backgroundColor: settingsTheme.darkMode ? 'rgba(60, 60, 70, 0.8)' : 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: settingsTheme.darkMode ? 'rgba(197, 175, 255, 0.2)' : 'rgba(179, 131, 255, 0.4)',
    flex: 1,
    marginRight: 8,
  },
  customSoundOption: {
    backgroundColor: settingsTheme.darkMode ? 'rgba(60, 60, 70, 0.8)' : 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: settingsTheme.darkMode ? 'rgba(197, 175, 255, 0.2)' : 'rgba(179, 131, 255, 0.4)',
    flex: 1,
    marginLeft: 8,
  },
  customSoundOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B383FF',
    marginTop: 4,
    textAlign: 'center',
  },
  soundOptionActive: {
    backgroundColor: 'rgba(179, 131, 255, 0.8)',
    borderColor: '#B383FF',
  },
  soundOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B383FF',
    marginTop: 4,
    textAlign: 'center',
  },
  soundOptionTextActive: {
    color: '#FFFFFF',
  },
  fontSizeContainer: {
    backgroundColor: settingsTheme.darkMode ? 'rgba(30, 20, 50, 0.6)' : 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: settingsTheme.darkMode ? 'rgba(197, 175, 255, 0.1)' : 'rgba(179, 131, 255, 0.2)',
  },
  securityContainer: {
    backgroundColor: settingsTheme.darkMode ? 'rgba(30, 20, 50, 0.6)' : 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: settingsTheme.darkMode ? 'rgba(197, 175, 255, 0.1)' : 'rgba(179, 131, 255, 0.2)',
  },
  securityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 175, 255, 0.1)',
  },
  securityOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: settingsTheme.darkMode ? '#FFFFFF' : '#1A1A1A',
    marginLeft: 12,
  },
  infoContainer: {
    backgroundColor: settingsTheme.darkMode ? 'rgba(30, 20, 50, 0.6)' : 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: settingsTheme.darkMode ? 'rgba(197, 175, 255, 0.1)' : 'rgba(179, 131, 255, 0.2)',
  },
  infoText: {
    fontSize: 18,
    fontWeight: '700',
    color: settingsTheme.darkMode ? '#FFFFFF' : '#1A1A1A',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: settingsTheme.darkMode ? '#B0B0C0' : '#495057',
    marginBottom: 2,
  },
  telegramChannelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(179, 131, 255, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(179, 131, 255, 0.3)',
    marginVertical: 8,
    flexWrap: 'wrap',
  },
  telegramIcon: {
    marginRight: 8,
  },
  telegramChannelText: {
    fontSize: 14,
    color: settingsTheme.darkMode ? '#FFFFFF' : '#1A1A1A',
    fontWeight: '600',
  },
  telegramChannelLink: {
    fontSize: 14,
    color: '#B383FF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
