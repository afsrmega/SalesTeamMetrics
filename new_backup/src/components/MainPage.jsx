import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SalesMetrics from "@/components/SalesMetrics";
import PropertyCalculator from "@/components/PropertyCalculator";
import PhoneIdentifier from "@/components/phone/PhoneIdentifier";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoginPage from "@/components/LoginPage"; 
import { Button } from "@/components/ui/button";
import { TrendingUp, PercentSquare, ShieldAlert, Phone } from "lucide-react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useGlobalSettingsListener } from "@/hooks/useGlobalSettingsListener";

const MainPage = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const { user, signOut, loading, setGlobalSettingsState } = useAuth();
  const { toast } = useToast();

  // Listen for global settings changes at the top level to update Context
  useGlobalSettingsListener(user?.id, (newSettings) => {
    if (newSettings) {
      setGlobalSettingsState(newSettings);
      toast({
        title: "Ajustes Actualizados",
        description: "Se han detectado cambios en la configuración global.",
        duration: 3000
      });
    }
  });

  const handleSignOut = useCallback(async () => {
    const { error } = await signOut();
    if (error) {
      toast({ title: "Error al Cerrar Sesión", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sesión Cerrada", description: "Has cerrado sesión exitosamente." });
    }
  }, [signOut, toast]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 text-gray-700">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="p-4 bg-green-600 rounded-full mb-6 shadow-lg">
          <TrendingUp className="h-10 w-10 text-white" />
        </motion.div>
        <p className="text-xl font-semibold">Verificando autenticación...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800">
      <Header user={user} onLogout={handleSignOut} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">Commercial Team Metrics</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">Métricas por Mes y Quarter.</p>
        </motion.div>

        <Tabs defaultValue="sales" value={activeTab} onValueChange={setActiveTab} className="w-full max-w-5xl mx-auto">
          <div className="flex justify-center mb-8">
            <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full sm:w-auto bg-white shadow-lg rounded-full p-1.5 border border-gray-200">
              <TabsTrigger value="sales" className="text-xs sm:text-sm py-2.5 px-3 data-[state=active]:bg-green-600 data-[state=active]:text-white rounded-full data-[state=active]:shadow-md transition-all duration-300 ease-in-out text-gray-700 font-medium flex items-center justify-center">
                <TrendingUp className="mr-1.5 h-4 w-4 sm:h-5 sm:w-5" /> Métricas de Ventas
              </TabsTrigger>
              <TabsTrigger value="propertyTools" className="text-xs sm:text-sm py-2.5 px-3 data-[state=active]:bg-green-600 data-[state=active]:text-white rounded-full data-[state=active]:shadow-md transition-all duration-300 ease-in-out text-gray-700 font-medium flex items-center justify-center">
                <PercentSquare className="mr-1.5 h-4 w-4 sm:h-5 sm:w-5" /> Herramientas Prop.
              </TabsTrigger>
              <TabsTrigger value="phoneIdentifier" className="text-xs sm:text-sm py-2.5 px-3 data-[state=active]:bg-green-600 data-[state=active]:text-white rounded-full data-[state=active]:shadow-md transition-all duration-300 ease-in-out text-gray-700 font-medium flex items-center justify-center">
                <Phone className="mr-1.5 h-4 w-4 sm:h-5 sm:w-5" /> Identificar Número
              </TabsTrigger>
            </TabsList>
          </div>

          <motion.div key={activeTab} initial={{ opacity: 0, x: 0 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} className="w-full">
            <TabsContent value="sales" className="mt-0">
              {user ? <SalesMetrics /> : <AuthErrorFallback />}
            </TabsContent>
            
            <TabsContent value="propertyTools" className="mt-0"> 
              {user ? <PropertyCalculator /> : <AuthErrorFallback />}
            </TabsContent>

            <TabsContent value="phoneIdentifier" className="mt-0">
              {user ? <PhoneIdentifier /> : <AuthErrorFallback />}
            </TabsContent>
          </motion.div>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

const AuthErrorFallback = () => {
  const { signOut } = useAuth();
  return (
    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-red-300 rounded-lg bg-red-50 text-red-700">
      <ShieldAlert className="h-12 w-12 mb-4" />
      <h2 className="text-xl font-semibold mb-2">Error de Autenticación</h2>
      <Button onClick={() => signOut().then(() => window.location.reload())} className="mt-4 bg-red-600 hover:bg-red-700">
        Cerrar Sesión y Recargar
      </Button>
    </div>
  );
};

export default MainPage;