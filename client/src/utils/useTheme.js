import { useEffect } from 'react';

// theme: 'neutral' | 'examiner' | 'student'
export const useTheme = (theme) => {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
};