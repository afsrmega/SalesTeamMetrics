import { useState, useCallback, useEffect } from 'react';
import { fetchGlobalSettings, saveGlobalSettings, validateSettings } from '@/lib/globalSettingsService';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useGlobalSettings = () => {
  const { user, globalSettings: contextSettings, setGlobalSettingsState } = useAuth();
  
  // Local state for the hook, initialized with context if available
  const [settings, setSettings] = useState(contextSettings || null);
  const [loading, setLoading] = useState(!contextSettings);
  const [error, setError] = useState(null);

  // Sync with context updates
  useEffect(() => {
    if (contextSettings) {
      setSettings(contextSettings);
      setLoading(false);
    }
  }, [contextSettings]);

  const getSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchGlobalSettings(user.id);
      setSettings(data);
      setGlobalSettingsState(data); // Update context as well
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, setGlobalSettingsState]);

  const updateSettings = useCallback(async (newSettings) => {
    if (!user) return;
    setLoading(true);
    try {
        const savedData = await saveGlobalSettings(user.id, newSettings);
        setSettings(savedData);
        setGlobalSettingsState(savedData); // Update context immediately
        setError(null);
        return savedData;
    } catch (err) {
        setError(err.message);
        throw err; // Re-throw for component to handle UI feedback
    } finally {
        setLoading(false);
    }
  }, [user, setGlobalSettingsState]);

  // Initial fetch if context is empty but user exists
  useEffect(() => {
      if (user && !contextSettings && !loading) {
          getSettings();
      }
  }, [user, contextSettings, getSettings, loading]);

  return {
    settings,
    loading,
    error,
    getSettings,
    updateSettings
  };
};