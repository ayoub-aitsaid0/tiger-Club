'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Update direction and lang on language change
    const updateDir = (lng: string) => {
      document.documentElement.dir = i18n.dir(lng);
      document.documentElement.lang = lng;
    };
    
    // Initial setup
    updateDir(i18n.language);

    i18n.on('languageChanged', updateDir);
    return () => {
      i18n.off('languageChanged', updateDir);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
