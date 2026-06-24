import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";

const RevertClientModal = ({ isOpen, onClose, client, onConfirm, isLoading }) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(reason);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-orange-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Regresar a Prospecto
          </DialogTitle>
          <DialogDescription className="pt-2">
            ¿Seguro que deseas regresar este cliente a prospecto? Esto lo removerá de la lista de clientes y lo devolverá al pipeline de prospectos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="warning" className="bg-orange-50 border-orange-200">
            <AlertDescription className="text-sm text-orange-800">
              <strong>Cliente:</strong> {client?.prospect_name || 'N/A'}
              <br />
              <strong>ID:</strong> {client?.external_id || 'N/A'}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="revert-reason">Razón (opcional)</Label>
            <Input
              id="revert-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Error en conversión, cliente canceló proceso..."
              disabled={isLoading}
              className="text-gray-900"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Procesando..." : "Regresar a Prospecto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RevertClientModal;