import React, { useState, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { UploadCloud, Download, GripVertical, Trash2, Loader2, Settings } from "lucide-react";
import { pdfjs, Document, Page } from "react-pdf";
import { useDropzone } from "react-dropzone";
import { cn } from "../lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PageItem {
  id: string;
  originalIndex: number;
}

const SortablePageItem: React.FC<{ item: PageItem; file: File; onDelete: (id: string) => void }> = ({ item, file, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 bg-white rounded-md shadow-sm text-gray-400 hover:text-red-500 hover:bg-red-50"
          title="Remover página"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 p-2 bg-gray-50 flex items-center justify-center min-h-[150px]">
        <Document file={file} loading={<div className="animate-pulse bg-gray-200 w-full h-full rounded"></div>}>
          <Page
            pageNumber={item.originalIndex + 1}
            width={120}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-sm"
          />
        </Document>
      </div>
      
      <div className="p-2 border-t border-gray-100 bg-white flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Pág. {item.originalIndex + 1}</span>
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600">
          <GripVertical className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export function OrganizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setPdfUrl(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  } as any);

  useEffect(() => {
    if (file) {
      const loadPdf = async () => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          setTotalPages(pdf.numPages);
          
          const initialPages = Array.from({ length: pdf.numPages }, (_, i) => ({
            id: `page-${i}`,
            originalIndex: i,
          }));
          setPages(initialPages);
        } catch (error) {
          console.error("Error loading PDF:", error);
        }
      };
      loadPdf();
    } else {
      setPages([]);
      setTotalPages(0);
    }
  }, [file]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDeletePage = (id: string) => {
    setPages(pages.filter(p => p.id !== id));
  };

  const handleProcess = async () => {
    if (!file || pages.length === 0) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      const originalPdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();
      
      const pageIndices = pages.map(p => p.originalIndex);
      const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
      
      copiedPages.forEach(page => newPdf.addPage(page));
      
      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      setPdfUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error("Error organizing PDF:", error);
      alert("Ocorreu um erro ao organizar o PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (pdfUrl) {
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
            Seu arquivo foi organizado com sucesso.
          </p>
          <div className="mt-8">
            <a
              href={pdfUrl}
              download="organizado.pdf"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Baixar PDF
            </a>
          </div>
          <div className="mt-4">
            <button
              onClick={() => {
                setPdfUrl(null);
                setFile(null);
              }}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
            >
              Organizar outro arquivo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {!file ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl mb-4">
              Organizar PDF
            </h1>
            <p className="text-xl text-gray-500">
              Ordene páginas do seu PDF como quiser. Apague páginas indesejadas.
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
              Selecionar arquivo PDF
            </button>
            <p className="mt-6 text-lg text-gray-500">
              ou arraste e solte o PDF aqui
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="bg-gray-900 text-white py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Organizar PDF</h1>
            </div>
            <button
              onClick={() => setFile(null)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-700"
            >
              Trocar arquivo
            </button>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row">
            <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Arraste para reordenar ou clique na lixeira para excluir</h3>
                <span className="text-sm text-gray-500">{pages.length} de {totalPages} páginas</span>
              </div>
              
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={pages.map(p => p.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {pages.map((page) => (
                      <SortablePageItem 
                        key={page.id} 
                        item={page} 
                        file={file} 
                        onDelete={handleDeletePage}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              
              {pages.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Todas as páginas foram removidas.
                </div>
              )}
            </div>

            <div className="w-full lg:w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl z-10">
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                    <Settings className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-bold text-gray-900">Opções</h3>
                  </div>
                  <p className="text-sm text-gray-500">
                    Arraste as páginas na área principal para reordená-las. Clique no ícone de lixeira em uma página para removê-la do documento final.
                  </p>
                </div>
              </div>
              
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={handleProcess}
                  disabled={isProcessing || pages.length === 0}
                  className="w-full flex justify-center items-center py-5 px-4 border border-transparent rounded-xl shadow-lg text-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" />
                      Processando...
                    </>
                  ) : (
                    "Organizar PDF"
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
