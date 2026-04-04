import React, { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UploadCloud, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion } from "framer-motion";

const ExcelUploader = ({ onFileUpload, disabled }) => {
  const { toast } = useToast();
  const [fileName, setFileName] = useState("");

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            toast({ title: "Archivo Vacío", description: "El archivo Excel no contiene datos o encabezados.", variant: "destructive" });
            return;
          }

          const headers = jsonData[0].map(header => String(header).toLowerCase().trim().replace(/\s+/g, ''));
          const nameIndex = headers.indexOf("nombre");
          const monthlySalesIndex = headers.indexOf("ventas/mes") !== -1 ? headers.indexOf("ventas/mes") : headers.indexOf("ventasmes");
          const quarterlySalesIndex = headers.indexOf("ventas/quarter") !== -1 ? headers.indexOf("ventas/quarter") : headers.indexOf("ventasquarter");

          if (nameIndex === -1 || monthlySalesIndex === -1 || quarterlySalesIndex === -1) {
            toast({
              title: "Formato Incorrecto",
              description: "El archivo Excel debe tener columnas: 'Nombre', 'Ventas/Mes', 'Ventas/Quarter'.",
              variant: "destructive",
              duration: 7000,
            });
            return;
          }

          const members = jsonData.slice(1).map(row => {
            const name = row[nameIndex] ? String(row[nameIndex]).trim() : null;
            const monthlySales = row[monthlySalesIndex] !== undefined ? parseFloat(row[monthlySalesIndex]) : 0;
            const quarterlySales = row[quarterlySalesIndex] !== undefined ? parseFloat(row[quarterlySalesIndex]) : 0;
            
            if (!name) return null; 

            return {
              name,
              monthlySales: isNaN(monthlySales) ? 0 : monthlySales,
              quarterlySales: isNaN(quarterlySales) ? 0 : quarterlySales,
            };
          }).filter(member => member !== null && member.name); 

          if (members.length === 0) {
            toast({ title: "Sin Datos Válidos", description: "No se encontraron miembros válidos en el archivo.", variant: "destructive" });
            return;
          }
          onFileUpload(members);
          setFileName(""); 
          event.target.value = null; 
        } catch (error) {
          console.error("Error processing Excel file:", error);
          toast({ title: "Error al Procesar", description: "Hubo un problema al leer el archivo Excel.", variant: "destructive" });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setFileName("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="shadow-lg border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50">
          <CardTitle className="text-xl text-gray-800 flex items-center">
            <FileSpreadsheet className="mr-3 h-6 w-6 text-green-600" />
            Cargar Miembros desde Excel
            {disabled && <span className="text-xs text-red-500 ml-2">(Inicia sesión para cargar)</span>}
          </CardTitle>
          <CardDescription className="text-gray-600">
            Sube un archivo .xlsx con columnas: Nombre, Ventas/Mes, Ventas/Quarter.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label htmlFor="excel-upload" className="text-gray-700 sr-only">Cargar archivo Excel</Label>
            <Input
              id="excel-upload"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="border-gray-300 focus:border-green-500 focus:ring-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
              disabled={disabled}
            />
            {fileName && <p className="text-sm text-gray-500 mt-2">Archivo seleccionado: {fileName}</p>}
          </div>
          <p className="text-xs text-gray-500">
            Asegúrate de que los encabezados de columna coincidan (sin importar mayúsculas/minúsculas o espacios):
            "Nombre", "Ventas/Mes" (o "VentasMes"), "Ventas/Quarter" (o "VentasQuarter").
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ExcelUploader;