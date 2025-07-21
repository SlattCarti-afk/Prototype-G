
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AnimatedIcon = ({ name, color, size, isEnabled, style }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(rotateAnim, {
      toValue: isEnabled ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isEnabled]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[style, { transform: [{ scale: scaleAnim }, { rotate }] }]}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
};

const SettingToggle = ({ title, description, isEnabled, onToggle, iconName, children }) => {
  const slideAnim = useRef(new Animated.Value(isEnabled ? 1 : 0)).current;
  const backgroundColorAnim = useRef(new Animated.Value(isEnabled ? 1 : 0)).current;

  useEffect(() => {
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
  }, [isEnabled]);

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
                  transform: [{ translateX }] 
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

const FontSizeSlider = ({ value, onValueChange }) => {
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

const SoundSelector = ({ selectedSound, onSoundChange }) => {
  const sounds = [
    { name: 'Default', file: 'default', icon: 'musical-notes' },
    { name: 'Bell Chime', file: 'bell', icon: 'notifications' },
    { name: 'Digital Alert', file: 'digital', icon: 'radio' },
    { name: 'Gentle Tone', file: 'gentle', icon: 'heart' },
  ];

  return (
    <View style={styles.soundContainer}>
      <Text style={styles.soundLabel}>Notification Sound</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.soundScroll}>
        {sounds.map((sound, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.soundOption,
              selectedSound === sound.file && styles.soundOptionActive,
            ]}
            onPress={() => onSoundChange(sound.file)}
          >
            <Ionicons 
              name={sound.icon} 
              size={24} 
              color={selectedSound === sound.file ? '#FFFFFF' : '#B383FF'} 
            />
            <Text style={[
              styles.soundOptionText,
              selectedSound === sound.file && styles.soundOptionTextActive,
            ]}>
              {sound.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const SecuritySection = ({ onDeviceManagement, onPrivacyPolicy, onClearData }) => {
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

      <TouchableOpacity style={styles.securityOption} onPress={onPrivacyPolicy}>
        <View style={styles.securityOptionContent}>
          <Ionicons name="document-text" size={18} color="#C5AFFF" />
          <Text style={styles.securityOptionText}>Privacy Policy</Text>
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

export default function Settings({ visible, onClose, onSettingsChange }) {
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
    saveSettings(newSettings);
  };

  const handleDeviceManagement = () => {
    Alert.alert(
      '🔐 Device Registration',
      'This feature will be available soon. You will be able to manage your registered devices and access keys here.',
      [{ text: 'OK' }]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      '📋 Privacy Policy',
      'Your privacy is important to us. We only collect necessary data for gift notifications and do not share your information with third parties.',
      [{ text: 'OK' }]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      '🗑️ Clear All Data',
      'This will remove all cached notifications and reset settings to default. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              setSettings({
                vibration: true,
                darkMode: true,
                animations: true,
                fontSize: 1,
                notificationSound: 'default',
              });
              Alert.alert('✅ Success', 'All data has been cleared.');
            } catch (error) {
              Alert.alert('❌ Error', 'Failed to clear data.');
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

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
        <LinearGradient
          colors={['rgba(20, 15, 35, 0.98)', 'rgba(11, 11, 20, 0.98)']}
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
                <Ionicons name="close" size={24} color="#FFFFFF" />
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
              />

              <SettingToggle
                title="Gift Notification Sound"
                description="Play custom sound for gift alerts"
                isEnabled={settings.notificationSound !== 'off'}
                onToggle={() => updateSetting('notificationSound', settings.notificationSound === 'off' ? 'default' : 'off')}
                iconName={settings.notificationSound !== 'off' ? "volume-high" : "volume-mute"}
              >
                {settings.notificationSound !== 'off' && (
                  <SoundSelector 
                    selectedSound={settings.notificationSound}
                    onSoundChange={(sound) => updateSetting('notificationSound', sound)}
                  />
                )}
              </SettingToggle>
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
              />

              <SettingToggle
                title="Animations"
                description="Enable smooth animations and transitions"
                isEnabled={settings.animations}
                onToggle={() => updateSetting('animations', !settings.animations)}
                iconName={settings.animations ? "play-circle" : "pause-circle"}
              />

              <View style={styles.fontSizeContainer}>
                <FontSizeSlider 
                  value={settings.fontSize}
                  onValueChange={(value) => updateSetting('fontSize', value)}
                />
              </View>
            </View>

            {/* Security & Privacy */}
            <SecuritySection 
              onDeviceManagement={handleDeviceManagement}
              onPrivacyPolicy={handlePrivacyPolicy}
              onClearData={handleClearData}
            />

            {/* App Info */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle" size={20} color="#B383FF" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>About</Text>
              </View>
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>TGift v1.0.0</Text>
                <Text style={styles.infoSubtext}>Gift Detection & Alert System</Text>
                <Text style={styles.infoSubtext}>Built with ❤️ for the community</Text>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(197, 175, 255, 0.1)',
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
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  settingContainer: {
    backgroundColor: 'rgba(30, 20, 50, 0.6)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(197, 175, 255, 0.1)',
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
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#B0B0C0',
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    marginBottom: 12,
  },
  soundScroll: {
    flexDirection: 'row',
  },
  soundOption: {
    backgroundColor: 'rgba(60, 60, 70, 0.8)',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(197, 175, 255, 0.2)',
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
    backgroundColor: 'rgba(30, 20, 50, 0.6)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(197, 175, 255, 0.1)',
  },
  securityContainer: {
    backgroundColor: 'rgba(30, 20, 50, 0.6)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(197, 175, 255, 0.1)',
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
    color: '#FFFFFF',
    marginLeft: 12,
  },
  infoContainer: {
    backgroundColor: 'rgba(30, 20, 50, 0.6)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 175, 255, 0.1)',
  },
  infoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#B0B0C0',
    marginBottom: 2,
  },
});
