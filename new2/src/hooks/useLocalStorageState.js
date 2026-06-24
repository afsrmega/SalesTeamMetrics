
import { useState, useEffect } from 'react';

export function useLocalStorageState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const value = window.localStorage.getItem(key);
      if (value !== null) {
        return JSON.parse(value);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
}
