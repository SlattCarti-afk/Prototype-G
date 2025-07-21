
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import translations, { formatString, getRussianPlural } from '../i18n/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ru')) {
        setCurrentLanguage(savedLanguage);
      }
    } catch (error) {
      console.log('Failed to load saved language:', error);
    }
    setIsLoading(false);
  };

  const changeLanguage = async (languageCode) => {
    try {
      await AsyncStorage.setItem('app_language', languageCode);
      setCurrentLanguage(languageCode);
    } catch (error) {
      console.log('Failed to save language:', error);
    }
  };

  const t = (key, values = {}) => {
    const translation = translations[currentLanguage]?.[key] || translations['en'][key] || key;
    return formatString(translation, values);
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMs = now - notificationTime;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      if (currentLanguage === 'ru') {
        const dayForms = ['день', 'дня', 'дней'];
        const plural = getRussianPlural(diffInDays, dayForms);
        return t('daysAgo', { days: diffInDays, plural });
      } else {
        const plural = diffInDays === 1 ? '' : 's';
        return t('daysAgo', { days: diffInDays, plural });
      }
    } else if (diffInHours > 0) {
      if (currentLanguage === 'ru') {
        const hourForms = ['', 'а', 'ов'];
        const plural = getRussianPlural(diffInHours, hourForms);
        return t('hoursAgo', { hours: diffInHours, plural });
      } else {
        const plural = diffInHours === 1 ? '' : 's';
        return t('hoursAgo', { hours: diffInHours, plural });
      }
    } else {
      return t('justNow');
    }
  };

  const value = {
    currentLanguage,
    changeLanguage,
    t,
    getRelativeTime,
    isLoading
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
