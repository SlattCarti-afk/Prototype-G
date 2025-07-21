
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform, Alert, Vibration, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { useLanguage } from './contexts/LanguageContext';

const AnimatedIcon = ({ name, color, size, isEnabled, style, animationsEnabled = true, settingKey, lastChangedSetting }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Only animate if this specific setting was the one that changed
    if (animationsEnabled && lastChangedSetting === settingKey) {
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
  }, [lastChangedSetting, animationsEnabled, settingKey]);

  return (
    <Animated.View style={[style, { transform: animationsEnabled ? [{ scale: scaleAnim }] : [] }]}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
};

const SettingToggle = ({ title, description, isEnabled, onToggle, iconName, children, animationsEnabled = true, styles, settingKey, lastChangedSetting }) => {
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
              settingKey={settingKey}
              lastChangedSetting={lastChangedSetting}
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

const FontSizeSlider = ({ value, onValueChange, styles, t }) => {
  const sizes = [t('small'), t('medium'), t('large'), t('extraLarge')];
  const sizeValues = [12, 16, 20, 24];

  return (
    <View style={styles.sliderContainer}>
      <Text style={styles.sliderLabel}>{t('fontSize')}: {sizes[value]}</Text>
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

const LanguageSelector = ({ selectedLanguage, onLanguageChange, styles, t }) => {
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' }
  ];

  return (
    <View style={styles.languageContainer}>
      <Text style={styles.languageLabel}>{t('language')}</Text>
      <View style={styles.languageOptionsContainer}>
        {languages.map((language) => (
          <TouchableOpacity
            key={language.code}
            style={[
              styles.languageOption,
              selectedLanguage === language.code && styles.languageOptionActive,
            ]}
            onPress={() => onLanguageChange(language.code)}
          >
            <Text style={styles.languageFlag}>{language.flag}</Text>
            <Text style={[
              styles.languageOptionText,
              selectedLanguage === language.code && styles.languageOptionTextActive,
            ]}>
              {language.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const SoundSelector = ({ selectedSound, onSoundChange, styles, t }) => {
  const handleCustomSoundSelection = () => {
    Alert.alert(
      t('customRingtoneTitle'),
      t('customRingtoneMessage'),
      [
        { text: t('ok') },
        { 
          text: t('useDefault'), 
          onPress: () => onSoundChange('default')
        }
      ]
    );
  };

  return (
    <View style={styles.soundContainer}>
      <Text style={styles.soundLabel}>{t('giftNotificationSound')}</Text>
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
            {t('default')}
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
            {t('customRingtone')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const SecuritySection = ({ onDeviceManagement, onClearData, styles, t }) => {
  return (
    <View style={styles.securityContainer}>
      <View style={styles.sectionHeader}>
        <Ionicons name="shield-checkmark" size={20} color="#B383FF" style={styles.sectionIcon} />
        <Text style={styles.sectionTitle}>{t('securityPrivacy')}</Text>
      </View>
      
      <TouchableOpacity style={styles.securityOption} onPress={onDeviceManagement}>
        <View style={styles.securityOptionContent}>
          <Ionicons name="phone-portrait" size={18} color="#C5AFFF" />
          <Text style={styles.securityOptionText}>{t('deviceRegistration')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9090A0" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.securityOption} onPress={onClearData}>
        <View style={styles.securityOptionContent}>
          <Ionicons name="trash" size={18} color="#FF6B6B" />
          <Text style={[styles.securityOptionText, { color: '#FF6B6B' }]}>{t('clearAllData')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9090A0" />
      </TouchableOpacity>
    </View>
  );
};

export default function Settings({ visible, onClose, onSettingsChange, currentSettings }) {
  const { t, currentLanguage, changeLanguage } = useLanguage();
  const [settings, setSettings] = useState({
    vibration: true,
    darkMode: true,
    animations: true,
    fontSize: 1, // 0=small, 1=medium, 2=large, 3=xl
    notificationSound: 'default',
  });
  const [lastChangedSetting, setLastChangedSetting] = useState(null);

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
    setLastChangedSetting(key);
    
    // Clear the lastChangedSetting after animation completes
    setTimeout(() => {
      setLastChangedSetting(null);
    }, 300);
    
    saveSettings(newSettings);
  };

  const handleDeviceManagement = async () => {
    try {
      // Get current device info
      const deviceInfo = await AsyncStorage.getItem('device_info');
      const registeredDevices = await AsyncStorage.getItem('registered_devices') || '[]';
      const parsedDevices = JSON.parse(registeredDevices);
      
      Alert.alert(
        t('deviceManagement'),
        `${t('currentDevice', { device: Device.modelName || 'Unknown' })}\n${t('registeredDevices', { count: parsedDevices.length })}\n\n${t('deviceManagementOptions')}`,
        [
          { text: t('cancel'), style: 'cancel' },
          { 
            text: t('viewDevices'), 
            onPress: () => {
              Alert.alert(
                t('registeredDevicesTitle'),
                parsedDevices.length > 0 
                  ? parsedDevices.map((device, index) => `${index + 1}. ${device.name || 'Unknown Device'}`).join('\n')
                  : t('noDevicesRegistered')
              );
            }
          },
          {
            text: t('registerDevice'),
            onPress: async () => {
              try {
                const newDevice = {
                  id: Date.now().toString(),
                  name: Device.modelName || 'Unknown Device',
                  registeredAt: new Date().toISOString()
                };
                const updatedDevices = [...parsedDevices, newDevice];
                await AsyncStorage.setItem('registered_devices', JSON.stringify(updatedDevices));
                Alert.alert(t('deviceRegistrationSuccess'), t('deviceRegistered'));
              } catch (error) {
                Alert.alert(t('deviceRegistrationError'), t('deviceRegistrationFailed'));
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert(t('deviceRegistrationError'), t('deviceManagementError'));
    }
  };

  const handleClearData = () => {
    Alert.alert(
      t('clearDataTitle'),
      t('clearDataMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('resetApp'), 
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
                t('appResetComplete'), 
                t('appResetSuccess'),
                [
                  {
                    text: t('ok'),
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
              Alert.alert(t('appResetError'), t('appResetFailed'));
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
                <Text style={styles.headerTitle}>{t('settings')}</Text>
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
                <Text style={styles.sectionTitle}>{t('notifications')}</Text>
              </View>

              <SettingToggle
                title={t('vibration')}
                description={t('vibrationDesc')}
                isEnabled={settings.vibration}
                onToggle={() => updateSetting('vibration', !settings.vibration)}
                iconName={settings.vibration ? "phone-portrait" : "phone-portrait-outline"}
                animationsEnabled={settings.animations}
                styles={styles}
                settingKey="vibration"
                lastChangedSetting={lastChangedSetting}
              />

              <View style={styles.settingContainer}>
                <View style={styles.settingHeader}>
                  <View style={styles.settingInfo}>
                    <View style={styles.settingTitleRow}>
                      <Ionicons name="volume-high" size={20} color="#B383FF" style={styles.settingIcon} />
                      <Text style={styles.settingTitle}>{t('giftNotificationSound')}</Text>
                    </View>
                    <Text style={styles.settingDescription}>{t('giftNotificationSoundDesc')}</Text>
                  </View>
                </View>
                <SoundSelector 
                  selectedSound={settings.notificationSound}
                  onSoundChange={(sound) => updateSetting('notificationSound', sound)}
                  styles={styles}
                  t={t}
                />
              </View>
            </View>

            {/* Appearance Settings */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="color-palette" size={20} color="#B383FF" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>{t('appearance')}</Text>
              </View>

              <SettingToggle
                title={t('darkMode')}
                description={t('darkModeDesc')}
                isEnabled={settings.darkMode}
                onToggle={() => updateSetting('darkMode', !settings.darkMode)}
                iconName={settings.darkMode ? "moon" : "sunny"}
                animationsEnabled={settings.animations}
                styles={styles}
                settingKey="darkMode"
                lastChangedSetting={lastChangedSetting}
              />

              <SettingToggle
                title={t('animations')}
                description={t('animationsDesc')}
                isEnabled={settings.animations}
                onToggle={() => updateSetting('animations', !settings.animations)}
                iconName={settings.animations ? "play-circle" : "pause-circle"}
                animationsEnabled={settings.animations}
                styles={styles}
                settingKey="animations"
                lastChangedSetting={lastChangedSetting}
              />

              <View style={styles.fontSizeContainer}>
                <FontSizeSlider 
                  value={settings.fontSize}
                  onValueChange={(value) => updateSetting('fontSize', value)}
                  styles={styles}
                  t={t}
                />
              </View>

              <View style={styles.languageContainer}>
                <LanguageSelector 
                  selectedLanguage={currentLanguage}
                  onLanguageChange={changeLanguage}
                  styles={styles}
                  t={t}
                />
              </View>
            </View>

            {/* Security & Privacy */}
            <SecuritySection 
              onDeviceManagement={handleDeviceManagement}
              onClearData={handleClearData}
              styles={styles}
              t={t}
            />

            {/* App Info */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle" size={20} color="#B383FF" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>{t('about')}</Text>
              </View>
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>{t('appVersion')}</Text>
                <Text style={styles.infoSubtext}>{t('appDescription')}</Text>
                <View style={styles.telegramChannelContainer}>
                  <Ionicons name="paper-plane" size={16} color="#B383FF" style={styles.telegramIcon} />
                  <Text style={styles.telegramChannelText}>{t('telegramChannel')}</Text>
                  <TouchableOpacity 
                    onPress={() => Linking.openURL('https://t.me/PrototypeGifts')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.telegramChannelLink}>{t('telegramChannelLink')}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.infoSubtext}>{t('madeWith')}</Text>
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
  languageContainer: {
    backgroundColor: settingsTheme.darkMode ? 'rgba(30, 20, 50, 0.6)' : 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: settingsTheme.darkMode ? 'rgba(197, 175, 255, 0.1)' : 'rgba(179, 131, 255, 0.2)',
  },
  languageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: settingsTheme.darkMode ? '#FFFFFF' : '#1A1A1A',
    marginBottom: 12,
  },
  languageOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  languageOption: {
    backgroundColor: settingsTheme.darkMode ? 'rgba(60, 60, 70, 0.8)' : 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    borderWidth: 1,
    borderColor: settingsTheme.darkMode ? 'rgba(197, 175, 255, 0.2)' : 'rgba(179, 131, 255, 0.4)',
    flex: 1,
  },
  languageOptionActive: {
    backgroundColor: 'rgba(179, 131, 255, 0.8)',
    borderColor: '#B383FF',
  },
  languageFlag: {
    fontSize: 20,
    marginBottom: 4,
  },
  languageOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B383FF',
    textAlign: 'center',
  },
  languageOptionTextActive: {
    color: '#FFFFFF',
  },
});
