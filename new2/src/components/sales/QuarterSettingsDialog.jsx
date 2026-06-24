
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_QUARTER_DEFINITIONS, getQuarterDateRange } from '@/lib/getQuarterDateRange';
import { Settings, Loader2 } from 'lucide-react';

const QuarterSettingsDialog = ({ disabled, globalSettings, fetchSettings, updateGlobalSettings }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localDefs, setLocalDefs] = useState(DEFAULT_QUARTER_DEFINITIONS);

  useEffect(() => {
    if (isOpen) {
      setLocalDefs(globalSettings?.quarter_definitions || DEFAULT_QUARTER_DEFINITIONS);
    }
  }, [isOpen, globalSettings]);

  const handleChange = (q, field, value) => {
    setLocalDefs(prev => ({
      ...prev,
      [q]: {
        ...prev[q],
        [field]: parseInt(value, 10) || 0
      }
    }));
  };

  const validate = () => {
    for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
      const def = localDefs[q];
      
      // Validate ranges
      if (def.startMonth < 1 || def.startMonth > 12 || def.endMonth < 1 || def.endMonth > 12) {
        toast({ title: 'Error de validación', description: `${q}: Los meses deben estar entre 1 y 12.`, variant: 'destructive' });
        return false;
      }
      if (def.startDay < 1 || def.startDay > 31 || def.endDay < 1 || def.endDay > 31) {
        toast({ title: 'Error de validación', description: `${q}: Los días deben estar entre 1 y 31.`, variant: 'destructive' });
        return false;
      }

      // Validate end >= start using example year 2026
      try {
        const quarterNum = parseInt(q.replace('Q', ''), 10);
        const { start, end } = getQuarterDateRange(2026, quarterNum, localDefs);
        if (start > end) {
          toast({ title: 'Error de validación', description: `${q}: La fecha de fin debe ser mayor o igual a la de inicio.`, variant: 'destructive' });
          return false;
        }
      } catch (err) {
        toast({ title: 'Error', description: `No se pudo validar ${q}.`, variant: 'destructive' });
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setIsSaving(true);
    try {
      const payload = { 
        ...globalSettings, 
        quarter_definitions: localDefs 
      };
      
      await updateGlobalSettings(payload);
      await fetchSettings();
      
      window.dispatchEvent(new Event('quarterDefinitionsUpdated'));
      window.dispatchEvent(new Event('goalsUpdated'));
      
      toast({ title: "Éxito", description: "Configuración guardada correctamente." });
      setIsOpen(false);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)} 
        disabled={disabled}
        className="flex items-center gap-2"
      >
        <Settings className="w-4 h-4" />
        Config. Quarters
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuración de Quarters</DialogTitle>
          </DialogHeader>

          <div className="text-sm text-muted-foreground mb-4">
            Los offsets son relativos al año fiscal. Ejemplo: -1 significa año anterior al FY seleccionado.
          </div>

          <div className="space-y-6">
            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
              <div key={q} className="border p-4 rounded-md space-y-4 bg-muted/20">
                <h4 className="font-bold text-lg">{q}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Start Date Config */}
                  <div className="space-y-3">
                    <h5 className="font-medium text-sm border-b pb-1">Inicio</h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Mes inicio</Label>
                        <Input 
                          type="number" 
                          min={1} max={12} 
                          value={localDefs[q]?.startMonth || ''} 
                          onChange={(e) => handleChange(q, 'startMonth', e.target.value)} 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Día inicio</Label>
                        <Input 
                          type="number" 
                          min={1} max={31} 
                          value={localDefs[q]?.startDay || ''} 
                          onChange={(e) => handleChange(q, 'startDay', e.target.value)} 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Offset año inicio</Label>
                        <Input 
                          type="number" 
                          value={localDefs[q]?.startYearOffset ?? ''} 
                          onChange={(e) => handleChange(q, 'startYearOffset', e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* End Date Config */}
                  <div className="space-y-3">
                    <h5 className="font-medium text-sm border-b pb-1">Fin</h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Mes fin</Label>
                        <Input 
                          type="number" 
                          min={1} max={12} 
                          value={localDefs[q]?.endMonth || ''} 
                          onChange={(e) => handleChange(q, 'endMonth', e.target.value)} 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Día fin</Label>
                        <Input 
                          type="number" 
                          min={1} max={31} 
                          value={localDefs[q]?.endDay || ''} 
                          onChange={(e) => handleChange(q, 'endDay', e.target.value)} 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Offset año fin</Label>
                        <Input 
                          type="number" 
                          value={localDefs[q]?.endYearOffset ?? ''} 
                          onChange={(e) => handleChange(q, 'endYearOffset', e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuarterSettingsDialog;
