
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { LogIn, Briefcase, AlertTriangle } from "lucide-react";

const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { signIn } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await signIn(email, password);

      if (error) {
        console.error("Login failed:", error);
      } else if (data?.user && data?.session) {
        onLoginSuccess(data.user);
      } else {
        toast({
          title: "Login Incomplete",
          description: "Could not establish a valid session. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Exception during login:", err);
      toast({
        title: "System Error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-400 via-teal-500 to-blue-600 p-4">
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-transparent overflow-hidden">
          <CardHeader className="bg-white/80 backdrop-blur-sm p-8 text-center border-b border-gray-200/50">
            <div className="inline-block p-4 bg-green-600 rounded-full mb-4 shadow-lg">
              <Briefcase className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-800">
              Commercial Metrics
            </CardTitle>
            <CardDescription className="text-gray-600 pt-2">
              Access your metrics and tools dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 bg-white">
            <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">Username or Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="text" 
                  placeholder="Email o usuario"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/50 transition-all text-gray-900"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/50 transition-all text-gray-900"
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105" disabled={isLoading}>
                {isLoading ? "Signing In..." : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" /> Sign In
                  </>
                )}
              </Button>
            </form>
            <div className="mt-6 text-xs text-center text-gray-500">
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 flex items-start justify-center gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Using Supabase Authentication.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <footer className="text-center mt-8 text-white/80 text-sm">
        <p>&copy; {new Date().getFullYear()} Commercial Team Metrics. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LoginPage;
