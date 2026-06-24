
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, ImagePlus, User, DollarSign, Calendar, Mail } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AddMemberForm = ({ newMember, onInputChange, onAddMember, onPhotoChange, disabled }) => {
  const [error, setError] = useState(null);

  const isValidEmail = (email) => {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const emailError = newMember.email && !isValidEmail(newMember.email) ? "Invalid email format" : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMember.is_new_member && !newMember.new_member_start_date) {
      setError("Start date is required for new members");
      return;
    }
    if (!isValidEmail(newMember.email)) {
      setError("Please enter a valid email address");
      return;
    }
    setError(null);
    onAddMember(e);
  };

  const handleCheckboxChange = (checked) => {
    onInputChange({ target: { name: 'is_new_member', value: checked }});
  };

  const isSubmitDisabled = disabled || !newMember.name || !newMember.email || !isValidEmail(newMember.email);

  return (
    <Card className="shadow-md border-t-4 border-t-green-500">
      <CardHeader className="bg-gray-50 pb-4 border-b">
        <CardTitle className="text-xl font-semibold text-gray-800 flex items-center">
          <UserPlus className="mr-2 h-6 w-6 text-green-600" />
          Añadir Miembro
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-700 font-medium">Nombre *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="name"
                name="name"
                value={newMember.name || ""}
                onChange={onInputChange}
                placeholder="Nombre completo"
                required
                disabled={disabled}
                className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700 font-medium">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="email"
                name="email"
                type="email"
                value={newMember.email || ""}
                onChange={onInputChange}
                placeholder="correo@ejemplo.com"
                required
                disabled={disabled}
                className={`pl-10 border-gray-300 ${emailError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'focus:border-green-500 focus:ring-green-500'}`}
              />
            </div>
            {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Tipo de usuario *</Label>
            <Select
              value={newMember.role || "member"}
              onValueChange={(value) => onInputChange({ target: { name: 'role', value } })}
              disabled={disabled}
            >
              <SelectTrigger className="w-full border-gray-300 focus:ring-green-500">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Miembro normal</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
            {newMember.role === 'admin' && (
              <p className="text-sm text-amber-600 mt-1">⚠️ Este usuario tendrá acceso al dashboard de administrador.</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlySales" className="text-gray-700 font-medium">Ventas/Mes ($)</Label>
               <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="monthlySales"
                  name="monthlySales"
                  type="number"
                  value={newMember.monthlySales || ""}
                  onChange={onInputChange}
                  placeholder="0"
                  disabled={disabled}
                  className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quarterlySales" className="text-gray-700 font-medium">Ventas/Trim ($)</Label>
               <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="quarterlySales"
                  name="quarterlySales"
                  type="number"
                  value={newMember.quarterlySales || ""}
                  onChange={onInputChange}
                  placeholder="0"
                  disabled={disabled}
                  className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 pb-2 border-t border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_new_member" 
                checked={newMember.is_new_member || false} 
                onCheckedChange={handleCheckboxChange} 
                disabled={disabled}
              />
              <Label htmlFor="is_new_member" className="font-medium cursor-pointer">
                Is this a new member? (Onboarding goals)
              </Label>
            </div>
            
            {newMember.is_new_member && (
              <div className="space-y-2 pl-6 animate-in slide-in-from-top-2">
                <Label htmlFor="new_member_start_date" className="text-sm text-gray-600">Onboarding Start Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="new_member_start_date"
                    name="new_member_start_date"
                    type="date"
                    value={newMember.new_member_start_date || ""}
                    onChange={onInputChange}
                    disabled={disabled}
                    className="pl-10 h-9"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Goals automatically scale: Month 1 (25%), Month 2 (50%), Month 3 (75%).
                </p>
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo" className="text-gray-700 font-medium">Foto de Perfil (Opcional)</Label>
            <div className="flex items-center gap-4">
              <Button type="button" variant="outline" className="w-full relative overflow-hidden bg-gray-50 hover:bg-gray-100 text-gray-700 border-dashed border-2">
                 <ImagePlus className="mr-2 h-4 w-4" />
                 {newMember.photoFile ? "Cambiar Foto" : "Seleccionar Archivo"}
                 <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => onPhotoChange(e.target.files[0])}
                    disabled={disabled}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 />
              </Button>
              {newMember.photoUrl && (
                 <img src={newMember.photoUrl} alt="Preview" className="w-10 h-10 rounded-full border shadow-sm object-cover" />
              )}
            </div>
          </div>
          
          <Button type="submit" disabled={isSubmitDisabled} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2">
            Añadir Miembro
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddMemberForm;
