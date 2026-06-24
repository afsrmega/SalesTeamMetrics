import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus, Check } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getTags, createTag } from '@/lib/tagsService';
import { useToast } from "@/components/ui/use-toast";

const COLORS = [
  '#64748b', '#ef4444', '#f97316', '#f59e0b', '#eab308', 
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', 
  '#0ea5e9', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', 
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
];

const TagsEditorModal = ({ isOpen, onClose, entityType, entityId, currentTags = [], onSave }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [allTags, setAllTags] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(COLORS[0]);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
      setSelectedTags([...currentTags]);
      setIsCreating(false);
      setSearch('');
      setNewTagName('');
    }
  }, [isOpen, currentTags]);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const tags = await getTags();
      setAllTags(tags);
    } catch (err) {
      toast({ title: "Error", description: "No se pudieron cargar los tags", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTag = (tag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);
    if (isSelected) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    try {
      const newTag = await createTag(newTagName, newTagColor, user.id, user.id);
      setAllTags([...allTags, newTag]);
      setSelectedTags([...selectedTags, newTag]);
      setIsCreating(false);
      setNewTagName('');
      toast({ title: "Éxito", description: "Tag creado correctamente." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const initialIds = currentTags.map(t => t.id);
      const selectedIds = selectedTags.map(t => t.id);
      
      const tagsToAdd = selectedIds.filter(id => !initialIds.includes(id));
      const tagsToRemove = initialIds.filter(id => !selectedIds.includes(id));
      
      await onSave(tagsToAdd, tagsToRemove);
      onClose();
    } catch (err) {
      toast({ title: "Error", description: "Ocurrió un error al guardar los tags", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTags = allTags.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSaving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Tags</DialogTitle>
        </DialogHeader>

        {!isCreating ? (
          <div className="space-y-4 py-2">
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md">
              {selectedTags.length === 0 && <span className="text-sm text-gray-400 p-1">No hay tags seleccionados...</span>}
              {selectedTags.map(tag => (
                <Badge 
                  key={`sel-${tag.id}`} 
                  style={{ backgroundColor: tag.color, color: '#fff' }}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  {tag.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => handleToggleTag(tag)} />
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Input 
                placeholder="Buscar tags..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="flex-1"
              />
              <Button variant="outline" onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nuevo
              </Button>
            </div>

            <div className="border rounded-md p-2 h-[200px] overflow-y-auto flex flex-col gap-1">
              {isLoading ? (
                <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
              ) : filteredTags.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-4">No se encontraron tags.</div>
              ) : (
                filteredTags.map(tag => {
                  const isSelected = selectedTags.some(t => t.id === tag.id);
                  return (
                    <div 
                      key={`avail-${tag.id}`}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-gray-50' : ''}`}
                      onClick={() => handleToggleTag(tag)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                        <span className="text-sm">{tag.name}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-custom-primary" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2 border rounded-md p-4">
            <h4 className="font-semibold text-sm">Crear Nuevo Tag</h4>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Nombre</label>
              <Input 
                placeholder="Ej. VIP, Prioridad, etc." 
                value={newTagName} 
                onChange={(e) => setNewTagName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(color => (
                  <div 
                    key={color}
                    className={`w-6 h-6 rounded-full cursor-pointer border-2 ${newTagColor === color ? 'border-gray-900 shadow-md' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreateTag} disabled={!newTagName.trim()}>Crear</Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving || isCreating}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TagsEditorModal;