import { createContext, useContext, useState, useEffect } from 'react';
import { get } from '../api/client';

const ThemeContext = createContext(null);

const DEFAULTS = {
  app_name: 'Pocket PRC',
  primary_color: '#b91c1c',
  primary_hover_color: '#991b1b',
  secondary_color: '#fbbf24',
  surface_color: '#ffffff',
  text_on_primary: '#ffffff',
  brokerage_name: 'Keller Williams Realty of Maine',
  logo_url: null,
};

export function ThemeProvider({ children }) {
  const [brandConfig, setBrandConfig] = useState(DEFAULTS);

  useEffect(() => {
    get('/api/branding')
      .then((data) => {
        const merged = { ...DEFAULTS, ...data };
        setBrandConfig(merged);
        applyTheme(merged);
      })
      .catch(() => {
        applyTheme(DEFAULTS);
      });
  }, []);

  return (
    <ThemeContext.Provider value={{ brandConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyTheme(config) {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', config.primary_color);
  root.style.setProperty('--brand-primary-hover', config.primary_hover_color);
  root.style.setProperty('--brand-secondary', config.secondary_color);
  root.style.setProperty('--brand-surface', config.surface_color);
  root.style.setProperty('--brand-text-on-primary', config.text_on_primary);
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
