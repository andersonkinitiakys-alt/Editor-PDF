import { useState, useEffect } from "react";
import { ToolPage } from "./ToolPage";
import { splitPdf } from "../lib/pdf-utils";
import { PDFDocument } from "pdf-lib";
import { Plus, Trash2, Check } from "lucide-react";
import { cn } from "../lib/utils";

export interface SplitOptions {
  mode: 'split' | 'extract';
  splitMode: 'custom' | 'fixed';
  customRanges: { from: number; to: number }[];
  mergeCustomRanges: boolean;
  fixedRange: number;
  extractMode: 'all' | 'select';
  extractPages: string;
  mergeExtractPages: boolean;
}

const defaultOptions: SplitOptions = {
  mode: 'split',
  splitMode: 'custom',
  customRanges: [{ from: 1, to: 1 }],
  mergeCustomRanges: false,
  fixedRange: 1,
  extractMode: 'all',
  extractPages: "",
  mergeExtractPages: false,
};

function usePdfPageCount(file: File | null) {
  const [pageCount, setPageCount] = useState<number>(0);

  useEffect(() => {
    if (!file) {
      setPageCount(0);
      return;
    }
    const getPageCount = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        setPageCount(pdf.getPageCount());
      } catch (e) {
        console.error("Failed to load PDF to get page count", e);
      }
    };
    getPageCount();
  }, [file]);

  return pageCount;
}

function SplitOptionsComponent({ options, setOptions, files }: { options: any; setOptions: (opts: any) => void; files: File[] }) {
  const file = files[0] || null;
  const totalPages = usePdfPageCount(file);

  // Initialize custom range when totalPages is loaded
  useEffect(() => {
    if (totalPages > 0 && options.customRanges.length === 1 && options.customRanges[0].to === 1) {
      setOptions({ ...options, customRanges: [{ from: 1, to: totalPages }] });
    }
  }, [totalPages]);

  const handleAddRange = () => {
    const lastRange = options.customRanges[options.customRanges.length - 1];
    const nextFrom = lastRange ? lastRange.to + 1 : 1;
    setOptions({
      ...options,
      customRanges: [...options.customRanges, { from: nextFrom, to: totalPages || nextFrom }]
    });
  };

  const handleRemoveRange = (index: number) => {
    const newRanges = [...options.customRanges];
    newRanges.splice(index, 1);
    
    for (let i = Math.max(1, index); i < newRanges.length; i++) {
      const minFrom = newRanges[i - 1].to + 1;
      if (newRanges[i].from < minFrom) {
        newRanges[i].from = minFrom;
      }
      if (totalPages && newRanges[i].from > totalPages) {
        newRanges[i].from = totalPages;
      }
      if (newRanges[i].to < newRanges[i].from) {
        newRanges[i].to = newRanges[i].from;
      }
    }
    
    setOptions({ ...options, customRanges: newRanges });
  };

  const handleRangeChange = (index: number, field: 'from' | 'to', value: string) => {
    const newRanges = [...options.customRanges];
    newRanges[index][field] = value === '' ? '' : parseInt(value, 10);
    setOptions({ ...options, customRanges: newRanges });
  };

  const handleRangeBlur = () => {
    const newRanges = [...options.customRanges];
    
    for (let i = 0; i < newRanges.length; i++) {
      let from = typeof newRanges[i].from === 'number' && !isNaN(newRanges[i].from) ? newRanges[i].from : 1;
      let to = typeof newRanges[i].to === 'number' && !isNaN(newRanges[i].to) ? newRanges[i].to : from;

      if (i === 0) {
        from = Math.max(1, from);
      } else {
        const minAllowed = newRanges[i - 1].to + 1;
        from = Math.max(minAllowed, from);
      }

      if (totalPages && from > totalPages) {
        from = totalPages;
      }

      to = Math.max(from, to);
      if (totalPages && to > totalPages) {
        to = totalPages;
      }

      newRanges[i].from = from;
      newRanges[i].to = to;
    }

    setOptions({ ...options, customRanges: newRanges });
  };

  const lastRange = options.customRanges[options.customRanges.length - 1];
  const canAddRange = !lastRange || (totalPages ? lastRange.to < totalPages : true);

  return (
    <div className="space-y-6">
      {/* Main Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-lg">
        <button
          className={cn(
            "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors",
            options.mode === 'split' ? "bg-white text-emerald-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
          )}
          onClick={() => setOptions({ ...options, mode: 'split' })}
        >
          Dividir por intervalo
        </button>
        <button
          className={cn(
            "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors",
            options.mode === 'extract' ? "bg-white text-emerald-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
          )}
          onClick={() => setOptions({ ...options, mode: 'extract' })}
        >
          Extrair páginas
        </button>
      </div>

      {options.mode === 'split' && (
        <div className="space-y-4">
          {/* Split Sub-Tabs */}
          <div className="flex space-x-4 border-b border-gray-200 pb-2">
            <button
              className={cn(
                "text-sm font-medium pb-2 -mb-2.5 border-b-2 transition-colors",
                options.splitMode === 'custom' ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
              onClick={() => setOptions({ ...options, splitMode: 'custom' })}
            >
              Intervalos personalizados
            </button>
            <button
              className={cn(
                "text-sm font-medium pb-2 -mb-2.5 border-b-2 transition-colors",
                options.splitMode === 'fixed' ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
              onClick={() => setOptions({ ...options, splitMode: 'fixed' })}
            >
              Intervalos fixos
            </button>
          </div>

          {options.splitMode === 'custom' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {options.customRanges.map((range: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-500 mb-1">De</label>
                        <input
                          type="number"
                          min={index === 0 ? 1 : options.customRanges[index - 1].to + 1}
                          max={totalPages || 1}
                          value={range.from}
                          onChange={(e) => handleRangeChange(index, 'from', e.target.value)}
                          onBlur={handleRangeBlur}
                          className="w-16 p-1.5 border border-gray-300 rounded text-sm focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <span className="text-gray-400 mt-5">-</span>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-500 mb-1">A</label>
                        <input
                          type="number"
                          min={range.from}
                          max={totalPages || 1}
                          value={range.to}
                          onChange={(e) => handleRangeChange(index, 'to', e.target.value)}
                          onBlur={handleRangeBlur}
                          className="w-16 p-1.5 border border-gray-300 rounded text-sm focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    {options.customRanges.length > 1 && (
                      <button
                        onClick={() => handleRemoveRange(index)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md mt-5 transition-colors"
                        title="Remover intervalo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddRange}
                disabled={!canAddRange}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-2 px-4 border border-dashed rounded-lg transition-colors text-sm font-medium",
                  canAddRange 
                    ? "border-emerald-300 text-emerald-600 hover:bg-emerald-50" 
                    : "border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed"
                )}
              >
                <Plus className="w-4 h-4" />
                Adicionar intervalo
              </button>

              <label className="flex items-center gap-2 cursor-pointer mt-4">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={options.mergeCustomRanges}
                    onChange={(e) => setOptions({ ...options, mergeCustomRanges: e.target.checked })}
                    className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-emerald-500 checked:border-emerald-500 transition-colors"
                  />
                  <Check className="w-3.5 h-3.5 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-sm text-gray-700">Juntar todos os intervalos num único ficheiro PDF</span>
              </label>
            </div>
          )}

          {options.splitMode === 'fixed' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dividir em intervalos de páginas de
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={totalPages || 1}
                    value={options.fixedRange}
                    onChange={(e) => setOptions({ ...options, fixedRange: parseInt(e.target.value) || 1 })}
                    className="w-20 p-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <span className="text-sm text-gray-500">páginas</span>
                </div>
              </div>
              {totalPages > 0 && (
                <p className="text-sm text-gray-500">
                  Este PDF será dividido em arquivos de {options.fixedRange} páginas cada.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {options.mode === 'extract' && (
        <div className="space-y-4">
          {/* Extract Sub-Tabs */}
          <div className="flex space-x-4 border-b border-gray-200 pb-2">
            <button
              className={cn(
                "text-sm font-medium pb-2 -mb-2.5 border-b-2 transition-colors",
                options.extractMode === 'all' ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
              onClick={() => setOptions({ ...options, extractMode: 'all' })}
            >
              Extrair todas as páginas
            </button>
            <button
              className={cn(
                "text-sm font-medium pb-2 -mb-2.5 border-b-2 transition-colors",
                options.extractMode === 'select' ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
              onClick={() => setOptions({ ...options, extractMode: 'select' })}
            >
              Selecionar páginas
            </button>
          </div>

          {options.extractMode === 'all' && (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-sm border border-emerald-100">
              Todas as páginas do PDF serão extraídas em arquivos PDF separados.
            </div>
          )}

          {options.extractMode === 'select' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="extractPages" className="block text-sm font-medium text-gray-700 mb-1">
                  Páginas a extrair
                </label>
                <input
                  type="text"
                  id="extractPages"
                  value={options.extractPages}
                  onChange={(e) => setOptions({ ...options, extractPages: e.target.value })}
                  placeholder="Ex: 1, 3-5, 10"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={options.mergeExtractPages}
                    onChange={(e) => setOptions({ ...options, mergeExtractPages: e.target.checked })}
                    className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-emerald-500 checked:border-emerald-500 transition-colors"
                  />
                  <Check className="w-3.5 h-3.5 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-sm text-gray-700">Juntar páginas extraídas num único ficheiro PDF</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SplitPage() {
  return (
    <ToolPage
      title="Dividir arquivo PDF"
      description="Separe uma página ou um conjunto de páginas para converter em arquivos PDF independentes."
      actionText="Dividir PDF"
      onProcess={(files, options) => splitPdf(files[0], options)}
      multiple={false}
      defaultOptions={defaultOptions}
      optionsComponent={SplitOptionsComponent}
    />
  );
}
