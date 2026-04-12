
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

const UpdateFollowUpModal = ({ isOpen, onClose, onSave, prospect, isLoading }) => {
  const [followUpAt, setFollowUpAt] = useState('');
  const [lastContactDate, setLastContactDate] = useState('');
  const [effectiveAt, setEffectiveAt] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen && prospect) {
      setFollowUpAt(prospect.follow_up_at ? new Date(prospect.follow_up_at).toISOString().slice(0, 16) : '');
      setLastContactDate(new Date().toISOString().split('T')[0]); // Default to today
      setEffectiveAt(new Date().toISOString().slice(0, 16));
      setNote('');
    }
  }, [isOpen, prospect]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!followUpAt || !effectiveAt) return;

    onSave(
      prospect.id,
      {
        follow_up_at: new Date(followUpAt).toISOString(),
        last_contact_date: lastContactDate ? lastContactDate : null
      },
      new Date(effectiveAt).toISOString(),
      note
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Actualizar Seguimiento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Fecha de Último Contacto</Label>
            <Input 
              type="date" 
              value={lastContactDate} 
              onChange={(e) => setLastContactDate(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Nuevo Follow-Up *</Label>
            <Input 
              type="datetime-local" 
              value={followUpAt} 
              onChange={(e) => setFollowUpAt(e.target.value)} 
              required 
            />
          </div>

          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="font-semibold text-sm">Registro de Historial</h3>
            <div className="space-y-2">
              <Label>Fecha Efectiva *</Label>
              <Input 
                type="datetime-local" 
                value={effectiveAt} 
                onChange={(e) => setEffectiveAt(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Nota del Seguimiento (Opcional)</Label>
              <textarea 
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                placeholder="Detalles de la conversación..." 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading || !followUpAt || !effectiveAt}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateFollowUpModal;
