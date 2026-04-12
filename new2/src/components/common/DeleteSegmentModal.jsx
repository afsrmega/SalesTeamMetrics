
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const DeleteSegmentModal = ({ isOpen, onClose, onDelete, segmentName }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await onDelete();
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
          <DialogTitle>Eliminar Segmento</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>¿Estás seguro de que deseas eliminar el segmento <strong>'{segmentName}'</strong>?</p>
          <p className="text-sm text-muted-foreground mt-2">Esta acción no se puede deshacer.</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteSegmentModal;
