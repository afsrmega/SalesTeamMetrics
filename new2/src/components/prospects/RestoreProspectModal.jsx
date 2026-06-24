import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const RestoreProspectModal = ({ isOpen, onClose, onConfirm, prospect }) => {
  const [notes, setNotes] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 16));

  const handleConfirm = () => {
    onConfirm(notes, new Date(effectiveDate).toISOString());
    setNotes('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Restaurar Prospecto</DialogTitle>
          <p className="text-sm text-muted-foreground">Prospecto: {prospect?.prospect_name}</p>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea 
              id="notes" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Razón de restauración..."
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="effectiveDate">Fecha Efectiva *</Label>
            <Input 
              id="effectiveDate" 
              type="datetime-local" 
              value={effectiveDate} 
              onChange={(e) => setEffectiveDate(e.target.value)} 
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm}>Restaurar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RestoreProspectModal;