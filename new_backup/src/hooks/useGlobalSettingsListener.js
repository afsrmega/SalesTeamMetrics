import { useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useGlobalSettingsListener = (userId, onSettingsChange) => {
  useEffect(() => {
    if (!userId) return;

    // Channel for Realtime subscription
    const channel = supabase
      .channel(`global_settings_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'global_settings',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Global Settings changed:', payload);
          if (onSettingsChange) {
            // Pass the new record if available, or just trigger a refresh
            onSettingsChange(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onSettingsChange]);
};