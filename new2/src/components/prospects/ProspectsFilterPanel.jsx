
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Filter, X, Save, Bookmark } from 'lucide-react';
import TagsFilterCRM from '@/components/common/TagsFilterCRM';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SavedSegmentsList from '@/components/common/SavedSegmentsList';

const ProspectsFilterPanel = ({ 
  filters, 
  onFiltersChange, 
  onReset, 
  availableTags = [],
  includeTagIds = [],
  excludeTagIds = [],
  includeMode = 'any',
  setIncludeTagIds,
  setExcludeTagIds,
  setIncludeMode,
  // Segments props
  savedSegments = [],
  activeSegmentId = null,
  onSaveSegmentClick,
  onApplySegment,
  onRenameSegment,
  onUpdateSegment,
  onDeleteSegment,
  onToggleFavorite,
  onClearSegment,
  activeTab
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSegmentsListOpen, setIsSegmentsListOpen] = useState(false);

  const activeSegment = savedSegments.find(s => s.id === activeSegmentId);

  const handleChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleQualificationChange = (type, value) => {
    const num = value === '' ? '' : Number(value);
    onFiltersChange({
      ...filters,
      qualification: { ...filters.qualification, [type]: num }
    });
  };

  const handleCustomDateChange = (type, value) => {
    onFiltersChange({
      ...filters,
      followUpCustom: { ...filters.followUpCustom, [type]: value }
    });
  };

  const togglePropertyType = (type) => {
    const current = filters.propertyType || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    handleChange('propertyType', updated);
  };

  const handleReset = () => {
    onReset();
    setIncludeTagIds([]);
    setExcludeTagIds([]);
    setIncludeMode('any');
  };

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between p-4 flex-wrap gap-4">
          <div className="flex items-center space-x-4 flex-1 min-w-[200px]">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, nombre o notas..."
              value={filters.search || ''}
              onChange={(e) => handleChange('search', e.target.value)}
              className="max-w-sm"
            />
          </div>

          {activeSegment && (
            <div className="flex items-center bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium border border-primary/20">
              <Bookmark className="h-4 w-4 mr-2" />
              Segmento activo: {activeSegment.name}
              <button onClick={onClearSegment} className="ml-2 hover:bg-primary/20 rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Dialog open={isSegmentsListOpen} onOpenChange={setIsSegmentsListOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Bookmark className="h-4 w-4 mr-2" /> Segmentos
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Segmentos Guardados</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <SavedSegmentsList 
                    segments={savedSegments}
                    activeSegmentId={activeSegmentId}
                    onApplySegment={(id) => { onApplySegment(id); setIsSegmentsListOpen(false); }}
                    onRenameSegment={(id) => { setIsSegmentsListOpen(false); onRenameSegment(id); }}
                    onUpdateSegment={onUpdateSegment}
                    onDeleteSegment={(id) => { setIsSegmentsListOpen(false); onDeleteSegment(id); }}
                    onToggleFavorite={onToggleFavorite}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={onSaveSegmentClick} size="sm" className="hidden sm:flex">
              <Save className="h-4 w-4 mr-2" /> Guardar
            </Button>

            <Button variant="outline" onClick={handleReset} size="sm">
              <X className="h-4 w-4 mr-2" /> Limpiar
            </Button>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                Filtros Avanzados
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-0">
            {/* Documents Sent */}
            <div className="space-y-2">
              <Label>Documentos Enviados</Label>
              <Select value={filters.documentsSent || 'all'} onValueChange={(v) => handleChange('documentsSent', v)}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label>Origen</Label>
              <Select value={filters.source || 'all'} onValueChange={(v) => handleChange('source', v)}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Assigned">Asignado</SelectItem>
                  <SelectItem value="Other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Follow-Up Range */}
            <div className="space-y-2">
              <Label>Rango Follow-Up</Label>
              <Select value={filters.followUpRange || 'all'} onValueChange={(v) => handleChange('followUpRange', v)}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="overdue">Vencidos</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="next7">Próximos 7 días</SelectItem>
                  <SelectItem value="next30">Próximos 30 días</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Dates if selected */}
            {filters.followUpRange === 'custom' && (
              <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                <Label>Fechas Personalizadas</Label>
                <div className="flex space-x-2">
                  <Input type="date" value={filters.followUpCustom?.from || ''} onChange={(e) => handleCustomDateChange('from', e.target.value)} />
                  <Input type="date" value={filters.followUpCustom?.to || ''} onChange={(e) => handleCustomDateChange('to', e.target.value)} />
                </div>
              </div>
            )}

            {/* Qualification Range */}
            <div className="space-y-2">
              <Label>Calificación (Min - Max)</Label>
              <div className="flex items-center space-x-2">
                <Input 
                  type="number" min="0" max="10" placeholder="Min" 
                  value={filters.qualification?.min ?? ''} 
                  onChange={(e) => handleQualificationChange('min', e.target.value)} 
                />
                <span>-</span>
                <Input 
                  type="number" min="0" max="10" placeholder="Max" 
                  value={filters.qualification?.max ?? ''} 
                  onChange={(e) => handleQualificationChange('max', e.target.value)} 
                />
              </div>
            </div>

            {/* Checkboxes & Multi-select */}
            <div className="space-y-4 col-span-1 md:col-span-2 lg:col-span-4 flex flex-wrap gap-6 items-center">
              <div className="flex items-center space-x-2 mt-4">
                <Checkbox 
                  id="filter-portfolio" 
                  checked={filters.portfolio === true}
                  onCheckedChange={(c) => handleChange('portfolio', c === true)}
                />
                <Label htmlFor="filter-portfolio">Tiene Portafolio</Label>
              </div>

              <div className="space-y-2 mt-4">
                <Label className="mr-4">Tipo de Propiedad:</Label>
                <div className="flex items-center space-x-4 inline-flex">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="type-res" 
                      checked={(filters.propertyType || []).includes('Residential')}
                      onCheckedChange={() => togglePropertyType('Residential')}
                    />
                    <Label htmlFor="type-res">Residencial</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="type-com" 
                      checked={(filters.propertyType || []).includes('Commercial')}
                      onCheckedChange={() => togglePropertyType('Commercial')}
                    />
                    <Label htmlFor="type-com">Comercial</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* CRM Tags Filter */}
            <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2">
              <TagsFilterCRM 
                availableTags={availableTags}
                includeTagIds={includeTagIds}
                excludeTagIds={excludeTagIds}
                onIncludeTagsChange={setIncludeTagIds}
                onExcludeTagsChange={setExcludeTagIds}
                includeMode={includeMode}
                onIncludeModeChange={setIncludeMode}
              />
            </div>

          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ProspectsFilterPanel;
