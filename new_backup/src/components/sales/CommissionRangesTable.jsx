import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { TrendingUp, Award, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useColorPreferences } from "@/hooks/useColorPreferences";

const CommissionRangesTable = ({ currentQuotaPercent }) => {
  const { globalSettings } = useAuth();
  useColorPreferences();
  const tiers = globalSettings?.commission_tiers || [];

  return (
    <Card className="shadow-lg border-custom-primary card-custom">
      <CardHeader className="border-b border-gray-100 bg-gray-50/50">
        <CardTitle className="text-lg font-semibold text-custom-text flex items-center">
          <TrendingUp className="mr-2 h-5 w-5 text-custom-primary" />
          Tabla de Comisiones (Sobre Billing)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {!tiers || tiers.length === 0 ? (
           <div className="p-4">
             <Alert variant="destructive">
               <AlertCircle className="h-4 w-4" />
               <AlertDescription>No hay rangos de comisión configurados. Contacta al administrador.</AlertDescription>
             </Alert>
           </div>
        ) : (
          <Table>
            <TableHeader>
               <TableRow className="bg-gray-50 hover:bg-gray-50">
                   <TableHead className="text-custom-text opacity-70">Rango de Cuota % (Billing)</TableHead>
                   <TableHead className="text-right text-custom-text opacity-70">Tasa Comisión</TableHead>
                   <TableHead className="text-center w-[50px]"></TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
                 {tiers.map((tier, idx) => {
                     const isCurrent = currentQuotaPercent !== undefined && 
                                       currentQuotaPercent >= parseFloat(tier.min) && 
                                       currentQuotaPercent <= parseFloat(tier.max);
                     
                     return (
                         <TableRow key={idx} className={isCurrent ? "bg-custom-primary-light border-l-4 border-l-custom-primary" : ""}>
                             <TableCell className="font-medium text-custom-text">
                                 {tier.min}% - {tier.max}%
                             </TableCell>
                             <TableCell className="text-right font-bold text-custom-primary">
                                 {tier.rate}%
                             </TableCell>
                             <TableCell>
                                 {isCurrent && <Badge className="bg-custom-secondary hover:bg-custom-secondary/90"><Award className="w-3 h-3" /></Badge>}
                             </TableCell>
                         </TableRow>
                     );
                 })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default CommissionRangesTable;