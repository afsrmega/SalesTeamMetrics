import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { updateClientWithHistory } from '@/lib/clientsService';
import { Loader2 } from 'lucide-react';

const UpdateFollowUpModal = ({ isOpen, onClose, client, onSave }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [followUpAt, setFollowUpAt] = useState('');
  const [effectiveAt, setEffectiveAt] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (client && isOpen) {
      setFollowUpAt(client.client_follow_up_at ? new Date(client.client_follow_up_at).toISOString().slice(0, 16) : '');
      setEffectiveAt(new Date().toISOString().slice(0, 16));
      setNote('');
    }
  }, [client, isOpen]);

  const handleSubmit = async () => {
    if (!effectiveAt) {
      toast({ title: "Error", description: "Fecha efectiva es obligatoria", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const updates = {
        client_follow_up_at: followUpAt ? new Date(followUpAt).toISOString() : null,
      };
      
      await updateClientWithHistory(client.id, updates, new Date(effectiveAt).toISOString(), note);
      
      toast({ title: "Éxito", description: "Follow-up updated successfully" });
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
      <DialogContent className="sm:max-w-[425px] z-50">
        <DialogHeader>
          <DialogTitle>Actualizar Seguimiento: {client.prospect_name || client.client_name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Nueva Fecha de Seguimiento</Label>
            <Input 
              type="datetime-local" 
              value={followUpAt} 
              onChange={(e) => setFollowUpAt(e.target.value)} 
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
              placeholder="Detalles del seguimiento..."
              className="text-gray-900"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !effectiveAt}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Seguimiento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateFollowUpModal;