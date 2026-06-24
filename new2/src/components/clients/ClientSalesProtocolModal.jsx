
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { updateClientSalesProtocol } from '@/lib/clientsService';
import { Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const ClientSalesProtocolModal = ({ isOpen, onClose, client, onSaved }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [checklist, setChecklist] = useState({
    spartaxx_created: false,
    scanning_completed: false,
    notes_added: false,
    docs_requested: false
  });

  useEffect(() => {
    if (client && isOpen) {
      setChecklist({
        spartaxx_created: client.sales_protocol_spartaxx_created || false,
        scanning_completed: client.sales_protocol_scanning_completed || false,
        notes_added: client.sales_protocol_notes_added || false,
        docs_requested: client.sales_protocol_docs_requested || false
      });
    }
  }, [client, isOpen]);

  const handleCheckboxChange = (field, checked) => {
    setChecklist(prev => ({ ...prev, [field]: checked }));
  };

  const handleSave = async () => {
    if (!client) return;
    setLoading(true);
    try {
      await updateClientSalesProtocol(client.id, checklist);
      toast({ title: "Éxito", description: "Checklist actualizado correctamente" });
      if (onSaved) onSaved();
      onClose();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  const allComplete = checklist.spartaxx_created && checklist.scanning_completed && checklist.notes_added && checklist.docs_requested;
  const isOverdue = !allComplete && client.sales_protocol_due_at && new Date() > new Date(client.sales_protocol_due_at);

  let statusBadge = <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">Pendiente</Badge>;
  if (allComplete) {
    statusBadge = <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Completado</Badge>;
  } else if (isOverdue) {
    statusBadge = <Badge className="bg-red-100 text-red-800 hover:bg-red-200 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Vencido</Badge>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Checklist Protocolo de Venta</DialogTitle>
        </DialogHeader>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-800">{client.prospect_name || client.client_name || 'Cliente'}</span>
            <span className="text-xs text-slate-500 font-mono">ID: {client.external_id || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Vencimiento: {client.sales_protocol_due_at ? format(new Date(client.sales_protocol_due_at), 'PPP') : 'N/A'}</span>
            {statusBadge}
          </div>
        </div>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-3 bg-white p-3 rounded-md border shadow-sm transition-colors hover:bg-slate-50">
            <Checkbox 
              id="spartaxx_created" 
              checked={checklist.spartaxx_created}
              onCheckedChange={(checked) => handleCheckboxChange('spartaxx_created', checked)}
            />
            <Label htmlFor="spartaxx_created" className="flex-1 cursor-pointer leading-tight text-sm font-medium">
              Cuenta creada en Spartaxx
            </Label>
          </div>
          
          <div className="flex items-center space-x-3 bg-white p-3 rounded-md border shadow-sm transition-colors hover:bg-slate-50">
            <Checkbox 
              id="scanning_completed" 
              checked={checklist.scanning_completed}
              onCheckedChange={(checked) => handleCheckboxChange('scanning_completed', checked)}
            />
            <Label htmlFor="scanning_completed" className="flex-1 cursor-pointer leading-tight text-sm font-medium">
              Formulario de Scanning completado y revisado
            </Label>
          </div>

          <div className="flex items-center space-x-3 bg-white p-3 rounded-md border shadow-sm transition-colors hover:bg-slate-50">
            <Checkbox 
              id="notes_added" 
              checked={checklist.notes_added}
              onCheckedChange={(checked) => handleCheckboxChange('notes_added', checked)}
            />
            <Label htmlFor="notes_added" className="flex-1 cursor-pointer leading-tight text-sm font-medium">
              Notas dejadas en la cuenta
            </Label>
          </div>

          <div className="flex items-center space-x-3 bg-white p-3 rounded-md border shadow-sm transition-colors hover:bg-slate-50">
            <Checkbox 
              id="docs_requested" 
              checked={checklist.docs_requested}
              onCheckedChange={(checked) => handleCheckboxChange('docs_requested', checked)}
            />
            <Label htmlFor="docs_requested" className="flex-1 cursor-pointer leading-tight text-sm font-medium">
              Documentos financieros / supporting documents solicitados
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Checklist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClientSalesProtocolModal;
