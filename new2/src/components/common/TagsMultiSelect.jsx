import React, { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const TagsMultiSelect = ({ 
  selectedTags = [], 
  onTagsChange, 
  availableTags = [], 
  placeholder = "Select tags...", 
  disabled = false 
}) => {
  const [open, setOpen] = useState(false);

  const handleUnselect = (tagId) => {
    onTagsChange(selectedTags.filter((id) => id !== tagId));
  };

  // Ensure availableTags are unique by ID to prevent duplicate key warnings
  const uniqueAvailableTags = Array.from(new Map((availableTags || []).map(t => [t.id, t])).values());
  const selectedObjects = uniqueAvailableTags.filter(t => selectedTags.includes(t.id));

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            role="combobox"
            aria-expanded={open}
            className={`flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-text ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            onClick={() => !disabled && setOpen(true)}
          >
            <div className="flex flex-wrap gap-1 items-center max-w-full overflow-hidden">
              {selectedObjects.length === 0 && (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              {selectedObjects.map((tag) => (
                <Badge
                  key={`selected-${tag.id}`}
                  variant="secondary"
                  className="mr-1 mb-1 font-normal text-xs flex items-center gap-1"
                  style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined, color: tag.color, borderColor: tag.color }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {tag.name}
                  {!disabled && (
                    <button
                      type="button"
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUnselect(tag.id);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleUnselect(tag.id);
                      }}
                    >
                      <X className="h-3 w-3 hover:text-destructive" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {uniqueAvailableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <CommandItem
                      key={`option-${tag.id}`}
                      onSelect={() => {
                        if (isSelected) {
                          onTagsChange(selectedTags.filter((id) => id !== tag.id));
                        } else {
                          onTagsChange([...selectedTags, tag.id]);
                        }
                      }}
                    >
                      <div className="flex items-center flex-1">
                        <div
                          className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${
                            isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#ccc' }} />
                          {tag.name}
                        </span>
                      </div>
                      {tag.owner_user_id && (
                        <span className="ml-2 text-[10px] text-muted-foreground uppercase bg-gray-100 px-1 py-0.5 rounded">Personal</span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TagsMultiSelect;