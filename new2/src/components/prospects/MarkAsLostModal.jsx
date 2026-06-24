import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const REASONS = [
  "Wrong contact",
  "Not interested",
  "Timing",
  "Competitor",
  "No response",
  "Already represented",
  "Budget/No need",
  "Other"
];

const MarkAsLostModal = ({ isOpen, onClose, onConfirm, prospect }) => {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 16));
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reason) {
      setError('Por favor selecciona una razón.');
      return;
    }
    onConfirm(reason, notes, new Date(effectiveDate).toISOString());
    setReason('');
    setNotes('');
    setError('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Marcar como Perdido</DialogTitle>
          <p className="text-sm text-muted-foreground">Prospecto: {prospect?.prospect_name}</p>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason" className={error ? "text-destructive" : ""}>Razón *</Label>
            <Select value={reason} onValueChange={(val) => { setReason(val); setError(''); }}>
              <SelectTrigger id="reason" className={error ? "border-destructive" : ""}>
                <SelectValue placeholder="Selecciona una razón" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea 
              id="notes" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Detalles adicionales..."
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
          <Button variant="destructive" onClick={handleConfirm}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarkAsLostModal;