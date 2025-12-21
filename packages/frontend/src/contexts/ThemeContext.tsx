import React, { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { Theme } from '../types';

const gmailTheme: Theme = {
  name: 'gmail',
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

const outlookTheme: Theme = {
  name: 'outlook',
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

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (theme: 'gmail' | 'outlook') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(gmailTheme);

  const setTheme = (themeName: 'gmail' | 'outlook') => {
    setCurrentTheme(themeName === 'gmail' ? gmailTheme : outlookTheme);
    localStorage.setItem('theme', themeName);
  };

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'gmail' | 'outlook' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'light',
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
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
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
