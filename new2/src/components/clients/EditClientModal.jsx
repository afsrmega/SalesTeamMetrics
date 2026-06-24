
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { updateClientWithHistory } from '@/lib/clientsService';
import { normalizeConversionChannel, normalizeSeniorManagerRole } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const EditClientModal = ({ isOpen, onClose, client, onSave }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    client_name: '',
    estimated_property_value: '',
    pending_for_financials: false,
    client_follow_up_at: '',
    client_notes: '',
    property_type: 'Residential',
    has_portfolio: false,
    conversion_channel: '',
    senior_manager_involved: false,
    senior_manager_name: '',
    senior_manager_role: '',
    senior_manager_appointment_at: ''
  });
  
  const [effectiveAt, setEffectiveAt] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (client && isOpen) {
      setFormData({
        client_name: client.prospect_name || client.client_name || '',
        estimated_property_value: client.estimated_property_value || '',
        pending_for_financials: client.pending_for_financials || false,
        client_follow_up_at: client.client_follow_up_at ? new Date(client.client_follow_up_at).toISOString().slice(0, 16) : '',
        client_notes: client.client_notes || '',
        property_type: client.property_type || 'Residential',
        has_portfolio: client.has_portfolio || false,
        conversion_channel: client.conversion_channel || '',
        senior_manager_involved: client.senior_manager_involved || false,
        senior_manager_name: client.senior_manager_name || '',
        senior_manager_role: client.senior_manager_role || '',
        senior_manager_appointment_at: client.senior_manager_appointment_at ? new Date(client.senior_manager_appointment_at).toISOString().slice(0, 16) : ''
      });
      setEffectiveAt(new Date().toISOString().slice(0, 16));
      setNote('');
    }
  }, [client, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!effectiveAt) {
      toast({ title: "Error", description: "Fecha efectiva es obligatoria", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const channelNorm = normalizeConversionChannel(formData.conversion_channel);
      const roleNorm = formData.senior_manager_involved ? normalizeSeniorManagerRole(formData.senior_manager_role) : null;

      const updates = {
        ...formData,
        conversion_channel: channelNorm,
        senior_manager_involved: formData.senior_manager_involved,
        senior_manager_name: formData.senior_manager_involved ? formData.senior_manager_name : null,
        senior_manager_role: roleNorm,
        senior_manager_appointment_at: (formData.senior_manager_involved && formData.senior_manager_appointment_at) ? new Date(formData.senior_manager_appointment_at).toISOString() : null,
        estimated_property_value: Number(formData.estimated_property_value),
        client_follow_up_at: formData.client_follow_up_at ? new Date(formData.client_follow_up_at).toISOString() : null,
      };
      
      await updateClientWithHistory(client.id, updates, new Date(effectiveAt).toISOString(), note);
      
      toast({ title: "Éxito", description: "Client updated successfully" });
      onSave();
      onClose();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto z-50">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>ID Externo (Read-only)</Label>
            <Input value={client.external_id || ''} readOnly className="bg-gray-50 text-gray-900" />
          </div>
          
          <div className="grid gap-2">
            <Label>Nombre del Cliente</Label>
            <Input 
              value={formData.client_name} 
              onChange={(e) => handleChange('client_name', e.target.value)} 
              className="text-gray-900"
            />
          </div>

          <div className="grid gap-2">
            <Label>Valor Estimado</Label>
            <Input 
              type="number" 
              value={formData.estimated_property_value} 
              onChange={(e) => handleChange('estimated_property_value', e.target.value)} 
              className="text-gray-900"
            />
          </div>

          <div className="grid gap-2">
            <Label>Tipo de Propiedad</Label>
            <Select value={formData.property_type} onValueChange={(v) => handleChange('property_type', v)}>
              <SelectTrigger className="text-gray-900">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="Residential">Residencial</SelectItem>
                <SelectItem value="Commercial">Comercial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Pendiente de Finanzas</Label>
            <Switch 
              checked={formData.pending_for_financials} 
              onCheckedChange={(v) => handleChange('pending_for_financials', v)} 
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Tiene Portafolio</Label>
            <Switch 
              checked={formData.has_portfolio} 
              onCheckedChange={(v) => handleChange('has_portfolio', v)} 
            />
          </div>

          <div className="grid gap-2">
            <Label>Fecha de Seguimiento</Label>
            <Input 
              type="datetime-local" 
              value={formData.client_follow_up_at} 
              onChange={(e) => handleChange('client_follow_up_at', e.target.value)}
              className="text-gray-900"
            />
          </div>

          {/* Conversion Details Section */}
          <div className="border rounded-md p-4 space-y-4 bg-muted/20">
            <h4 className="font-semibold text-sm">Detalles de Conversión</h4>
            <div className="space-y-2">
              <Label>Convertido Vía</Label>
              <Select value={formData.conversion_channel || undefined} onValueChange={(v) => handleChange('conversion_channel', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar canal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="both">Email + Phone</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="senior-mgr" className="cursor-pointer">Senior/Manager Appointment Involved</Label>
              <Switch 
                id="senior-mgr"
                checked={formData.senior_manager_involved} 
                onCheckedChange={(v) => handleChange('senior_manager_involved', v)} 
              />
            </div>

            {formData.senior_manager_involved && (
              <div className="space-y-3 pt-2 border-t mt-2">
                <div className="space-y-1">
                  <Label>Senior/Manager Name</Label>
                  <Input 
                    value={formData.senior_manager_name} 
                    onChange={e => handleChange('senior_manager_name', e.target.value)} 
                    placeholder="Enter name"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select value={formData.senior_manager_role || undefined} onValueChange={(v) => handleChange('senior_manager_role', v)}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="both">Senior + Manager</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Appointment Date</Label>
                  <Input 
                    type="datetime-local" 
                    value={formData.senior_manager_appointment_at} 
                    onChange={e => handleChange('senior_manager_appointment_at', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Notas del Cliente</Label>
            <Textarea 
              value={formData.client_notes} 
              onChange={(e) => handleChange('client_notes', e.target.value)} 
              className="text-gray-900"
            />
          </div>

          <div className="grid gap-2 mt-4 pt-4 border-t border-gray-200">
            <Label className="text-blue-600 font-semibold">Fecha Efectiva del Cambio (Requerido)</Label>
            <Input 
              type="datetime-local" 
              value={effectiveAt} 
              onChange={(e) => setEffectiveAt(e.target.value)} 
              required
              className="text-gray-900"
            />
          </div>
          
          <div className="grid gap-2">
            <Label>Nota sobre el cambio (Opcional)</Label>
            <Textarea 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              placeholder="Razón del cambio..."
              className="text-gray-900"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !effectiveAt}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientModal;
