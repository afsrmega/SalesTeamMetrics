
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from 'lucide-react';
import { normalizeProspectType } from '@/lib/utils';

const CreateProspectModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading, 
  currentUser, 
  isAdmin, 
  salesMembers = [] 
}) => {
  const defaultFormState = {
    prospect_name: '',
    external_id: '',
    source_lead: '',
    qualification: 5,
    follow_up_at: '',
    last_contact_date: '',
    documents_sent: false,
    prospect_type: 'commercial',
    has_portfolio: false,
    estimated_property_value: 0,
    notes: '',
    owner_user_id: currentUser?.id || ''
  };

  const [formData, setFormData] = useState(defaultFormState);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...defaultFormState,
        owner_user_id: currentUser?.id || ''
      });
      setValidationErrors({});
    }
  }, [isOpen, currentUser]);

  const validate = () => {
    const errors = {};
    if (!formData.prospect_name || !formData.prospect_name.trim()) errors.prospect_name = "El Nombre del prospecto es obligatorio";
    if (!formData.external_id) errors.external_id = "El ID Externo es obligatorio";
    if (!formData.source_lead) errors.source_lead = "El Origen es obligatorio";
    if (!formData.prospect_type) errors.prospect_type = "El Tipo de Prospecto es obligatorio";
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...formData,
        prospect_type: normalizeProspectType(formData.prospect_type)
      });
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Prospecto</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-2">
              <Label>Nombre del prospecto <span className="text-red-500">*</span></Label>
              <Input 
                value={formData.prospect_name} 
                onChange={(e) => updateField('prospect_name', e.target.value)}
                placeholder="Ej. Juan Pérez"
              />
              {validationErrors.prospect_name && <p className="text-xs text-red-500">{validationErrors.prospect_name}</p>}
            </div>

            <div className="space-y-2">
              <Label>ID Externo / Número <span className="text-red-500">*</span></Label>
              <Input 
                type="number" 
                value={formData.external_id} 
                onChange={(e) => updateField('external_id', e.target.value ? parseInt(e.target.value, 10) : '')}
                placeholder="Ej. 1001"
              />
              {validationErrors.external_id && <p className="text-xs text-red-500">{validationErrors.external_id}</p>}
            </div>

            <div className="space-y-2">
              <Label>Origen del Lead <span className="text-red-500">*</span></Label>
              <Select value={formData.source_lead} onValueChange={(val) => updateField('source_lead', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un origen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Assigned">Asignado</SelectItem>
                  <SelectItem value="Other">Otro</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.source_lead && <p className="text-xs text-red-500">{validationErrors.source_lead}</p>}
            </div>

            <div className="space-y-2">
              <Label>Tipo de Prospecto <span className="text-red-500">*</span></Label>
              <Select value={formData.prospect_type} onValueChange={(val) => updateField('prospect_type', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="bpp">BPP</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.prospect_type && <p className="text-xs text-red-500">{validationErrors.prospect_type}</p>}
            </div>

            <div className="space-y-2">
              <Label>Valor Estimado de la Propiedad (USD)</Label>
              <Input 
                type="number" 
                min="0"
                step="0.01"
                value={formData.estimated_property_value} 
                onChange={(e) => updateField('estimated_property_value', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Calificación (1-10): {formData.qualification}</Label>
              <div className="pt-2 pb-1 px-1">
                <Slider 
                  value={[formData.qualification]} 
                  min={1} 
                  max={10} 
                  step={1}
                  onValueChange={(val) => updateField('qualification', val[0])}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fecha del Último Contacto</Label>
              <Input 
                type="date" 
                value={formData.last_contact_date} 
                onChange={(e) => updateField('last_contact_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha de Próximo Seguimiento</Label>
              <Input 
                type="datetime-local" 
                value={formData.follow_up_at} 
                onChange={(e) => updateField('follow_up_at', e.target.value)}
              />
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <Label>Propietario (Miembro del Equipo)</Label>
                <Select value={formData.owner_user_id} onValueChange={(val) => updateField('owner_user_id', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar miembro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={currentUser?.id || 'self'}>Yo (Admin)</SelectItem>
                    {salesMembers
                      .filter(member => member.user_id !== currentUser?.id)
                      .map(member => (
                      <SelectItem key={member.id || member.user_id} value={member.user_id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

          </div>

          <div className="flex flex-col sm:flex-row gap-6 py-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="docs-sent" 
                checked={formData.documents_sent} 
                onCheckedChange={(checked) => updateField('documents_sent', checked)}
              />
              <Label htmlFor="docs-sent" className="cursor-pointer">Documentos Enviados</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="has-portfolio" 
                checked={formData.has_portfolio} 
                onCheckedChange={(checked) => updateField('has_portfolio', checked)}
              />
              <Label htmlFor="has-portfolio" className="cursor-pointer">Tiene Portafolio</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea 
              value={formData.notes} 
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Detalles adicionales sobre el prospecto..."
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Prospecto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProspectModal;
