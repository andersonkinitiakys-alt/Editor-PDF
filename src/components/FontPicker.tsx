import React, { useState, useMemo, useEffect } from 'react';
import { Search, Loader2, Check, ChevronDown, Type } from 'lucide-react';
import { FONT_REGISTRY, FontMetadata, FontCategory } from '../lib/fontRegistry';
import fontManager from '../lib/fontManager';
import { cn } from '../lib/utils';

interface FontPickerProps {
  currentFont: string;
  onSelect: (font: string) => void;
  onPreview?: (font: string) => void;
  onPreviewEnd?: () => void;
  className?: string;
}

const FontPicker: React.FC<FontPickerProps> = ({ currentFont, onSelect, onPreview, onPreviewEnd, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<FontCategory | 'All'>('Standard');
  const [loadingFont, setLoadingFont] = useState<string | null>(null);

  const handleHover = (font: string) => {
    if (onPreview) {
      // Pre-load the font so the preview is visible
      fontManager.loadFont(font);
      onPreview(font);
    }
  };

  const categories: (FontCategory | 'All')[] = ['All', 'Standard', 'Sans Serif', 'Serif', 'Monospace', 'Handwriting', 'Display'];

  const filteredFonts = useMemo(() => {
    return FONT_REGISTRY.filter(font => {
      const matchesSearch = font.family.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'All' || font.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  const handleSelect = async (font: string) => {
    setLoadingFont(font);
    try {
      await fontManager.loadFont(font);
      onSelect(font);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to load font:', font, error);
    } finally {
      setLoadingFont(null);
    }
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.font-picker-container')) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={cn("relative font-picker-container", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full min-w-[160px] h-10 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:border-emerald-500 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Type size={16} className="text-gray-400 shrink-0" />
          <span className="truncate font-medium text-gray-700" style={{ fontFamily: currentFont }}>{currentFont}</span>
        </div>
        <ChevronDown size={16} className={cn("text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[280px] bg-white border border-gray-200 rounded-xl shadow-xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-gray-100 bg-gray-50/50">
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                autoFocus
                type="text"
                placeholder="Buscar fonte..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap transition-all",
                    activeCategory === cat 
                      ? "bg-emerald-600 text-white shadow-sm" 
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div 
            className="max-h-[320px] overflow-y-auto overflow-x-hidden p-1 custom-scrollbar"
            onMouseLeave={() => onPreviewEnd && onPreviewEnd()}
          >
            {filteredFonts.length > 0 ? (
              filteredFonts.map((font) => (
                <button
                  key={font.family}
                  onClick={() => handleSelect(font.family)}
                  onMouseEnter={() => handleHover(font.family)}
                  disabled={loadingFont === font.family}
                  className={cn(
                    "group flex items-center justify-between w-full h-11 px-3 rounded-lg text-left transition-colors hover:bg-emerald-50 relative overflow-hidden",
                    currentFont === font.family ? "text-emerald-700 bg-emerald-50/50" : "text-gray-700"
                  )}
                >
                  <div className="flex flex-col gap-0.5 max-w-[85%]">
                    <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">{font.category}</span>
                    <span 
                      className="text-base truncate leading-none transition-transform group-hover:scale-[1.02]" 
                      style={{ fontFamily: `'${font.family}', sans-serif` }}
                    >
                      {font.family}
                    </span>
                  </div>
                  
                  {loadingFont === font.family ? (
                    <Loader2 size={14} className="animate-spin text-emerald-500" />
                  ) : currentFont === font.family ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : null}
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400">
                <p className="text-sm">Nenhuma fonte encontrada</p>
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-gray-100 bg-gray-50/30 text-[10px] text-gray-400 text-center">
            {filteredFonts.length} fontes disponíveis nesta categoria
          </div>
        </div>
      )}
    </div>
  );
};

export default FontPicker;
