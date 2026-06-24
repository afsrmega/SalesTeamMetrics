
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { User, DollarSign, ImagePlus, Trash2, Calendar } from "lucide-react";
import { isAdminMember } from "@/lib/memberUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const EditMemberDialog = ({ isOpen, onOpenChange, member, onSave, currentPhotoUrl }) => {
  const [editedMember, setEditedMember] = useState({ 
    name: "", 
    monthlySales: "", 
    quarterlySales: "",
    is_new_member: false,
    new_member_start_date: ""
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (member) {
      setEditedMember({
        name: member.name || "",
        monthlySales: member.monthlySales || "",
        quarterlySales: member.quarterlySales || "",
        is_new_member: member.is_new_member || false,
        new_member_start_date: member.new_member_start_date || ""
      });
      setPhotoPreview(member.photo_url || currentPhotoUrl || null); 
      setPhotoFile(null);
      setError(null);
    }
  }, [member, isOpen, currentPhotoUrl]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedMember(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked) => {
    setEditedMember(prev => ({ ...prev, is_new_member: checked }));
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
    if (editedMember.is_new_member && !editedMember.new_member_start_date) {
      setError("Start date is required for new members");
      return;
    }
    setError(null);
    
    onSave({ 
      ...editedMember, 
      photoFile, 
      photoUrl: photoPreview,
      new_member_start_date: editedMember.is_new_member ? (editedMember.new_member_start_date || null) : null
    }); 
    onOpenChange(false);
  };

  if (!member) return null;

  const isAdmin = isAdminMember(member);

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
              <Button variant="outline" size="sm" className="relative" disabled={isAdmin}>
                <ImagePlus className="mr-2 h-4 w-4" /> Cambiar Foto
                {!isAdmin && (
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoChange} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                )}
              </Button>
              {photoPreview && !isAdmin && (
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
                disabled={isAdmin}
                placeholder="Nombre completo"
                className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500 disabled:opacity-50"
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
                  disabled={isAdmin}
                  placeholder="0"
                  className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500 disabled:opacity-50"
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
                  disabled={isAdmin}
                  placeholder="0"
                  className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 pb-2 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="edit-is_new_member" 
                checked={editedMember.is_new_member} 
                onCheckedChange={handleCheckboxChange} 
                disabled={isAdmin}
              />
              <Label htmlFor="edit-is_new_member" className={`font-medium text-gray-700 ${isAdmin ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                Is this a new member? (Onboarding goals)
              </Label>
            </div>
            
            {editedMember.is_new_member && (
              <div className="space-y-2 pl-6 animate-in slide-in-from-top-2">
                <Label htmlFor="edit-new_member_start_date" className="text-sm text-gray-600">Onboarding Start Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="edit-new_member_start_date"
                    name="new_member_start_date"
                    type="date"
                    value={editedMember.new_member_start_date || ""}
                    onChange={handleInputChange}
                    disabled={isAdmin}
                    className="pl-10 h-9 border-gray-300 focus:border-green-500 focus:ring-green-500 disabled:opacity-50"
                  />
                </div>
                {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="bg-gray-50 p-4 border-t">
          <DialogClose asChild>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">Cancelar</Button>
          </DialogClose>
          {isAdmin ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button disabled className="bg-green-600/50 text-white cursor-not-allowed">
                      Guardar Cambios
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Admin users cannot be archived or deleted</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">Guardar Cambios</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemberDialog;
