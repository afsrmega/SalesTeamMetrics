import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DeleteSaleDialog = ({ isOpen, onOpenChange, onConfirm, isProcessing }) => {
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const handleConfirm = () => {
    if (reason.trim().length < 5) {
      toast({ title: "Error", description: "La razón debe tener al menos 5 caracteres.", variant: "destructive" });
      return;
    }
    onConfirm(reason);
    setReason(""); // Reset for next use
  };

  const handleOpenChange = (open) => {
    if (!open) setReason("");
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-red-600">Eliminar Venta</DialogTitle>
          <DialogDescription>
            ¿Estás seguro? Esta acción removerá la venta de todas las métricas. Solo se permite dentro de las primeras 48 horas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Razón de eliminación <span className="text-red-500">*</span></Label>
            <textarea 
              id="reason"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-gray-900"
              placeholder="Explica brevemente por qué estás eliminando esta venta..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isProcessing}
            />
            {reason.trim().length > 0 && reason.trim().length < 5 && (
              <span className="text-xs text-red-500">Mínimo 5 caracteres</span>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={isProcessing || reason.trim().length < 5}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Eliminar Venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteSaleDialog;