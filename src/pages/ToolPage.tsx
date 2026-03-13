import React, { useState, useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, File as FileIcon, X, Settings, Download, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import JSZip from "jszip";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableFileItem, FileItemCard } from "../components/SortableFileItem";

interface ToolPageProps {
  title: string;
  description: string;
  actionText: string;
  onProcess: (files: File[], options: any) => Promise<Uint8Array | Uint8Array[]>;
  optionsComponent?: React.ComponentType<{ options: any; setOptions: (opts: any) => void; files: File[] }>;
  defaultOptions?: any;
  multiple?: boolean;
  resultFilename?: string;
  resultMimeType?: string;
  accept?: Record<string, string[]>;
  children?: React.ReactNode;
}

export function ToolPage({
  title,
  description,
  actionText,
  onProcess,
  optionsComponent: OptionsComponent,
  defaultOptions = {},
  multiple = true,
  resultFilename = "resultado.pdf",
  resultMimeType = "application/pdf",
  accept = { 'application/pdf': ['.pdf'] },
  children,
}: ToolPageProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState(defaultOptions);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<Uint8Array | Uint8Array[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fileIds = useMemo(() => files.map((f, i) => `${f.name}-${i}`), [files]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => multiple ? [...prev, ...acceptedFiles] : acceptedFiles);
    setResult(null);
    setError(null);
  }, [multiple]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
  } as any);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFileLeft = (index: number) => {
    if (index > 0) {
      setFiles((prev) => arrayMove(prev, index, index - 1));
    }
  };

  const moveFileRight = (index: number) => {
    if (index < files.length - 1) {
      setFiles((prev) => arrayMove(prev, index, index + 1));
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = fileIds.indexOf(active.id as string);
        const newIndex = fileIds.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const res = await onProcess(files, options);
      setResult(res);
    } catch (err) {
      console.error(err);
      setError("Ocorreu um erro ao processar o arquivo. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (data: Uint8Array, filename: string) => {
    const blob = new Blob([data], { type: resultMimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    if (!result) return;
    if (Array.isArray(result)) {
      if (result.length === 1) {
        handleDownload(result[0], `resultado-1.pdf`);
      } else {
        const zip = new JSZip();
        result.forEach((res, i) => {
          zip.file(`resultado-${i + 1}.pdf`, res);
        });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resultados.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } else {
      handleDownload(result, resultFilename);
    }
  };

  const activeIndex = activeId ? fileIds.indexOf(activeId) : -1;
  const activeFile = activeIndex >= 0 ? files[activeIndex] : null;

  if (result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-emerald-100">
            <Download className="h-12 w-12 text-emerald-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Pronto!
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Seu arquivo foi processado com sucesso.
          </p>
          <div className="mt-8">
            <button
              onClick={downloadAll}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              {Array.isArray(result) && result.length > 1 ? 'Baixar ZIP' : 'Baixar PDF'}
            </button>
          </div>
          <div className="mt-4">
            <button
              onClick={() => {
                setResult(null);
                setFiles([]);
              }}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
            >
              Processar outro arquivo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {files.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl mb-4">
              {title}
            </h1>
            <p className="text-xl text-gray-500">
              {description}
            </p>
          </div>
          
          <div
            {...getRootProps()}
            className={cn(
              "w-full max-w-4xl mx-auto flex flex-col items-center justify-center rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 min-h-[400px] shadow-sm border-2",
              isDragActive ? "border-emerald-500 bg-emerald-50 scale-[1.02]" : "border-transparent bg-white hover:shadow-md"
            )}
          >
            <input {...getInputProps()} />
            <button className="px-10 py-6 bg-emerald-600 text-white rounded-2xl font-bold text-2xl shadow-lg hover:bg-emerald-700 hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-4">
              <UploadCloud className="h-8 w-8" />
              Selecionar arquivos PDF
            </button>
            <p className="mt-6 text-lg text-gray-500">
              ou arraste e solte os PDFs aqui
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="bg-gray-900 text-white py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
            </div>
            <button
              {...getRootProps()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-gray-700"
            >
              <input {...getInputProps()} />
              <UploadCloud className="h-4 w-4" />
              Adicionar mais arquivos
            </button>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row">
            <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={fileIds}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {files.map((file, index) => (
                      <SortableFileItem
                        key={fileIds[index]}
                        id={fileIds[index]}
                        file={file}
                        index={index}
                        totalFiles={files.length}
                        onRemove={removeFile}
                        onMoveLeft={moveFileLeft}
                        onMoveRight={moveFileRight}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay adjustScale={false}>
                  {activeId && activeFile ? (
                    <FileItemCard
                      file={activeFile}
                      index={activeIndex}
                      totalFiles={files.length}
                      onRemove={() => {}}
                      onMoveLeft={() => {}}
                      onMoveRight={() => {}}
                      isOverlay
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>

            <div className="w-full lg:w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl z-10">
              <div className="flex-1 p-6 overflow-y-auto">
                {OptionsComponent && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                      <Settings className="h-5 w-5 text-gray-500" />
                      <h3 className="text-lg font-bold text-gray-900">Opções</h3>
                    </div>
                    <OptionsComponent options={options} setOptions={setOptions} files={files} />
                  </div>
                )}
                
                {children}
                
                {error && (
                  <div className="mb-4 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                    {error}
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full flex justify-center items-center py-5 px-4 border border-transparent rounded-xl shadow-lg text-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" />
                      Processando...
                    </>
                  ) : (
                    actionText
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
