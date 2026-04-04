import { supabase } from './customSupabaseClient';

export const DEFAULT_COLORS = {
  primary_color: '#3B82F6',   // Blue-500
  secondary_color: '#10B981', // Emerald-500
  accent_color: '#F59E0B',    // Amber-500
  background_color: '#F9FAFB',// Gray-50
  text_color: '#1F2937'       // Gray-800
};

export const getDefaultColors = () => ({ ...DEFAULT_COLORS });

export const fetchUserColorPreferences = async (userId) => {
  if (!userId) {
    console.warn("fetchUserColorPreferences called without userId");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('user_color_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      console.log("No custom colors found, returning defaults.");
      return getDefaultColors();
    }

    console.log("User Color Preferences fetched:", data);
    return data;
  } catch (error) {
    console.error("Error fetching user color preferences:", error);
    return getDefaultColors();
  }
};

export const saveUserColorPreferences = async (userId, colors) => {
  if (!userId) throw new Error("User ID is required to save preferences.");

  // Basic validation
  const requiredKeys = ['primary_color', 'secondary_color', 'accent_color', 'background_color', 'text_color'];
  for (const key of requiredKeys) {
    if (!colors[key] || typeof colors[key] !== 'string' || !colors[key].startsWith('#')) {
      throw new Error(`Invalid color value for ${key}. Must be a valid hex string.`);
    }
  }

  const payload = {
    user_id: userId,
    primary_color: colors.primary_color,
    secondary_color: colors.secondary_color,
    accent_color: colors.accent_color,
    background_color: colors.background_color,
    text_color: colors.text_color,
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('user_color_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    console.log("User Color Preferences saved:", data);
    return data;
  } catch (error) {
    console.error("Error saving user color preferences:", error);
    throw error;
  }
};