
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, ArrowRight, Edit, Tags, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TagsEditorModal from '@/components/common/TagsEditorModal';
import { assignTag, removeTag } from '@/lib/tagsService';
import { useToast } from "@/components/ui/use-toast";

const TopProspectsTable = ({ filteredProspects, onEdit, onConvert, onScheduleFollowUp, onOpenNotesDrawer, onMarkAsLost, isLoading, refetch }) => {
  const { toast } = useToast();
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

  const getDaysSinceLastContact = (lastContactDate) => {
    if (!lastContactDate) return null;
    
    const contactDate = new Date(lastContactDate);
    if (isNaN(contactDate.getTime())) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    contactDate.setHours(0, 0, 0, 0);
    
    const diffTime = today - contactDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 ? diffDays : null;
  };

  const getLastContactAging = (lastContactDate) => {
    const days = getDaysSinceLastContact(lastContactDate);
    
    if (days === null) {
      return { label: "Sin contacto", variant: "secondary" };
    }
    
    if (days >= 0 && days <= 4) {
      return { label: `${days} días`, variant: "outline" };
    }
    
    if (days >= 5 && days <= 7) {
      return { label: `${days} días`, variant: "destructive" };
    }
    
    if (days > 7) {
      return { label: "Más de 7 días", variant: "destructive" };
    }
    
    return { label: "Sin contacto", variant: "secondary" };
  };

  const [activeTagEntity, setActiveTagEntity] = useState(null);

  const handleSaveTags = async (tagsToAdd, tagsToRemove) => {
    if (!activeTagEntity) return;
    try {
      for (const tId of tagsToAdd) await assignTag('prospect', activeTagEntity.id, tId);
      for (const tId of tagsToRemove) await removeTag('prospect', activeTagEntity.id, tId);
      toast({ title: "Éxito", description: "Tags actualizados correctamente." });
      if (refetch) refetch();
    } catch (error) {
      throw error;
    }
  };

  if (isLoading) return <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-20 w-full" /></div>;

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
              <TableHead>Calif.</TableHead>
              <TableHead>Follow Up</TableHead>
              <TableHead>Último contacto</TableHead>
              <TableHead>Docs</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!filteredProspects || filteredProspects.length === 0) ? (
              <TableRow><TableCell colSpan={9} className="text-center py-4">No hay prospectos.</TableCell></TableRow>
            ) : (
              filteredProspects.map(p => {
                const tags = p.prospect_tags?.map(pt => pt.tags).filter(Boolean) || [];
                const contactAging = getLastContactAging(p.last_contact_date);
                
                const pType = p.prospect_type || 'Commercial';
                const typeColors = {
                  Commercial: 'bg-blue-100 text-blue-800 border-blue-200',
                  Residential: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  BPP: 'bg-purple-100 text-purple-800 border-purple-200'
                };
                const pTypeColor = typeColors[pType] || typeColors.Commercial;

                return (
                <TableRow key={p.id} className="group">
                  <TableCell className="font-medium">{p.external_id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <span>{p.prospect_name || '—'}</span>
                      <Badge variant="outline" className={`w-fit text-[10px] px-1 py-0 h-4 ${pTypeColor}`}>
                        {pType}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {tags.map(t => (
                          <Badge key={t.id} style={{backgroundColor: t.color, color: '#fff'}} className="text-[10px] px-1 py-0 h-4">
                            {t.name}
                          </Badge>
                        ))}
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </TableCell>
                  <TableCell>{formatCurrency(p.estimated_property_value)}</TableCell>
                  <TableCell>
                    <Badge variant={p.qualification >= 8 ? 'destructive' : p.qualification >= 5 ? 'default' : 'secondary'}>
                      {p.qualification}/10
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(p.follow_up_at)}</TableCell>
                  <TableCell>
                    <Badge variant={contactAging.variant}>
                      {contactAging.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.documents_sent ? <Badge variant="outline" className="text-green-600 border-green-600">Sí</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setActiveTagEntity({id: p.id, type: 'prospect', tags})} aria-label="Editar Tags">
                            <Tags className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Editar Tags</p></TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => onEdit(p)} aria-label="Editar Prospecto">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Editar Prospecto</p></TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => onScheduleFollowUp(p)} aria-label="Actualizar Follow-up">
                            <Calendar className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Actualizar Follow-up</p></TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => onOpenNotesDrawer(p)} aria-label="Ver Notas y Detalles">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Notas e Historial</p></TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => onConvert(p)} aria-label="Convertir a Cliente">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Convertir a Cliente</p></TooltipContent>
                      </Tooltip>

                      {p.status !== 'lost' && onMarkAsLost && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => onMarkAsLost(p)} aria-label="Marcar como Perdido" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Marcar como Perdido</p></TooltipContent>
                        </Tooltip>
                      )}
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              )})
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

export default TopProspectsTable;
