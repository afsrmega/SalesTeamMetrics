import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const SavedSegmentsModal = ({ isOpen, onClose, onSave, currentFilters, scope }) => {
  const [name, setName] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSave(name.trim(), isFavorite);
      setName('');
      setIsFavorite(false);
      onClose();
    } catch (err) {
      // Error handled in parent via toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
      else { setName(''); setIsFavorite(false); }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Guardar Segmento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="segmentName">Nombre del segmento</Label>
            <Input 
              id="segmentName" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Ej. Clientes VIP en Texas"
              autoFocus
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isFavorite" 
              checked={isFavorite} 
              onCheckedChange={setIsFavorite} 
            />
            <Label htmlFor="isFavorite" className="cursor-pointer">Marcar como favorito ⭐</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SavedSegmentsModal;