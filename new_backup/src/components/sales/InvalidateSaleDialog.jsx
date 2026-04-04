import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";

const InvalidateSaleDialog = ({ isOpen, onOpenChange, onConfirm, isProcessing }) => {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason(""); // Reset for next time
  };

  const handleOpenChange = (open) => {
    if (!open) {
      setReason("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600 gap-2">
            <AlertTriangle className="h-5 w-5" />
            Invalidar Venta
          </DialogTitle>
          <DialogDescription>
            ¿Estás seguro? Esta acción removerá la venta de todas las métricas y cálculos de comisiones.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Razón de la invalidación (Opcional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Cancelación de contrato, error de ingreso..."
            className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Confirmar Invalidación"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvalidateSaleDialog;