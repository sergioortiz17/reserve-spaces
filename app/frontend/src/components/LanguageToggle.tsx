import React from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LanguageToggle: React.FC = () => {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center space-x-2"
      title={i18n.language === 'en' ? t('language.spanish') : t('language.english')}
    >
      <Languages className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
        {i18n.language === 'en' ? 'ES' : 'EN'}
      </span>
    </button>
  );
};

export default LanguageToggle;
