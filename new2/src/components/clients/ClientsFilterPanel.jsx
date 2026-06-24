
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Filter, X, Save, Bookmark } from 'lucide-react';
import TagsFilterCRM from '@/components/common/TagsFilterCRM';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SavedSegmentsList from '@/components/common/SavedSegmentsList';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ClientsFilterPanel = ({ 
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
  onClearSegment
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSegmentsListOpen, setIsSegmentsListOpen] = useState(false);

  const activeSegment = savedSegments.find(s => s.id === activeSegmentId);

  const handleChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
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
              placeholder="Buscar por nombre o notas..."
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
                Filtros de Tags
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 border-b pb-4">
              <div className="space-y-2">
                <Label>Converted Via</Label>
                <Select value={filters.conversionChannel || 'all'} onValueChange={(v) => handleChange('conversionChannel', v)}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="both">Email + Phone</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Senior/Manager Involved</Label>
                <Select value={filters.seniorManagerInvolved || 'all'} onValueChange={(v) => handleChange('seniorManagerInvolved', v)}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* CRM Tags Filter */}
            <div className="mt-2">
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

export default ClientsFilterPanel;
