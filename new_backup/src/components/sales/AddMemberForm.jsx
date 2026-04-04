import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Lock, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";

const AddMemberForm = ({ newMember, onInputChange, onAddMember, onPhotoChange, disabled }) => {
  const { toast } = useToast();
  const [isCreatingAuth, setIsCreatingAuth] = useState(false);
  const [authData, setAuthData] = useState({
    email: "",
    password: ""
  });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onPhotoChange(e.target.files[0]);
    } else {
      onPhotoChange(null);
    }
  };

  const handleAuthChange = (e) => {
    setAuthData({ ...authData, [e.target.name]: e.target.value });
  };

  const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const handleAddMember = async () => {
    const trimmedEmail = authData.email.trim();

    // 1. Basic Validation
    if (!newMember.name) {
       toast({ title: "Campo Faltante", description: "El nombre es obligatorio.", variant: "destructive" });
       return;
    }
    
    // Check if user intends to create login credentials
    const hasCredentials = trimmedEmail && authData.password;
    
    // If credentials provided, validate them
    if (hasCredentials && !validateEmail(trimmedEmail)) {
      toast({ title: "Email Inválido", description: "Por favor ingresa una dirección válida.", variant: "destructive" });
      return;
    }

    // Start process
    setIsCreatingAuth(true);

    try {
      let linkedUserId = null;
      let finalEmail = null;

      // 2. Create Auth User (Only if credentials provided)
      if (hasCredentials) {
        console.log("Creating auth user via Edge Function for:", trimmedEmail);
        
        const { data, error } = await supabase.functions.invoke('create-sales-member-auth', {
          body: {
            email: trimmedEmail,
            password: authData.password,
            memberName: newMember.name
          }
        });

        if (error) throw new Error(error.message || "Failed to contact auth service");
        if (data?.error) throw new Error(data.error);
        if (!data?.userId) throw new Error("Service returned no user ID");

        linkedUserId = data.userId;
        finalEmail = data.email;
        console.log("Auth user created. ID:", linkedUserId);
      }

      // 3. Create Sales Team Record
      // We pass the new linkedUserId (or null) to the parent handler
      // The parent handler calls addSalesMember which handles the INSERT
      await onAddMember({
        linkedUserId: linkedUserId,
        email: finalEmail
      });

      // 4. Success & Cleanup
      setAuthData({ email: "", password: "" });
      
      let successMsg = "Miembro añadido correctamente.";
      if (linkedUserId) {
        successMsg += " Usuario vinculado y credenciales creadas.";
      }
      
      toast({
        title: "Éxito",
        description: successMsg,
      });

    } catch (error) {
      console.error("Error creating member:", error);
      toast({
        title: "Error",
        description: error.message || "Hubo un error al crear el miembro.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingAuth(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="shadow-lg border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50">
          <CardTitle className="text-xl text-gray-800 flex items-center">
            <UserPlus className="mr-3 h-6 w-6 text-green-600" />
            Añadir Nuevo Miembro de Ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">Datos de Perfil</h3>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">Nombre del Miembro</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ej: Laura Gómez"
                  value={newMember.name}
                  onChange={onInputChange}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                  disabled={disabled || isCreatingAuth}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo" className="text-gray-700">Foto (Opcional)</Label>
                <div className="flex items-center space-x-3">
                  <Input
                    id="photo"
                    name="photo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="border-gray-300 file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                    disabled={disabled || isCreatingAuth}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2 flex items-center"><Lock className="w-4 h-4 mr-2"/> Credenciales de Acceso</h3>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Email (Usuario)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="usuario@empresa.com"
                  value={authData.email}
                  onChange={handleAuthChange}
                  className="border-gray-300 focus:border-green-500"
                  disabled={disabled || isCreatingAuth}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Contraseña</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={authData.password}
                  onChange={handleAuthChange}
                  className="border-gray-300 focus:border-green-500"
                  disabled={disabled || isCreatingAuth}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                *Dejar vacío si no se desea crear acceso al sistema para este usuario.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="monthlySales" className="text-gray-700">Ventas Mes Inicial ($)</Label>
              <Input
                id="monthlySales"
                name="monthlySales"
                type="number"
                placeholder="0"
                value={newMember.monthlySales}
                onChange={onInputChange}
                disabled={disabled || isCreatingAuth}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quarterlySales" className="text-gray-700">Ventas Q Inicial ($)</Label>
              <Input
                id="quarterlySales"
                name="quarterlySales"
                type="number"
                placeholder="0"
                value={newMember.quarterlySales}
                onChange={onInputChange}
                disabled={disabled || isCreatingAuth}
              />
            </div>
          </div>

          <Button 
            onClick={handleAddMember} 
            className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-base font-semibold shadow-md" 
            disabled={disabled || isCreatingAuth}
          >
            {isCreatingAuth ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-5 w-5" /> Crear Miembro
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AddMemberForm;