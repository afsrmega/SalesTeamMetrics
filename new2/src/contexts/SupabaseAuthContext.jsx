
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { fetchGlobalSettings, saveGlobalSettings } from '@/lib/globalSettingsService';
import { fetchUserColorPreferences, saveUserColorPreferences, getDefaultColors } from '@/lib/userColorPreferencesService';

const AuthContext = createContext(undefined);

const getFriendlyAuthErrorMessage = (error) => {
  const message = String(error?.message || "").toLowerCase();

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return "No pudimos iniciar sesión. Revisa tu email y contraseña e inténtalo nuevamente.";
  }

  if (message.includes("email not confirmed")) {
    return "Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada o contacta al administrador.";
  }

  if (
    message.includes("too many requests") ||
    message.includes("rate limit")
  ) {
    return "Demasiados intentos de inicio de sesión. Espera unos minutos e inténtalo nuevamente.";
  }

  if (
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    return "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.";
  }

  return "No pudimos iniciar sesión. Inténtalo nuevamente o contacta al administrador si el problema continúa.";
};

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSalesMember, setIsSalesMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [globalSettings, setGlobalSettings] = useState(null);
  const [userColorPreferences, setUserColorPreferences] = useState(getDefaultColors());

  const fetchSettings = useCallback(async () => {
    try {
      const settings = await fetchGlobalSettings();
      setGlobalSettings(settings);
    } catch (error) {
      console.error("Failed to fetch global settings:", error);
    }
  }, []);

  const fetchColors = useCallback(async (userId) => {
    try {
      const colors = await fetchUserColorPreferences(userId);
      setUserColorPreferences(colors);
    } catch (error) {
      console.error("Failed to fetch color preferences:", error);
    }
  }, []);

  const updateUserColors = useCallback(async (colors) => {
    if (!user) return;

    try {
      const saved = await saveUserColorPreferences(user.id, colors);
      setUserColorPreferences(saved);
      return saved;
    } catch (error) {
      throw error;
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_settings',
          filter: `settings_key=eq.team`
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSettings]);

  const handleSession = useCallback(async (currentSession) => {
    const currentUser = currentSession?.user ?? null;

    setSession(currentSession);
    setUser(currentUser);

    if (currentUser) {
      const isSales = currentUser.user_metadata?.isSalesMember === true;

      setIsSalesMember(isSales);
      setIsAdmin(!isSales);

      await Promise.all([
        fetchSettings(),
        fetchColors(currentUser.id)
      ]);
    } else {
      setIsSalesMember(false);
      setIsAdmin(false);
      setGlobalSettings(null);
      setUserColorPreferences(getDefaultColors());
    }

    setLoading(false);
  }, [fetchSettings, fetchColors]);

  const handleSignOut = useCallback(async () => {
    console.log("Logout started");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        if (
          error.status === 403 ||
          error.code === 'session_not_found' ||
          error.message?.includes('session_not_found')
        ) {
          console.warn("Warning: Session already invalid or not found (403). Proceeding with local logout.");
        } else {
          console.error("Supabase signOut error:", error);
        }
      }
    } catch (error) {
      console.error("Unexpected error during logout:", error);
    } finally {
      try {
        localStorage.removeItem('supabase.auth.token');

        const keysToRemove = [];

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);

          if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(k => localStorage.removeItem(k));

        sessionStorage.clear();
      } catch (storageErr) {
        console.error("Error clearing storage:", storageErr);
      }

      setUser(null);
      setSession(null);
      setIsSalesMember(false);
      setIsAdmin(false);
      setGlobalSettings(null);
      setUserColorPreferences(getDefaultColors());
      setLoading(false);

      console.log("Local state cleared. Redirecting to login.");

    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
          error
        } = await supabase.auth.getSession();

        if (error) {
          console.warn("Error getting initial session:", error);
        }

        if (mounted) {
          await handleSession(initialSession);
        }
      } catch (error) {
        console.error("Unexpected error initializing auth:", error);

        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        try {
          if (!mounted) return;

          console.log(
            `Auth event triggered: ${event}`,
            currentSession ? 'Valid session exists' : 'No session'
          );

          if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            setUser(null);
            setSession(null);
            setIsSalesMember(false);
            setIsAdmin(false);
            setGlobalSettings(null);
            setUserColorPreferences(getDefaultColors());
          } else {
            await handleSession(currentSession);
          }
        } catch (err) {
          console.error("Critical error in onAuthStateChange listener:", err);

          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [handleSession]);

  const signUp = useCallback(async (email, password, options = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error de Registro",
        description: error.message
      });
    } else {
      toast({
        title: "Registro Exitoso",
        description: "Revisa tu email para confirmar."
      });
    }

    return { data, error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const normalizedEmail = String(email || "").trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "No pudimos iniciar sesión",
        description: getFriendlyAuthErrorMessage(error),
      });

      return { data, error };
    }

    if (data.session) {
      toast({
        title: "Bienvenido",
        description: "Sesión iniciada correctamente.",
      });
    }

    return { data, error };
  }, [toast]);

  const signOut = useCallback(async () => {
    await handleSignOut();
    return { error: null };
  }, [handleSignOut]);

  const updateGlobalSettings = useCallback(async (newSettings) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      const saved = await saveGlobalSettings(newSettings);
      setGlobalSettings(saved);
      return saved;
    } catch (error) {
      throw error;
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    isSalesMember,
    isAdmin,
    globalSettings,
    userColorPreferences,
    signUp,
    signIn,
    signOut,
    updateGlobalSettings,
    updateUserColors,
    setGlobalSettings,
    setGlobalSettingsState: setGlobalSettings,
    fetchSettings
  }), [
    user,
    session,
    loading,
    isSalesMember,
    isAdmin,
    globalSettings,
    userColorPreferences,
    signUp,
    signIn,
    signOut,
    updateGlobalSettings,
    updateUserColors,
    setGlobalSettings,
    fetchSettings
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
