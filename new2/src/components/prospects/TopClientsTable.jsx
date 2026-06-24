
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, CheckCircle, Edit, Tags, Undo2, ClipboardCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TagsEditorModal from '@/components/common/TagsEditorModal';
import { assignTag, removeTag } from '@/lib/tagsService';
import { useToast } from "@/components/ui/use-toast";

const TopClientsTable = ({ 
  filteredClients, 
  isLoading, 
  onEdit, 
  onMarkFinancials, 
  onScheduleFollowUp, 
  onViewRapport,
  onRevertToProspect,
  onOpenSalesProtocol,
  refetch 
}) => {
  const { toast } = useToast();
  const [activeTagEntity, setActiveTagEntity] = useState(null);

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

  const handleSaveTags = async (tagsToAdd, tagsToRemove) => {
    if (!activeTagEntity) return;
    try {
      for (const tId of tagsToAdd) await assignTag('client', activeTagEntity.id, tId);
      for (const tId of tagsToRemove) await removeTag('client', activeTagEntity.id, tId);
      toast({ title: "Éxito", description: "Tags actualizados correctamente." });
      if (refetch) refetch();
    } catch (error) {
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Valor Est.</TableHead>
              <TableHead>Tipo Propiedad</TableHead>
              <TableHead>Pendiente Finanzas</TableHead>
              <TableHead>Protocolo</TableHead>
              <TableHead>Convertido</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!filteredClients || filteredClients.length === 0) ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-4">
                  No hay clientes.
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map(c => {
                const tags = c.client_tags?.map(ct => ct.tags).filter(Boolean) || [];
                
                // Determine Sales Protocol Progress
                const protocolCount = [
                  c.sales_protocol_spartaxx_created,
                  c.sales_protocol_scanning_completed,
                  c.sales_protocol_notes_added,
                  c.sales_protocol_docs_requested
                ].filter(Boolean).length;
                
                const isCompleted = protocolCount === 4;
                const isOverdue = !isCompleted && c.sales_protocol_due_at && new Date() > new Date(c.sales_protocol_due_at);
                const badgeClass = isCompleted 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200 border-none' 
                  : isOverdue 
                    ? 'bg-red-100 text-red-800 hover:bg-red-200 border-none' 
                    : 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-none';

                return (
                  <TableRow key={c.id} className="group">
                    <TableCell className="font-medium">{c.external_id}</TableCell>
                    <TableCell>{c.prospect_name || '—'}</TableCell>
                    <TableCell>
                      {tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {tags.map(t => (
                            <Badge 
                              key={t.id} 
                              style={{backgroundColor: t.color, color: '#fff'}} 
                              className="text-[10px] px-1 py-0 h-4"
                            >
                              {t.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(c.estimated_property_value)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.property_type || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.pending_for_financials ? (
                        <Badge variant="destructive">Sí</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={badgeClass}>
                        {protocolCount}/4
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(c.converted_at)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setActiveTagEntity({id: c.id, type: 'client', tags})}
                              aria-label="Editar Tags"
                            >
                              <Tags className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Editar Tags</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => onEdit(c)}
                              aria-label="Editar Cliente"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Editar Cliente</p></TooltipContent>
                        </Tooltip>

                        {onOpenSalesProtocol && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => onOpenSalesProtocol(c)}
                                aria-label="Checklist Protocolo de Venta"
                              >
                                <ClipboardCheck className="h-4 w-4 text-blue-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Checklist Protocolo de Venta</p></TooltipContent>
                          </Tooltip>
                        )}

                        {c.pending_for_financials && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => onMarkFinancials(c)}
                                aria-label="Marcar Finanzas Completas"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Marcar Finanzas Completas</p></TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => onScheduleFollowUp(c)}
                              aria-label="Actualizar Follow-up"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Actualizar Follow-up</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => onViewRapport(c)}
                              aria-label="Plan de Rapport"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Plan de Rapport</p></TooltipContent>
                        </Tooltip>

                        {onRevertToProspect && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => onRevertToProspect(c)}
                                aria-label="Regresar a Prospecto"
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Regresar a Prospecto</p></TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {activeTagEntity && (
        <TagsEditorModal 
          isOpen={!!activeTagEntity}
          onClose={() => setActiveTagEntity(null)}
          entityType={activeTagEntity.type}
          entityId={activeTagEntity.id}
          currentTags={activeTagEntity.tags}
          onSave={handleSaveTags}
        />
      )}
    </>
  );
};

export default TopClientsTable;
