import React, { useState } from 'react';
import { Search, Star, MoreVertical, Trash2, Edit2, RefreshCw, Check } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const SavedSegmentsList = ({ 
  segments = [], 
  activeSegmentId, 
  onApplySegment, 
  onRenameSegment, 
  onUpdateSegment, 
  onDeleteSegment, 
  onToggleFavorite
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSegments = segments.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar segmentos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[300px] rounded-md border p-2">
        {filteredSegments.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {segments.length === 0 ? 'No hay segmentos guardados.' : 'No se encontraron resultados.'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredSegments.map(segment => {
              const isActive = segment.id === activeSegmentId;
              return (
                <div 
                  key={segment.id} 
                  className={`flex items-center justify-between p-2 rounded-md transition-colors ${isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button 
                      onClick={() => onToggleFavorite(segment.id, !segment.is_favorite)}
                      className="flex-shrink-0 focus:outline-none"
                    >
                      <Star className={`h-4 w-4 ${segment.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-foreground'}`} />
                    </button>
                    <div 
                      className="flex-1 truncate cursor-pointer select-none"
                      onClick={() => onApplySegment(segment.id)}
                    >
                      <span className={`font-medium ${isActive ? 'text-primary' : ''}`}>{segment.name}</span>
                      {isActive && <Badge variant="secondary" className="ml-2 text-[10px] h-4 py-0">Activo</Badge>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {!isActive && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onApplySegment(segment.id)} title="Aplicar">
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onUpdateSegment(segment.id)}>
                          <RefreshCw className="h-4 w-4 mr-2" /> Actualizar con filtros actuales
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRenameSegment(segment.id)}>
                          <Edit2 className="h-4 w-4 mr-2" /> Renombrar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDeleteSegment(segment.id)} className="text-red-600 focus:text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default SavedSegmentsList;