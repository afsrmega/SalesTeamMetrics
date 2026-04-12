import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { LogIn, UserCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const SalesLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await signIn(email, password);

      if (error) {
        // Error toast handled by context
      } else if (data?.user) {
        // Check if user is actually a sales member
        if (data.user.user_metadata?.isSalesMember) {
             navigate("/sales-dashboard");
        } else {
             // If admin tries to log in here, we could allow it or redirect
             toast({ title: "Aviso", description: "Detectada cuenta de administrador. Redirigiendo..." });
             navigate("/admin");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-t-4 border-blue-600">
          <CardHeader className="bg-white text-center pb-2">
            <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-3">
               <UserCircle2 className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              Portal de Ventas
            </CardTitle>
            <CardDescription>
              Acceso exclusivo para miembros del equipo
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                   className="bg-gray-50"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? "Iniciando..." : (
                  <><LogIn className="mr-2 h-4 w-4" /> Entrar al Dashboard</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="text-center mt-6">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-800 underline">¿Eres Administrador? Ingresa aquí</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default SalesLoginPage;