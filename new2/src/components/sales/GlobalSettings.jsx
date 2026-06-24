import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getGoalsByPeriod, saveGoalsByPeriod } from '@/lib/goalsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Settings, Loader2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/salesUtils';

const GlobalSettings = ({ disabled, periodMode, periodKey, periodLabel }) => {
  const { user, globalSettings } = useAuth();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [goals, setGoals] = useState({
    teamGoal: '',
    individualGoal: ''
  });

  const loadGoals = async () => {
    if (!periodMode || !periodKey || !globalSettings) return;
    
    setIsLoading(true);
    try {
      const data = await getGoalsByPeriod(periodMode, periodKey, globalSettings);
      setGoals({
        teamGoal: data.team_goal ? data.team_goal.toString() : '',
        individualGoal: data.individual_goal ? data.individual_goal.toString() : ''
      });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudieron cargar las metas del período.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadGoals();
    }
  }, [isOpen, periodMode, periodKey, globalSettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setGoals(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveInit = () => {
    setShowConfirm(true);
  };

  const confirmSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);
    try {
      if (!user?.id) throw new Error("Usuario no autenticado");
      
      await saveGoalsByPeriod(
        periodMode, 
        periodKey, 
        goals.teamGoal, 
        goals.individualGoal, 
        user.id
      );
      
      toast({ title: "Metas Guardadas", description: `Metas actualizadas para ${periodLabel}` });
      setIsOpen(false);
      // Dispatch a custom event so parent components can refetch
      window.dispatchEvent(new Event('goalsUpdated'));
    } catch (error) {
      console.error("Save error:", error);
      toast({ 
        title: "Error al guardar", 
        description: error.message || "No se pudieron guardar las metas.", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" disabled={disabled} className="border-gray-300">
            <Settings className="w-4 h-4 mr-2" />
            Metas del Período
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Configuración de Metas
              <Badge variant="secondary">{periodLabel}</Badge>
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-custom-primary" /></div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="teamGoal" className="text-gray-900">Meta Equipo ({periodMode === 'quarter' ? 'Trimestral' : 'Mensual'})</Label>
                <div className="relative">
                   <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                   <Input 
                      id="teamGoal" 
                      name="teamGoal" 
                      type="number" 
                      value={goals.teamGoal} 
                      onChange={handleChange} 
                      className="pl-7 text-gray-900 placeholder:text-gray-400 bg-white"
                   />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="individualGoal" className="text-gray-900">Meta Individual Base ({periodMode === 'quarter' ? 'Trimestral' : 'Mensual'})</Label>
                <div className="relative">
                   <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                   <Input 
                      id="individualGoal" 
                      name="individualGoal" 
                      type="number" 
                      value={goals.individualGoal} 
                      onChange={handleChange} 
                      className="pl-7 text-gray-900 placeholder:text-gray-400 bg-white"
                   />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveInit} disabled={isLoading || isSaving} className="bg-custom-primary hover:bg-custom-primary/90 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar Metas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-amber-600">
              <AlertTriangle className="w-5 h-5 mr-2" /> Confirmar Actualización
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-4">
            ¿Deseas actualizar las cuotas para el período <strong>{periodLabel}</strong>? Esto afectará los cálculos de este período específicamente.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
            <Button onClick={confirmSave} className="bg-amber-600 hover:bg-amber-700 text-white">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalSettings;