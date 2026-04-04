import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Link as LinkIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fetchAuthUsersList, linkSalesMemberToUser } from '@/lib/salesService';

const LinkUserDialog = ({ isOpen, onOpenChange, salesTeam, onLinkSuccess }) => {
  const { toast } = useToast();
  const [authUsers, setAuthUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Selection states
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedAuthId, setSelectedAuthId] = useState("");

  // Derived lists
  const unlinkedMembers = salesTeam.filter(m => !m.linkedUserId);
  const unlinkedAuthUsers = authUsers.filter(u => 
    !salesTeam.some(m => m.linkedUserId === u.id)
  );

  useEffect(() => {
    if (isOpen) {
      loadAuthUsers();
      setSelectedMemberId("");
      setSelectedAuthId("");
    }
  }, [isOpen]);

  const loadAuthUsers = async () => {
    setLoading(true);
    try {
      const users = await fetchAuthUsersList();
      setAuthUsers(users || []);
    } catch (error) {
      console.error("Failed to load auth users:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios del sistema.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!selectedMemberId || !selectedAuthId) return;
    
    setSubmitting(true);
    try {
      await linkSalesMemberToUser(selectedMemberId, selectedAuthId);
      
      toast({
        title: "Enlace Exitoso",
        description: "El miembro del equipo ha sido vinculado al usuario correctamente.",
      });
      
      if (onLinkSuccess) onLinkSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error al vincular",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <LinkIcon className="w-5 h-5 mr-2 text-blue-600"/> 
            Vincular Usuario a Miembro
          </DialogTitle>
          <DialogDescription>
            Conecta manualmente un miembro del equipo de ventas existente con una cuenta de usuario (email/password) registrada.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {unlinkedMembers.length === 0 ? (
               <div className="flex items-center p-4 bg-green-50 text-green-700 rounded-md">
                  <CheckCircle2 className="h-5 w-5 mr-3" />
                  <p>¡Todo en orden! Todos los miembros del equipo están vinculados.</p>
               </div>
            ) : (
                <>
                    <div className="space-y-2">
                        <Label>1. Selecciona Miembro del Equipo (Sin vincular)</Label>
                        <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                            <SelectTrigger>
                            <SelectValue placeholder="Seleccionar miembro..." />
                            </SelectTrigger>
                            <SelectContent>
                            {unlinkedMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                {member.name} (Ventas: ${member.monthlySales})
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>2. Selecciona Usuario del Sistema (Email)</Label>
                        <Select value={selectedAuthId} onValueChange={setSelectedAuthId}>
                            <SelectTrigger>
                            <SelectValue placeholder="Seleccionar email..." />
                            </SelectTrigger>
                            <SelectContent>
                            {unlinkedAuthUsers.length === 0 ? (
                                <SelectItem value="none" disabled>No hay usuarios disponibles</SelectItem>
                            ) : (
                                unlinkedAuthUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.email}
                                </SelectItem>
                                ))
                            )}
                            </SelectContent>
                        </Select>
                        {unlinkedAuthUsers.length === 0 && (
                            <p className="text-xs text-amber-600 mt-1">
                                <AlertCircle className="w-3 h-3 inline mr-1"/>
                                No se encontraron usuarios libres. Crea uno nuevo en el formulario de "Añadir Miembro".
                            </p>
                        )}
                    </div>
                </>
            )}
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleLink} 
            disabled={!selectedMemberId || !selectedAuthId || submitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Vinculando...
                </>
            ) : (
                "Confirmar Enlace"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LinkUserDialog;