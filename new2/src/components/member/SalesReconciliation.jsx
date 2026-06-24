
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { 
  FileSpreadsheet, FileCheck2, AlertCircle, Loader2, ArrowRightLeft, 
  Trash2, PlusCircle, Edit3, Eye, Download, Info
} from "lucide-react";
import { 
  parseExcelFile, normalizeRows, compareSalesData, 
  buildRecommendedActions, exportRowsToExcel, exportFullReconciliationReport 
} from '@/lib/salesReconciliationUtils';

const SalesReconciliation = () => {
  const { toast } = useToast();
  
  const [officialFile, setOfficialFile] = useState(null);
  const [crmFile, setCrmFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState("actions");

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === 'official') setOfficialFile(file);
    if (type === 'crm') setCrmFile(file);
  };

  const handleProcess = async () => {
    if (!officialFile || !crmFile) return;
    
    setIsProcessing(true);
    setError(null);
    setResults(null);
    
    try {
      // Parse
      const rawOfficial = await parseExcelFile(officialFile);
      const rawCrm = await parseExcelFile(crmFile);
      
      // Normalize
      const { normalized: offNorm, problemRows: offProbs } = normalizeRows(rawOfficial, officialFile.name);
      const { normalized: crmNorm, problemRows: crmProbs } = normalizeRows(rawCrm, crmFile.name);
      
      // Compare
      const comparison = compareSalesData(offNorm, crmNorm);
      
      // Build Actions
      const actions = buildRecommendedActions(comparison);
      
      // Summarize
      const summary = {
        officialTotal: offNorm.reduce((s, r) => s + (r.value || 0), 0),
        crmTotal: crmNorm.reduce((s, r) => s + (r.value || 0), 0),
        okCount: comparison.ok.length,
        addCount: actions.filter(a => a.action === 'ADD').length,
        deleteCount: actions.filter(a => a.action === 'DELETE').length,
        deleteDupCount: actions.filter(a => a.action === 'DELETE_DUPLICATE').length,
        modifyCount: actions.filter(a => a.action === 'MODIFY_VALUE').length,
        reviewCount: actions.filter(a => a.action === 'REVIEW_MANUALLY').length,
        problemCount: offProbs.length + crmProbs.length
      };

      setResults({
        actions,
        comparison,
        problemRows: [...offProbs, ...crmProbs],
        summary,
        allComparisonList: [
          ...comparison.ok, ...comparison.add, ...comparison.delete, 
          ...comparison.deleteDuplicate, ...comparison.modifyValue, ...comparison.reviewManually
        ]
      });

      toast({ title: "Procesamiento Completo", description: "Se han generado las recomendaciones de conciliación." });
    } catch (err) {
      console.error(err);
      setError(err.message || "Ocurrió un error al procesar los archivos.");
      toast({ title: "Error", description: "Fallo al procesar archivos.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setOfficialFile(null);
    setCrmFile(null);
    setResults(null);
    setError(null);
    // Reset file inputs by finding them
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs.forEach(i => i.value = '');
  };

  const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const getActionBadge = (action) => {
    switch(action) {
      case 'ADD': return <Badge className="bg-blue-100 text-blue-800 border-none"><PlusCircle className="w-3 h-3 mr-1"/> ADD</Badge>;
      case 'DELETE': return <Badge className="bg-red-100 text-red-800 border-none"><Trash2 className="w-3 h-3 mr-1"/> DELETE</Badge>;
      case 'DELETE_DUPLICATE': return <Badge className="bg-orange-100 text-orange-800 border-none"><Trash2 className="w-3 h-3 mr-1"/> DUP</Badge>;
      case 'MODIFY_VALUE': return <Badge className="bg-yellow-100 text-yellow-800 border-none"><Edit3 className="w-3 h-3 mr-1"/> MODIFY</Badge>;
      case 'REVIEW_MANUALLY': return <Badge className="bg-purple-100 text-purple-800 border-none"><Eye className="w-3 h-3 mr-1"/> REVIEW</Badge>;
      case 'OK': return <Badge className="bg-green-100 text-green-800 border-none"><FileCheck2 className="w-3 h-3 mr-1"/> OK</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 text-blue-900 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 font-semibold">Modo de Solo Lectura</AlertTitle>
        <AlertDescription className="text-blue-700 text-sm">
          Este módulo no modifica la base de datos automáticamente. Genera recomendaciones y archivos exportables para que realices los ajustes necesarios manualmente.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-500 font-semibold uppercase flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Official Sales List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => handleFileChange(e, 'official')} className="cursor-pointer" />
            {officialFile && <p className="text-xs text-slate-500 mt-2">Cargado: {officialFile.name}</p>}
          </CardContent>
        </Card>
        
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-500 font-semibold uppercase flex items-center gap-2">
              <FileCheck2 className="w-4 h-4" /> CRM Sales Register
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => handleFileChange(e, 'crm')} className="cursor-pointer" />
            {crmFile && <p className="text-xs text-slate-500 mt-2">Cargado: {crmFile.name}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Button 
          onClick={handleProcess} 
          disabled={!officialFile || !crmFile || isProcessing}
          className="bg-primary text-primary-foreground"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
          Procesar Conciliación
        </Button>
        <Button variant="outline" onClick={handleClear} disabled={isProcessing || (!officialFile && !crmFile && !results)}>
          Limpiar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error en el procesamiento</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isProcessing && (
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      )}

      {results && !isProcessing && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="shadow-sm border-slate-200"><CardContent className="p-4"><p className="text-xs text-slate-500 font-medium">Official Total</p><p className="text-xl font-bold">{formatMoney(results.summary.officialTotal)}</p></CardContent></Card>
            <Card className="shadow-sm border-slate-200"><CardContent className="p-4"><p className="text-xs text-slate-500 font-medium">CRM Total</p><p className="text-xl font-bold">{formatMoney(results.summary.crmTotal)}</p></CardContent></Card>
            <Card className="shadow-sm border-slate-200"><CardContent className="p-4"><p className="text-xs text-slate-500 font-medium">Difference</p><p className="text-xl font-bold text-orange-600">{formatMoney(Math.abs(results.summary.officialTotal - results.summary.crmTotal))}</p></CardContent></Card>
            <Card className="shadow-sm border-slate-200"><CardContent className="p-4"><p className="text-xs text-slate-500 font-medium">Matching Clients</p><p className="text-xl font-bold text-green-600">{results.summary.okCount}</p></CardContent></Card>
            <Card className="shadow-sm border-slate-200"><CardContent className="p-4"><p className="text-xs text-slate-500 font-medium">To Add</p><p className="text-xl font-bold text-blue-600">{results.summary.addCount}</p></CardContent></Card>
            
            <Card className="shadow-sm border-slate-200"><CardContent className="p-4"><p className="text-xs text-slate-500 font-medium">To Delete</p><p className="text-xl font-bold text-red-600">{results.summary.deleteCount}</p></CardContent></Card>
            <Card className="shadow-sm border-slate-200"><CardContent className="p-4"><p className="text-xs text-slate-500 font-medium">Duplicates</p><p className="text-xl font-bold text-orange-600">{results.summary.deleteDupCount}</p></CardContent></Card>
            <Card className="shadow-sm border-slate-200"><CardContent className="p-4"><p className="text-xs text-slate-500 font-medium">To Modify</p><p className="text-xl font-bold text-yellow-600">{results.summary.modifyCount}</p></CardContent></Card>
            <Card className="shadow-sm border-slate-200"><CardContent className="p-4"><p className="text-xs text-slate-500 font-medium">Manual Review</p><p className="text-xl font-bold text-purple-600">{results.summary.reviewCount}</p></CardContent></Card>
            <Card className="shadow-sm border-slate-200"><CardContent className="p-4"><p className="text-xs text-slate-500 font-medium">Format Errors</p><p className="text-xl font-bold text-red-700">{results.summary.problemCount}</p></CardContent></Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-[600px] mb-4 bg-slate-100">
              <TabsTrigger value="actions">Acciones ({results.actions.length})</TabsTrigger>
              <TabsTrigger value="comparison">Comparación ({results.allComparisonList.length})</TabsTrigger>
              <TabsTrigger value="problems">Errores ({results.problemRows.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="actions" className="space-y-4">
              <Card>
                <CardHeader className="py-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Acciones Recomendadas</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => exportRowsToExcel(results.actions, 'Acciones_Conciliacion.xlsx')}>
                    <Download className="w-4 h-4 mr-2" /> Exportar
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="rounded-md border mx-4 mb-4 overflow-auto max-h-[500px]">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead>Acción</TableHead>
                          <TableHead>Client ID</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Motivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.actions.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-4">No hay acciones requeridas.</TableCell></TableRow>
                        ) : (
                          results.actions.map((act, i) => (
                            <TableRow key={i}>
                              <TableCell>{getActionBadge(act.action)}</TableCell>
                              <TableCell className="font-mono text-xs">{act.clientNumber}</TableCell>
                              <TableCell className="text-sm truncate max-w-[200px]" title={act.clientName}>{act.clientName}</TableCell>
                              <TableCell className="font-medium text-sm">{formatMoney(act.value)}</TableCell>
                              <TableCell className="text-xs text-slate-500">{act.reason}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comparison" className="space-y-4">
              <Card>
                <CardHeader className="py-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Comparación por Cliente</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => exportRowsToExcel(results.allComparisonList, 'Comparacion_Clientes.xlsx')}>
                    <Download className="w-4 h-4 mr-2" /> Exportar
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="rounded-md border mx-4 mb-4 overflow-auto max-h-[500px]">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead>Estado</TableHead>
                          <TableHead>Client ID</TableHead>
                          <TableHead className="text-right">Off. Total</TableHead>
                          <TableHead className="text-right">CRM Total</TableHead>
                          <TableHead className="text-right">Diff</TableHead>
                          <TableHead className="text-center">Off. Filas</TableHead>
                          <TableHead className="text-center">CRM Filas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.allComparisonList.map((comp, i) => (
                          <TableRow key={i} className={comp.difference !== 0 ? 'bg-orange-50/30' : ''}>
                            <TableCell>{getActionBadge(comp.status)}</TableCell>
                            <TableCell className="font-mono text-xs">{comp.clientNumber}</TableCell>
                            <TableCell className="text-right text-sm">{formatMoney(comp.officialTotal)}</TableCell>
                            <TableCell className="text-right text-sm">{formatMoney(comp.crmTotal)}</TableCell>
                            <TableCell className={`text-right text-sm font-medium ${comp.difference !== 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                              {formatMoney(comp.difference)}
                            </TableCell>
                            <TableCell className="text-center text-xs">{comp.officialRowCount}</TableCell>
                            <TableCell className="text-center text-xs">{comp.crmRowCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="problems" className="space-y-4">
              <Card>
                <CardHeader className="py-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Errores de Formato</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => exportRowsToExcel(results.problemRows, 'Errores_Formato.xlsx')} disabled={results.problemRows.length === 0}>
                    <Download className="w-4 h-4 mr-2" /> Exportar
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="rounded-md border mx-4 mb-4 overflow-auto max-h-[500px]">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead>Archivo</TableHead>
                          <TableHead>Fila</TableHead>
                          <TableHead>Texto Crudo</TableHead>
                          <TableHead>Problema</TableHead>
                          <TableHead>Sugerencia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.problemRows.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-4 text-slate-500">No se encontraron errores de formato.</TableCell></TableRow>
                        ) : (
                          results.problemRows.map((prob, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs max-w-[150px] truncate" title={prob.sourceFile}>{prob.sourceFile}</TableCell>
                              <TableCell className="text-xs">{prob.sourceRowNumber}</TableCell>
                              <TableCell className="font-mono text-xs">{prob.rawClientNumber || 'N/A'}</TableCell>
                              <TableCell className="text-xs text-red-600">{prob.problem}</TableCell>
                              <TableCell className="text-xs text-slate-500">{prob.suggestedFix}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-4 border-t border-slate-200 mt-6">
            <Button onClick={() => exportFullReconciliationReport(results)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Download className="w-4 h-4 mr-2" /> Descargar Reporte Completo (Excel)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReconciliation;
