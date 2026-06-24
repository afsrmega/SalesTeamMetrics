
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from 'lucide-react';
import { normalizeProspectType } from '@/lib/utils';

const parsePropertyValue = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const stringVal = String(val).trim();
  const cleaned = stringVal.replace(/[,$\s]/g, '');
  const num = Number(cleaned);
  if (isNaN(num)) return null;
  return num;
};

const EditProspectModal = ({ isOpen, onClose, onSave, prospect, isLoading }) => {
  const [formData, setFormData] = useState({});
  const [effectiveAt, setEffectiveAt] = useState('');
  const [note, setNote] = useState('');
  const [nameError, setNameError] = useState('');
  const [valueError, setValueError] = useState('');
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  useEffect(() => {
    if (isOpen && prospect) {
      console.log('[EditProspectModal] Initializing form with fresh data:', prospect);
      setFormData({
        prospect_name: prospect.prospect_name || '',
        source_lead: prospect.source_lead || '',
        prospect_type: prospect.prospect_type ? normalizeProspectType(prospect.prospect_type) : 'commercial',
        has_portfolio: prospect.has_portfolio || false,
        estimated_property_value: prospect.estimated_property_value || '',
        qualification: prospect.qualification || 0,
        last_contact_date: prospect.last_contact_date ? prospect.last_contact_date.split('T')[0] : '',
        follow_up_at: prospect.follow_up_at ? new Date(prospect.follow_up_at).toISOString().slice(0, 16) : '',
        documents_sent: prospect.documents_sent || false,
        notes: prospect.notes || '',
      });
      setEffectiveAt(new Date().toISOString().slice(0, 16));
      setNote('');
      setNameError('');
      setValueError('');
    }
  }, [isOpen, prospect]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValueError('');
    
    if (!effectiveAt) return;
    
    if (!formData.prospect_name || !formData.prospect_name.trim()) {
      setNameError('El Nombre del prospecto es obligatorio');
      return;
    }

    console.log("📋 Form state before save:", formData);
    console.log(`📊 estimated_property_value in form: "${formData.estimated_property_value}"`);

    const parsedPropertyValue = parsePropertyValue(formData.estimated_property_value);
    console.log(`✅ Parsed property value: "${formData.estimated_property_value}" →`, parsedPropertyValue);

    if (parsedPropertyValue === null || parsedPropertyValue < 0) {
      setValueError('El valor estimado de la propiedad debe ser un número válido positivo.');
      return;
    }
    
    const payload = {
      prospect_name: formData.prospect_name.trim(),
      source_lead: formData.source_lead,
      prospect_type: normalizeProspectType(formData.prospect_type),
      estimated_property_value: parsedPropertyValue,
      qualification: Number(formData.qualification),
      last_contact_date: formData.last_contact_date || null,
      follow_up_at: formData.follow_up_at ? new Date(formData.follow_up_at).toISOString() : null,
      documents_sent: formData.documents_sent,
      has_portfolio: formData.has_portfolio,
      notes: formData.notes
    };

    console.log("📦 Payload to send:", payload);
    setIsSavingLocal(true);
    try {
      await onSave(prospect.id, payload, new Date(effectiveAt).toISOString(), note);
      console.log('[EditProspectModal] Save completed successfully');
    } catch (error) {
      console.error('[EditProspectModal] Error during save:', error);
    } finally {
      setIsSavingLocal(false);
    }
  };

  const isSaving = isLoading || isSavingLocal;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Prospecto {prospect?.external_id}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre del prospecto <span className="text-red-500">*</span></Label>
              <Input 
                value={formData.prospect_name || ''} 
                onChange={(e) => { setFormData({...formData, prospect_name: e.target.value}); setNameError(''); }} 
                placeholder="Ej. Juan Pérez"
              />
              {nameError && <p className="text-xs text-red-500">{nameError}</p>}
            </div>
            <div className="space-y-2">
              <Label>Origen del Lead</Label>
              <Input 
                value={formData.source_lead || ''} 
                onChange={(e) => setFormData({...formData, source_lead: e.target.value})} 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Prospecto</Label>
              <Select value={formData.prospect_type || 'commercial'} onValueChange={(v) => setFormData({...formData, prospect_type: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="bpp">BPP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Valor Estimado</Label>
              <Input 
                type="text" 
                value={formData.estimated_property_value || ''} 
                onChange={(e) => { setFormData({...formData, estimated_property_value: e.target.value}); setValueError(''); }} 
              />
              {valueError && <p className="text-xs text-red-500">{valueError}</p>}
            </div>
            <div className="space-y-2">
              <Label>Calificación (0-10)</Label>
              <Input 
                type="number" min="0" max="10" 
                value={formData.qualification || ''} 
                onChange={(e) => setFormData({...formData, qualification: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Último Contacto</Label>
              <Input 
                type="date" 
                value={formData.last_contact_date || ''} 
                onChange={(e) => setFormData({...formData, last_contact_date: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Próximo Follow-Up</Label>
              <Input 
                type="datetime-local" 
                value={formData.follow_up_at || ''} 
                onChange={(e) => setFormData({...formData, follow_up_at: e.target.value})} 
              />
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="has_portfolio" 
                checked={formData.has_portfolio} 
                onCheckedChange={(c) => setFormData({...formData, has_portfolio: c})} 
              />
              <Label htmlFor="has_portfolio">Tiene Portafolio</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="documents_sent" 
                checked={formData.documents_sent} 
                onCheckedChange={(c) => setFormData({...formData, documents_sent: c})} 
              />
              <Label htmlFor="documents_sent">Documentos Enviados</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <textarea 
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.notes || ''}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="font-semibold text-sm">Registro de Historial (Requerido)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Efectiva del Cambio *</Label>
                <Input 
                  type="datetime-local" 
                  value={effectiveAt} 
                  onChange={(e) => setEffectiveAt(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Nota del Cambio (Opcional)</Label>
                <Input 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                  placeholder="Razón del cambio..." 
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || !effectiveAt}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProspectModal;
