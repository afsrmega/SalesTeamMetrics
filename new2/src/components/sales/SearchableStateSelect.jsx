import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SearchableStateSelect = ({ states = [], value, onChange, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredStates, setFilteredStates] = useState(states);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Update filtered list when search changes
  useEffect(() => {
    const filtered = states.filter((state) =>
      state.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStates(filtered);
    setHighlightedIndex(0); // Reset highlight
  }, [searchTerm, states]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearchTerm(""); // Reset search on close
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && listRef.current && listRef.current.children[highlightedIndex]) {
      listRef.current.children[highlightedIndex].scrollIntoView({
        block: "nearest",
      });
    }
  }, [highlightedIndex, open]);

  const handleSelect = (state) => {
    onChange(state);
    setOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setSearchTerm("");
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < filteredStates.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredStates.length > 0) {
          handleSelect(filteredStates[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setSearchTerm("");
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          disabled && "opacity-50 pointer-events-none"
        )}
        onClick={() => !disabled && setOpen(!open)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value || "Seleccionar estado..."}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <div
              role="button"
              onClick={handleClear}
              className="rounded-full hover:bg-muted p-0.5 transition-colors mr-1"
            >
              <X className="h-3 w-3 opacity-50 hover:opacity-100" />
            </div>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={searchInputRef}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Buscar estado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1" ref={listRef}>
            {filteredStates.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No se encontraron estados.
              </div>
            ) : (
              <ul role="listbox">
                {filteredStates.map((state, index) => (
                  <li
                    key={state}
                    role="option"
                    aria-selected={value === state}
                    className={cn(
                      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
                      highlightedIndex === index ? "bg-accent text-accent-foreground" : "",
                      value === state && "font-medium"
                    )}
                    onClick={() => handleSelect(state)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {value === state && (
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    {state}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableStateSelect;