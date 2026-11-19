"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Check, Sparkles, Tag, Package } from "lucide-react";

export interface CatalogItemOption {
  id: string;
  itemCode: string;
  name: string;
  hsnSacCode: string;
  unit: string;
  defaultRate: string | number;
  gstRate: string | number;
  category: string;
  productType?: string;
  description?: string | null;
}

interface ItemAutocompletePickerProps {
  value: string;
  onChange: (val: string) => void;
  onSelectItem: (item: CatalogItemOption) => void;
  placeholder?: string;
  subDescriptionValue?: string;
  onChangeSubDescription?: (val: string) => void;
}

export default function ItemAutocompletePicker({
  value,
  onChange,
  onSelectItem,
  placeholder = "Search item name or HSN (e.g. MS PIPE, SCREW, TILES, 7306)...",
  subDescriptionValue,
  onChangeSubDescription,
}: ItemAutocompletePickerProps) {
  const [items, setItems] = useState<CatalogItemOption[]>([]);
  const [filtered, setFiltered] = useState<CatalogItemOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load catalog items once
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch("/api/price-catalog")
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data.success && Array.isArray(data.items)) {
          setItems(data.items);
        }
      })
      .catch((err) => console.error("Failed to load catalog items:", err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Filter items based on user input
  useEffect(() => {
    if (!value || value.trim().length === 0) {
      setFiltered(items.slice(0, 15));
      return;
    }
    const q = value.toLowerCase().trim();
    const matches = items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (it.hsnSacCode && it.hsnSacCode.toLowerCase().includes(q)) ||
        (it.itemCode && it.itemCode.toLowerCase().includes(q))
    );
    setFiltered(matches.slice(0, 20));
    setActiveIndex(0);
  }, [value, items]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: CatalogItemOption) => {
    onChange(item.name);
    onSelectItem(item);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) {
        handleSelect(filtered[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full space-y-1" ref={containerRef}>
      {/* Primary Item Name Input */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>

      {/* Secondary Sub-Description Input */}
      {onChangeSubDescription !== undefined && (
        <input
          type="text"
          value={subDescriptionValue || ""}
          onChange={(e) => onChangeSubDescription(e.target.value)}
          placeholder="Sub-description (e.g. 40ft-Chain Length, 10-Nos, Tata Grade A)..."
          className="w-full px-2.5 py-1 text-[11px] rounded border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[340px] max-w-lg max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xl z-50 text-xs custom-scrollbar">
          <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>Standard Roofs 290-Item Catalog</span>
            <span>{filtered.length} matches</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs">
              No matching items found in 290-item catalog.
              <p className="text-[10px] mt-1 text-slate-500">Custom description will be used.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((item, idx) => (
                <li
                  key={item.id || item.itemCode}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`p-2.5 cursor-pointer transition flex flex-col gap-1 ${
                    activeIndex === idx
                      ? "bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-xs leading-tight line-clamp-1">{item.name}</span>
                    <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 shrink-0">
                      ₹{Number(item.defaultRate).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                    {item.hsnSacCode && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
                        HSN: {item.hsnSacCode}
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                      Unit: {item.unit}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                      GST {Number(item.gstRate || 18).toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      {item.category}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
