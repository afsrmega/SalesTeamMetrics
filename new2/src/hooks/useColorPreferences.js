import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getDefaultColors } from '@/lib/userColorPreferencesService';

/**
 * Hook to apply user color preferences to CSS variables.
 * Retrieves preferences from AuthContext and updates the DOM.
 */
export const useColorPreferences = () => {
  const { userColorPreferences } = useAuth();
  const [currentColors, setCurrentColors] = useState(getDefaultColors());

  useEffect(() => {
    const colors = userColorPreferences || getDefaultColors();
    setCurrentColors(colors);

    const root = document.documentElement;

    // Helper to set variable
    const setVar = (name, value) => {
      root.style.setProperty(name, value);
    };

    setVar('--color-primary', colors.primary_color);
    setVar('--color-secondary', colors.secondary_color);
    setVar('--color-accent', colors.accent_color);
    setVar('--color-background', colors.background_color);
    setVar('--color-text', colors.text_color);

    // Also set some derived values for convenience if needed (e.g. RGB for opacity)
    // For now, simple hex values are sufficient for the requirement.

  }, [userColorPreferences]);

  return currentColors;
};