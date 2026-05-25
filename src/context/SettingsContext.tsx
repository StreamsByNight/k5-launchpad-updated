import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { HomePage, ThemeId } from '../types';

interface Settings {
  timeZone: string;
  defaultHomePage: HomePage;
  theme: ThemeId;
}

interface SettingsContextValue extends Settings {
  setTimeZone: (tz: string) => void;
  setDefaultHomePage: (page: HomePage) => void;
  setTheme: (theme: ThemeId) => void;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const STORAGE_KEY = 'k5-dashboard-settings';

const defaultSettings: Settings = {
  timeZone: 'America/New_York',
  defaultHomePage: 'courses',
  theme: 'nature',
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
    } catch {
      /* ignore */
    }
    return defaultSettings;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.dataset.theme = settings.theme;
  }, [settings]);

  const value: SettingsContextValue = {
    ...settings,
    settingsOpen,
    setTimeZone: (timeZone) => setSettings((s) => ({ ...s, timeZone })),
    setDefaultHomePage: (defaultHomePage) => setSettings((s) => ({ ...s, defaultHomePage })),
    setTheme: (theme) => setSettings((s) => ({ ...s, theme })),
    openSettings: () => setSettingsOpen(true),
    closeSettings: () => setSettingsOpen(false),
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
