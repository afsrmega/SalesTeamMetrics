import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const RenameSegmentModal = ({ isOpen, onClose, onRename, currentName }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setName(currentName || '');
  }, [isOpen, currentName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentName) return;
    
    setIsSubmitting(true);
    try {
      await onRename(name.trim());
      onClose();
    } catch (err) {
      // Error handled in parent via toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renombrar Segmento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="renameSegment">Nuevo nombre</Label>
            <Input 
              id="renameSegment" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || name.trim() === currentName}>
              Renombrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RenameSegmentModal;