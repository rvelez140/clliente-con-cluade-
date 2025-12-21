import React, { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { Theme } from '../types';

const gmailLightTheme: Theme = {
  name: 'gmail',
  mode: 'light',
  colors: {
    primary: '#1a73e8',
    secondary: '#ea4335',
    background: '#f6f8fc',
    surface: '#ffffff',
    text: '#202124',
    textSecondary: '#5f6368',
    border: '#dadce0',
    hover: '#f1f3f4',
  },
};

const gmailDarkTheme: Theme = {
  name: 'gmail',
  mode: 'dark',
  colors: {
    primary: '#8ab4f8',
    secondary: '#f28b82',
    background: '#1f1f1f',
    surface: '#2d2d2d',
    text: '#e8eaed',
    textSecondary: '#9aa0a6',
    border: '#3c4043',
    hover: '#3c4043',
  },
};

const outlookLightTheme: Theme = {
  name: 'outlook',
  mode: 'light',
  colors: {
    primary: '#0078d4',
    secondary: '#106ebe',
    background: '#faf9f8',
    surface: '#ffffff',
    text: '#323130',
    textSecondary: '#605e5c',
    border: '#edebe9',
    hover: '#f3f2f1',
  },
};

const outlookDarkTheme: Theme = {
  name: 'outlook',
  mode: 'dark',
  colors: {
    primary: '#4a9eff',
    secondary: '#5ba3ff',
    background: '#1a1a1a',
    surface: '#2d2d2d',
    text: '#f3f2f1',
    textSecondary: '#c8c6c4',
    border: '#3b3a39',
    hover: '#3b3a39',
  },
};

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (theme: 'gmail' | 'outlook') => void;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getTheme = (name: 'gmail' | 'outlook', mode: 'light' | 'dark'): Theme => {
  if (name === 'gmail') {
    return mode === 'dark' ? gmailDarkTheme : gmailLightTheme;
  }
  return mode === 'dark' ? outlookDarkTheme : outlookLightTheme;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeName, setThemeName] = useState<'gmail' | 'outlook'>('gmail');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const currentTheme = useMemo(() => getTheme(themeName, isDarkMode ? 'dark' : 'light'), [themeName, isDarkMode]);

  const setTheme = (name: 'gmail' | 'outlook') => {
    setThemeName(name);
    localStorage.setItem('themeName', name);
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
  };

  React.useEffect(() => {
    const savedThemeName = localStorage.getItem('themeName') as 'gmail' | 'outlook' | null;
    const savedDarkMode = localStorage.getItem('darkMode');

    if (savedThemeName) {
      setThemeName(savedThemeName);
    }

    if (savedDarkMode !== null) {
      setIsDarkMode(savedDarkMode === 'true');
    }
  }, []);

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: currentTheme.mode,
          primary: {
            main: currentTheme.colors.primary,
          },
          secondary: {
            main: currentTheme.colors.secondary,
          },
          background: {
            default: currentTheme.colors.background,
            paper: currentTheme.colors.surface,
          },
          text: {
            primary: currentTheme.colors.text,
            secondary: currentTheme.colors.textSecondary,
          },
        },
        typography: {
          fontFamily: currentTheme.name === 'gmail'
            ? '"Roboto", "Helvetica", "Arial", sans-serif'
            : '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
        },
      }),
    [currentTheme]
  );

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, toggleDarkMode, isDarkMode }}>
      <MuiThemeProvider theme={muiTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
