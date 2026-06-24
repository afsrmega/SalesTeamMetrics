import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const TagsAutocomplete = ({
  selectedTagIds = [],
  onTagsChange,
  availableTags = [],
  placeholder = "Type to search tags...",
  disabled = false,
  onCreateTag
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Filter and sort available tags
  const filteredTags = availableTags
    .filter(tag => !selectedTagIds.includes(tag.id))
    .filter(tag => tag.name.toLowerCase().includes(inputValue.toLowerCase()))
    .sort((a, b) => {
      const usageDiff = (b.usage_count || 0) - (a.usage_count || 0);
      if (usageDiff !== 0) return usageDiff;
      return a.name.localeCompare(b.name);
    });

  const showCreateOption = Boolean(onCreateTag && inputValue.trim().length > 0 && !filteredTags.some(t => t.name.toLowerCase() === inputValue.trim().toLowerCase()));
  const totalOptions = filteredTags.length + (showCreateOption ? 1 : 0);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [inputValue, filteredTags.length, showCreateOption]);

  const handleSelect = (tag) => {
    if (!selectedTagIds.includes(tag.id)) {
      onTagsChange([...selectedTagIds, tag.id]);
    }
    setInputValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleCreate = () => {
    if (onCreateTag && inputValue.trim()) {
      onCreateTag(inputValue.trim());
      setInputValue('');
      setIsOpen(false);
      inputRef.current?.focus();
    }
  };

  const handleRemove = (tagId) => {
    onTagsChange(selectedTagIds.filter(id => id !== tagId));
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else setHighlightedIndex(prev => (prev + 1) % (totalOptions || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else setHighlightedIndex(prev => (prev - 1 + (totalOptions || 1)) % (totalOptions || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && totalOptions > 0) {
        if (highlightedIndex < filteredTags.length) {
          handleSelect(filteredTags[highlightedIndex]);
        } else if (showCreateOption) {
          handleCreate();
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue('');
    } else if (e.key === 'Backspace' && inputValue === '' && selectedTagIds.length > 0) {
      handleRemove(selectedTagIds[selectedTagIds.length - 1]);
    }
  };

  // Close on click outside with delay to allow clicks to register
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setTimeout(() => setIsOpen(false), 200);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedObjects = selectedTagIds.map(id => availableTags.find(t => t.id === id)).filter(Boolean);

  return (
    <div className="relative w-full" ref={containerRef}>
      {selectedObjects.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedObjects.map(tag => (
            <Badge 
              key={`selected-${tag.id}`} 
              variant="secondary" 
              className="flex items-center gap-1 py-1 px-2 font-normal" 
              style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined, color: tag.color, borderColor: tag.color }}
            >
              {tag.name}
              <button
                type="button"
                className="ml-1 text-muted-foreground hover:text-foreground focus:outline-none rounded-full"
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
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none max-h-72 overflow-y-auto">
          {filteredTags.length === 0 && !showCreateOption ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No tags found.</div>
          ) : (
            <ul className="flex flex-col p-1">
              {filteredTags.slice(0, 10).map((tag, index) => (
                <li
                  key={`option-${tag.id}`}
                  className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none ${
                    index === highlightedIndex ? 'bg-accent text-accent-foreground' : ''
                  }`}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(tag); }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: tag.color || '#ccc' }} />
                  <span className="truncate">{tag.name}</span>
                  {tag.usage_count !== undefined && (
                    <span className="ml-auto text-xs text-muted-foreground flex-shrink-0 pl-2">{tag.usage_count}</span>
                  )}
                </li>
              ))}
              {showCreateOption && (
                <li
                  className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none ${
                    filteredTags.length === highlightedIndex ? 'bg-accent text-accent-foreground' : ''
                  }`}
                  onMouseDown={(e) => { e.preventDefault(); handleCreate(); }}
                  onMouseEnter={() => setHighlightedIndex(filteredTags.length)}
                >
                  Create tag: <span className="font-semibold ml-1 truncate">"{inputValue}"</span>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default TagsAutocomplete;