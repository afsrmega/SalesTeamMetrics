import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, DollarSign, ImagePlus, Trash2 } from "lucide-react";

const EditMemberDialog = ({ isOpen, onOpenChange, member, onSave, currentPhotoUrl }) => {
  const [editedMember, setEditedMember] = useState({ name: "", monthlySales: "", quarterlySales: "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    if (member) {
      setEditedMember({
        name: member.name || "",
        monthlySales: member.monthlySales || "",
        quarterlySales: member.quarterlySales || "",
      });
      setPhotoPreview(member.photo_url || currentPhotoUrl || null); 
      setPhotoFile(null);
    }
  }, [member, isOpen, currentPhotoUrl]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedMember(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };
  
  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null); 
  };

  const handleSave = () => {
    onSave({ ...editedMember, photoFile, photoUrl: photoPreview }); 
    onOpenChange(false);
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-white rounded-lg shadow-xl p-0">
        <DialogHeader className="bg-gray-50 p-6 border-b">
          <DialogTitle className="text-2xl font-semibold text-gray-800 flex items-center">
            <User className="mr-3 h-6 w-6 text-green-600" />
            Editar Miembro del Equipo
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Actualiza la información y foto del miembro del equipo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center space-y-3">
            <Avatar className="h-24 w-24 border-2 border-green-200 shadow-sm">
              <AvatarImage src={photoPreview || undefined} alt={editedMember.name} />
              <AvatarFallback className="bg-gray-200 text-gray-500 text-3xl">
                {editedMember.name ? editedMember.name.charAt(0).toUpperCase() : <User />}
              </AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="relative">
                <ImagePlus className="mr-2 h-4 w-4" /> Cambiar Foto
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoChange} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </Button>
              {photoPreview && (
                <Button variant="ghost" size="sm" onClick={handleRemovePhoto} className="text-red-600 hover:bg-red-100">
                  <Trash2 className="mr-2 h-4 w-4" /> Quitar
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-name" className="text-gray-700 font-medium">Nombre</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="edit-name"
                name="name"
                value={editedMember.name}
                onChange={handleInputChange}
                placeholder="Nombre completo"
                className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-monthlySales" className="text-gray-700 font-medium">Ventas/Mes ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="edit-monthlySales"
                  name="monthlySales"
                  type="number"
                  value={editedMember.monthlySales}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-quarterlySales" className="text-gray-700 font-medium">Ventas/Quarter ($)</Label>
               <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="edit-quarterlySales"
                  name="quarterlySales"
                  type="number"
                  value={editedMember.quarterlySales}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-gray-50 p-4 border-t">
          <DialogClose asChild>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemberDialog;