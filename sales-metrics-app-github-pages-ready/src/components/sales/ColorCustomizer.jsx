import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, RotateCcw, AlertTriangle, Palette } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getDefaultColors } from '@/lib/userColorPreferencesService';

// Helper to check contrast roughly
const getContrastRatio = (hex1, hex2) => {
  // Very simplified brightness check for demo purposes
  // A real implementation would convert to relative luminance
  const getBrightness = (hex) => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return ((r * 299) + (g * 587) + (b * 114)) / 1000;
  };
  
  const b1 = getBrightness(hex1);
  const b2 = getBrightness(hex2);
  
  return Math.abs(b1 - b2);
};

const ColorCustomizer = ({ isOpen, onClose }) => {
  const { user, userColorPreferences, updateUserColors } = useAuth();
  const { toast } = useToast();
  
  const defaults = getDefaultColors();
  const [colors, setColors] = useState(defaults);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userColorPreferences) {
      setColors(userColorPreferences);
    }
  }, [userColorPreferences]);

  const handleChange = (key, value) => {
    setColors(prev => ({ ...prev, [key]: value }));
    // Real-time preview by setting CSS variables temporarily
    document.documentElement.style.setProperty(`--color-${key.split('_')[0]}`, value);
  };

  const handleReset = () => {
    setColors(defaults);
    Object.keys(defaults).forEach(key => {
       document.documentElement.style.setProperty(`--color-${key.split('_')[0]}`, defaults[key]);
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateUserColors(colors);
      toast({ title: "Preferencias Guardadas", description: "Tus colores han sido actualizados." });
      onClose();
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron guardar los colores.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Revert to saved state if cancelled
    if (userColorPreferences) {
       Object.keys(userColorPreferences).forEach(key => {
         document.documentElement.style.setProperty(`--color-${key.split('_')[0]}`, userColorPreferences[key]);
       });
       setColors(userColorPreferences);
    }
    onClose();
  };

  // Contrast Warning
  const contrastDiff = getContrastRatio(colors.background_color, colors.text_color);
  const showContrastWarning = contrastDiff < 50; // Threshold

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end"
      >
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto"
        >
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Palette className="w-6 h-6 text-primary" />
                        Personalizar Tema
                    </h2>
                    <p className="text-sm text-gray-500">Ajusta los colores de tu interfaz.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <div className="space-y-6">
                {/* Preview Card */}
                <Card style={{ backgroundColor: colors.background_color, borderColor: colors.primary_color }}>
                    <CardHeader>
                        <CardTitle style={{ color: colors.text_color }}>Vista Previa</CardTitle>
                        <CardDescription style={{ color: colors.text_color, opacity: 0.7 }}>Así se verán tus componentes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Button style={{ backgroundColor: colors.primary_color, color: '#fff' }}>Primario</Button>
                            <Button style={{ backgroundColor: colors.secondary_color, color: '#fff' }}>Secundario</Button>
                        </div>
                        <div className="p-3 rounded border border-l-4" style={{ 
                            backgroundColor: '#fff', 
                            borderColor: '#e5e7eb',
                            borderLeftColor: colors.accent_color 
                        }}>
                             <span style={{ color: colors.text_color }}>Elemento con acento</span>
                        </div>
                    </CardContent>
                </Card>

                {showContrastWarning && (
                    <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded flex items-start gap-2 border border-yellow-200">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>El contraste entre el fondo y el texto es bajo. Podría ser difícil de leer.</span>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                         <ColorInput 
                            label="Color Primario (Botones, Barras)" 
                            id="primary_color"
                            value={colors.primary_color}
                            onChange={(e) => handleChange('primary_color', e.target.value)}
                         />
                         <ColorInput 
                            label="Color Secundario (Acentos, Éxito)" 
                            id="secondary_color"
                            value={colors.secondary_color}
                            onChange={(e) => handleChange('secondary_color', e.target.value)}
                         />
                         <ColorInput 
                            label="Color de Acento (Alertas, Destacados)" 
                            id="accent_color"
                            value={colors.accent_color}
                            onChange={(e) => handleChange('accent_color', e.target.value)}
                         />
                         <ColorInput 
                            label="Color de Fondo (Páginas)" 
                            id="background_color"
                            value={colors.background_color}
                            onChange={(e) => handleChange('background_color', e.target.value)}
                         />
                         <ColorInput 
                            label="Color de Texto (Títulos, Párrafos)" 
                            id="text_color"
                            value={colors.text_color}
                            onChange={(e) => handleChange('text_color', e.target.value)}
                         />
                    </div>
                </div>

                <div className="pt-6 flex flex-col gap-3">
                    <Button onClick={handleSave} disabled={isSaving} className="w-full bg-primary hover:bg-primary/90">
                        {isSaving ? "Guardando..." : "Guardar Cambios"}
                        {!isSaving && <Save className="w-4 h-4 ml-2" />}
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" onClick={handleReset} className="w-full">
                            <RotateCcw className="w-4 h-4 mr-2" /> Restaurar
                        </Button>
                        <Button variant="ghost" onClick={handleClose} className="w-full">
                            Cancelar
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const ColorInput = ({ label, id, value, onChange }) => (
    <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs font-medium text-gray-600">{label}</Label>
        <div className="flex gap-2">
            <div className="w-10 h-10 rounded border shrink-0 overflow-hidden relative">
                 <input 
                    type="color" 
                    id={id} 
                    value={value} 
                    onChange={onChange}
                    className="absolute -top-2 -left-2 w-14 h-14 p-0 cursor-pointer border-0"
                 />
            </div>
            <Input 
                type="text" 
                value={value} 
                onChange={onChange}
                className="font-mono text-sm uppercase"
                maxLength={7}
            />
        </div>
    </div>
);

export default ColorCustomizer;