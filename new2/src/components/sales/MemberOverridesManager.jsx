
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Settings2, AlertCircle, RefreshCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function MemberOverridesManager() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const fetchMembers = async () => {
    setLoading(true);
    try {
      console.log("🔍 [OverridesManager] Fetching sales_team members...");
      const { data, error } = await supabase
        .from('sales_team')
        .select('id, name, monthly_quota_override_enabled')
        .order('name');
        
      if (error) throw error;
      setMembers(data || []);
      console.log("✅ [OverridesManager] Fetched members:", data);
    } catch (error) {
      console.error("❌ [OverridesManager] Error fetching members:", error);
      toast({ title: "Error", description: "No se pudieron cargar los miembros.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleToggle = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    setSavingId(id);
    console.log(`🔄 [OverridesManager] Toggling override for member ${id} to ${newStatus}`);
    
    try {
      const { error } = await supabase
        .from('sales_team')
        .update({ monthly_quota_override_enabled: newStatus })
        .eq('id', id);

      if (error) throw error;

      setMembers(prev => prev.map(m => m.id === id ? { ...m, monthly_quota_override_enabled: newStatus } : m));
      console.log(`✅ [OverridesManager] Toggle successful.`);
      
      window.dispatchEvent(new CustomEvent('overridesUpdated'));
      
      toast({
        title: "Actualizado",
        description: `Excepción ${newStatus ? 'activada' : 'desactivada'} correctamente.`,
      });
    } catch (error) {
      console.error("❌ [OverridesManager] Error toggling:", error);
      toast({ title: "Error", description: "No se pudo actualizar la configuración.", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const handleResetAll = async () => {
    setIsResetting(true);
    console.log("🔄 [OverridesManager] Resetting all overrides to false...");
    try {
      const { error } = await supabase
        .from('sales_team')
        .update({ monthly_quota_override_enabled: false })
        .not('id', 'is', null);

      if (error) throw error;

      setMembers(prev => prev.map(m => ({ ...m, monthly_quota_override_enabled: false })));
      console.log("✅ [OverridesManager] Reset all successful.");
      
      window.dispatchEvent(new CustomEvent('overridesUpdated'));
      
      toast({
        title: "Reiniciado",
        description: "Todas las excepciones han sido desactivadas.",
      });
    } catch (error) {
      console.error("❌ [OverridesManager] Error resetting:", error);
      toast({ title: "Error", description: "No se pudieron reiniciar las excepciones.", variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
              <Settings2 className="w-5 h-5 text-custom-primary" />
              Gestión de Cuotas Individuales (Overrides)
            </CardTitle>
            <CardDescription>
              Activa o desactiva las cuotas personalizadas específicas por miembro (definidas en su perfil) en lugar de usar la meta general del período.
            </CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 text-red-600 border-red-200 hover:bg-red-50" disabled={loading || isResetting}>
                {isResetting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                Desactivar Todas
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Desactivar todas las excepciones?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esto hará que todos los miembros usen la meta general del período actual (goals_by_period) o la configuración global. Sus cuotas individuales configuradas en el perfil no se borrarán, solo se ignorarán.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetAll} className="bg-red-600 hover:bg-red-700 text-white">
                  Confirmar Desactivación
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle>¿Cómo funciona?</AlertTitle>
          <AlertDescription className="text-blue-700 text-sm">
            Si la excepción está <strong>Activada</strong>, el miembro usará su "Cuota Mensual" o "Cuota Trimestral" definida en su perfil al calcular el porcentaje de cumplimiento y proyecciones.<br/>
            Si está <strong>Desactivada</strong>, usará la meta definida para todo el equipo en este período específico.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-custom-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                <span className="font-medium text-slate-700 truncate mr-2" title={member.name}>{member.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-500 w-16 text-right">
                    {member.monthly_quota_override_enabled ? 'Activado' : 'Desactivado'}
                  </span>
                  {savingId === member.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  ) : (
                    <Switch 
                      checked={member.monthly_quota_override_enabled || false}
                      onCheckedChange={() => handleToggle(member.id, member.monthly_quota_override_enabled)}
                    />
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <div className="col-span-full text-center text-slate-500 py-4">No hay miembros en el equipo.</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
