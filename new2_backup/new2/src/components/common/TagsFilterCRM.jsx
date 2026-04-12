
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check, Filter } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";

const AutocompleteInput = ({ 
  label, 
  selectedIds, 
  onChange, 
  oppositeIds, 
  availableTags, 
  placeholder, 
  disabled, 
  chipClass,
  showModeToggle,
  mode,
  onModeChange,
  idPrefix
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const { toast } = useToast();

  const filteredTags = availableTags
    .filter(tag => !selectedIds.includes(tag.id)) // Exclude already selected here
    .filter(tag => tag.name.toLowerCase().includes(inputValue.toLowerCase()))
    .sort((a, b) => {
      const usageDiff = (b.usage_count || 0) - (a.usage_count || 0);
      if (usageDiff !== 0) return usageDiff;
      return a.name.localeCompare(b.name);
    });

  useEffect(() => {
    setHighlightedIndex(0);
  }, [inputValue, filteredTags.length]);

  const handleSelect = (tag) => {
    if (oppositeIds.includes(tag.id)) {
      toast({
        title: "Invalid Selection",
        description: `Tag "${tag.name}" cannot be both included and excluded.`,
        variant: "destructive"
      });
      return;
    }
    if (!selectedIds.includes(tag.id)) {
      onChange([...selectedIds, tag.id]);
    }
    setInputValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRemove = (tagId) => {
    onChange(selectedIds.filter(id => id !== tagId));
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else setHighlightedIndex(prev => (prev + 1) % (filteredTags.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else setHighlightedIndex(prev => (prev - 1 + (filteredTags.length || 1)) % (filteredTags.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && filteredTags.length > 0 && highlightedIndex < filteredTags.length) {
        handleSelect(filteredTags[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue('');
    } else if (e.key === 'Backspace' && inputValue === '' && selectedIds.length > 0) {
      handleRemove(selectedIds[selectedIds.length - 1]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setTimeout(() => setIsOpen(false), 200);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedObjects = selectedIds.map(id => availableTags.find(t => t.id === id)).filter(Boolean);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="font-semibold text-sm">{label}</Label>
        {showModeToggle && (
          <RadioGroup 
            value={mode} 
            onValueChange={onModeChange}
            className="flex items-center space-x-4"
          >
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="any" id={`${idPrefix}-mode-any`} className="w-3 h-3" />
              <Label htmlFor={`${idPrefix}-mode-any`} className="text-xs cursor-pointer">Match ANY (OR)</Label>
            </div>
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="all" id={`${idPrefix}-mode-all`} className="w-3 h-3" />
              <Label htmlFor={`${idPrefix}-mode-all`} className="text-xs cursor-pointer">Match ALL (AND)</Label>
            </div>
          </RadioGroup>
        )}
      </div>

      <div className="relative w-full" ref={containerRef}>
        {selectedObjects.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedObjects.map(tag => (
              <Badge 
                key={`sel-${tag.id}`} 
                variant="secondary" 
                className={`flex items-center gap-1 py-1 px-2 font-normal transition-colors ${chipClass}`}
              >
                {tag.name}
                <button
                  type="button"
                  className="ml-1 opacity-70 hover:opacity-100 focus:outline-none rounded-full"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(tag.id); }}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
        </div>

        {isOpen && (inputValue.length > 0 || filteredTags.length > 0) && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none max-h-[300px] overflow-y-auto">
            {filteredTags.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No tags found.</div>
            ) : (
              <ul className="flex flex-col p-1">
                {filteredTags.map((tag, index) => (
                  <li
                    key={`opt-${tag.id}`}
                    className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors ${
                      index === highlightedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 hover:text-accent-foreground'
                    }`}
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(tag); }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: tag.color || '#ccc' }} />
                    <span className="truncate">{tag.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground flex-shrink-0 pl-2">
                      {tag.usage_count !== undefined ? `${tag.usage_count} uses` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const TagsFilterCRM = ({
  includeTagIds = [],
  excludeTagIds = [],
  onIncludeTagsChange,
  onExcludeTagsChange,
  includeMode = 'any',
  onIncludeModeChange,
  availableTags = [],
  disabled = false
}) => {
  return (
    <div className="space-y-4 p-4 border rounded-md bg-muted/20">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Advanced Tag Filtering</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AutocompleteInput
          label="Include Tags"
          idPrefix="include"
          selectedIds={includeTagIds}
          onChange={onIncludeTagsChange}
          oppositeIds={excludeTagIds}
          availableTags={availableTags}
          placeholder="Search tags to include..."
          disabled={disabled}
          chipClass="bg-blue-100 text-blue-900 hover:bg-blue-200 border-blue-200"
          showModeToggle={true}
          mode={includeMode}
          onModeChange={onIncludeModeChange}
        />

        <AutocompleteInput
          label="Exclude Tags"
          idPrefix="exclude"
          selectedIds={excludeTagIds}
          onChange={onExcludeTagsChange}
          oppositeIds={includeTagIds}
          availableTags={availableTags}
          placeholder="Search tags to exclude..."
          disabled={disabled}
          chipClass="bg-red-100 text-red-900 hover:bg-red-200 border-red-200"
        />
      </div>
    </div>
  );
};

export default TagsFilterCRM;
