import React, { useState, useEffect, useRef, useCallback } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { UploadCloud, Download, Type, PenTool, Image as ImageIcon, MousePointer2, Trash2, ChevronLeft, ChevronRight, Loader2, Eraser, Highlighter, Square, Circle, Edit3, X, ZoomIn, ZoomOut, Bold, Italic, Underline, Link as LinkIcon, Wand2, Undo2, Redo2 } from "lucide-react";
import { pdfjs, Document, Page } from "react-pdf";
import { useDropzone } from "react-dropzone";
import { cn } from "../lib/utils";
import { Stage, Layer, Text, Image as KonvaImage, Line, Transformer, Rect, Ellipse } from "react-konva";
import useImage from "use-image";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Tool = 'select' | 'text' | 'draw' | 'image' | 'eraser' | 'highlight' | 'rect' | 'ellipse' | 'magic-edit';

interface BaseElement {
  id: string;
  type: 'text' | 'image' | 'line' | 'rect' | 'ellipse';
  x: number;
  y: number;
  pageIndex: number;
}

interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily?: string;
  color: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  url?: string;
}

interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  width: number;
  height: number;
}

interface LineElement extends BaseElement {
  type: 'line';
  points: number[];
  color: string;
  strokeWidth: number;
}

interface RectElement extends BaseElement {
  type: 'rect';
  width: number;
  height: number;
  color: string;
  isHighlight?: boolean;
  isWhiteout?: boolean;
}

interface EllipseElement extends BaseElement {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
  color: string;
}

type PdfElement = TextElement | ImageElement | LineElement | RectElement | EllipseElement;

const URLImage = ({ image, isSelected, onSelect, onChange }: any) => {
  const [img] = useImage(image.src);
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <KonvaImage
        image={img}
        x={image.x}
        y={image.y}
        width={image.width}
        height={image.height}
        draggable={isSelected}
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        onDragEnd={(e) => {
          onChange({
            ...image,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...image,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

export function EditPdfPage({ initialTool = 'select' }: { initialTool?: Tool }) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageDimensions, setPageDimensions] = useState<{ width: number, height: number }>({ width: 0, height: 0 });
  
  const [tool, setTool] = useState<Tool>(initialTool);
  const [elements, setElements] = useState<PdfElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [scale, setScale] = useState(1);
  const [pdfTexts, setPdfTexts] = useState<any[]>([]);
  const [hiddenPdfTextIds, setHiddenPdfTextIds] = useState<string[]>([]);
  const [hoveredMagicId, setHoveredMagicId] = useState<string | null>(null);
  
  const [history, setHistory] = useState<{ elements: PdfElement[], hiddenPdfTextIds: string[] }[]>([{ elements: [], hiddenPdfTextIds: [] }]);
  const [historyStep, setHistoryStep] = useState<number>(0);
  const historyStepRef = useRef(0);

  const stageRef = useRef<any>(null);

  const updateHistoryStep = useCallback((step: number) => {
    setHistoryStep(step);
    historyStepRef.current = step;
  }, []);

  const pushToHistory = useCallback((newElements: PdfElement[], newHiddenIds: string[]) => {
    setHistory(prevHistory => {
      const currentStep = historyStepRef.current;
      const newHistory = prevHistory.slice(0, currentStep + 1);
      newHistory.push({ elements: newElements, hiddenPdfTextIds: newHiddenIds });
      updateHistoryStep(currentStep + 1);
      return newHistory;
    });
  }, [updateHistoryStep]);

  const handleUndo = useCallback(() => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      updateHistoryStep(prevStep);
      setElements(history[prevStep].elements);
      setHiddenPdfTextIds(history[prevStep].hiddenPdfTextIds);
    }
  }, [historyStep, history, updateHistoryStep]);

  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      updateHistoryStep(nextStep);
      setElements(history[nextStep].elements);
      setHiddenPdfTextIds(history[nextStep].hiddenPdfTextIds);
    }
  }, [historyStep, history, updateHistoryStep]);

  useEffect(() => {
    setTool(initialTool);
  }, [initialTool]);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setPdfUrl(null);
      setElements([]);
      setHiddenPdfTextIds([]);
      setHistory([{ elements: [], hiddenPdfTextIds: [] }]);
      updateHistoryStep(0);
      setCurrentPage(1);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const handlePageLoadSuccess = async (page: any) => {
    const viewport = page.getViewport({ scale: 1 });
    setPageDimensions({ width: viewport.width, height: viewport.height });
    
    try {
      const textContent = await page.getTextContent();
      
      const items = textContent.items.filter((item: any) => item.str.trim().length > 0);
      
      // Sort top-to-bottom, then left-to-right
      items.sort((a: any, b: any) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 5) return yDiff;
        return a.transform[4] - b.transform[4];
      });

      const groupedTexts: any[] = [];
      let currentGroup: any = null;

      for (const item of items) {
        const fontSize = Math.sqrt(item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]);
        const pdfX = item.transform[4];
        const pdfY = item.transform[5];
        const width = item.width || (item.str.length * fontSize * 0.5);

        if (!currentGroup) {
          currentGroup = {
            str: item.str,
            x: pdfX,
            y: pdfY,
            width: width,
            fontSize: fontSize,
          };
        } else {
          const isSameLine = Math.abs(currentGroup.y - pdfY) < fontSize * 0.5;
          const gap = pdfX - (currentGroup.x + currentGroup.width);
          const isClose = gap < fontSize * 2; // Allow some gap for spaces

          if (isSameLine && isClose) {
            if (gap > fontSize * 0.2) currentGroup.str += ' ';
            currentGroup.str += item.str;
            currentGroup.width = (pdfX + width) - currentGroup.x;
            currentGroup.fontSize = Math.max(currentGroup.fontSize, fontSize);
          } else {
            groupedTexts.push(currentGroup);
            currentGroup = {
              str: item.str,
              x: pdfX,
              y: pdfY,
              width: width,
              fontSize: fontSize,
            };
          }
        }
      }
      if (currentGroup) groupedTexts.push(currentGroup);

      const texts = groupedTexts.map((item: any, index: number) => {
        return {
          id: `page-${currentPage}-text-${index}-${item.x}-${item.y}`,
          str: item.str,
          x: item.x,
          y: viewport.height - item.y - item.fontSize * 0.8,
          width: item.width,
          height: item.fontSize * 1.2,
          fontSize: item.fontSize,
        };
      });
      
      setPdfTexts(texts);
    } catch (err) {
      console.error("Error extracting text:", err);
    }
  };

  const handleStageMouseDown = (e: any) => {
    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
      }
      return;
    }

    const pos = e.target.getStage().getPointerPosition();
    const scaledPos = { x: pos.x / scale, y: pos.y / scale };
    
    if (tool === 'text') {
      const newText: TextElement = {
        id: Date.now().toString(),
        type: 'text',
        pageIndex: currentPage - 1,
        x: scaledPos.x,
        y: scaledPos.y,
        text: "Novo Texto",
        fontSize: 16,
        fontFamily: 'Helvetica',
        color,
      };
      const newElements = [...elements, newText];
      setElements(newElements);
      pushToHistory(newElements, hiddenPdfTextIds);
      setTool('select');
      setSelectedId(newText.id);
    } else if (tool === 'draw') {
      setIsDrawing(true);
      const newLine: LineElement = {
        id: Date.now().toString(),
        type: 'line',
        pageIndex: currentPage - 1,
        x: 0,
        y: 0,
        points: [scaledPos.x, scaledPos.y],
        color,
        strokeWidth: 3,
      };
      setElements([...elements, newLine]);
    } else if (tool === 'eraser' || tool === 'highlight' || tool === 'rect') {
      setIsDrawing(true);
      const newRect: RectElement = {
        id: Date.now().toString(),
        type: 'rect',
        pageIndex: currentPage - 1,
        x: scaledPos.x,
        y: scaledPos.y,
        width: 0,
        height: 0,
        color: tool === 'eraser' ? '#ffffff' : tool === 'highlight' ? 'rgba(255, 255, 0, 0.4)' : color,
        isHighlight: tool === 'highlight',
      };
      setElements([...elements, newRect]);
    } else if (tool === 'ellipse') {
      setIsDrawing(true);
      const newEllipse: EllipseElement = {
        id: Date.now().toString(),
        type: 'ellipse',
        pageIndex: currentPage - 1,
        x: scaledPos.x,
        y: scaledPos.y,
        radiusX: 0,
        radiusY: 0,
        color,
      };
      setElements([...elements, newEllipse]);
    }
  };

  const handleStageMouseMove = (e: any) => {
    if (!isDrawing) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const scaledPoint = { x: point.x / scale, y: point.y / scale };
    
    if (tool === 'draw') {
      setElements(prev => {
        const lastLine = { ...prev[prev.length - 1] } as LineElement;
        lastLine.points = lastLine.points.concat([scaledPoint.x, scaledPoint.y]);
        const newElements = [...prev];
        newElements[newElements.length - 1] = lastLine;
        return newElements;
      });
    } else if (tool === 'eraser' || tool === 'highlight' || tool === 'rect') {
      setElements(prev => {
        const lastRect = { ...prev[prev.length - 1] } as RectElement;
        lastRect.width = scaledPoint.x - lastRect.x;
        lastRect.height = scaledPoint.y - lastRect.y;
        const newElements = [...prev];
        newElements[newElements.length - 1] = lastRect;
        return newElements;
      });
    } else if (tool === 'ellipse') {
      setElements(prev => {
        const lastEllipse = { ...prev[prev.length - 1] } as EllipseElement;
        lastEllipse.radiusX = Math.abs(scaledPoint.x - lastEllipse.x);
        lastEllipse.radiusY = Math.abs(scaledPoint.y - lastEllipse.y);
        const newElements = [...prev];
        newElements[newElements.length - 1] = lastEllipse;
        return newElements;
      });
    }
  };

  const handleStageMouseUp = () => {
    if (isDrawing && (tool === 'eraser' || tool === 'highlight' || tool === 'rect' || tool === 'ellipse' || tool === 'draw')) {
      // Normalize rect (handle negative width/height)
      const newElements = [...elements];
      const lastRect = { ...newElements[newElements.length - 1] } as RectElement;
      if (lastRect.type === 'rect') {
        lastRect.x = lastRect.width < 0 ? lastRect.x + lastRect.width : lastRect.x;
        lastRect.y = lastRect.height < 0 ? lastRect.y + lastRect.height : lastRect.y;
        lastRect.width = Math.abs(lastRect.width);
        lastRect.height = Math.abs(lastRect.height);
        newElements[newElements.length - 1] = lastRect;
      }
      setElements(newElements);
      pushToHistory(newElements, hiddenPdfTextIds);
    }
    setIsDrawing(false);
  };

  const handleMagicEditClick = (pt: any) => {
    if (tool !== 'magic-edit') return;
    
    const padding = 0; // Bem justo
    const newRect: RectElement = {
      id: Date.now().toString() + '-bg',
      type: 'rect',
      pageIndex: currentPage - 1,
      x: pt.x - padding,
      y: pt.y - padding,
      width: pt.width + (padding * 2),
      height: pt.height + (padding * 2),
      color: '#ffffff',
      isWhiteout: true,
    };
    
    const newText: TextElement = {
      id: Date.now().toString() + '-txt',
      type: 'text',
      pageIndex: currentPage - 1,
      x: pt.x,
      y: pt.y + pt.height * 0.1,
      text: pt.str,
      fontSize: pt.fontSize,
      fontFamily: 'Helvetica',
      color: '#000000',
    };
    
    const newElements = [...elements, newRect, newText];
    const newHiddenIds = [...hiddenPdfTextIds, pt.id];
    
    setElements(newElements);
    setHiddenPdfTextIds(newHiddenIds);
    pushToHistory(newElements, newHiddenIds);
    
    setTool('select');
    setSelectedId(newText.id);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const newImage: ImageElement = {
          id: Date.now().toString(),
          type: 'image',
          pageIndex: currentPage - 1,
          x: 50,
          y: 50,
          src: reader.result as string,
          width: 150,
          height: 150,
        };
        const newElements = [...elements, newImage];
        setElements(newElements);
        pushToHistory(newElements, hiddenPdfTextIds);
        setTool('select');
        setSelectedId(newImage.id);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedId) {
      const newElements = elements.filter(el => el.id !== selectedId);
      setElements(newElements);
      pushToHistory(newElements, hiddenPdfTextIds);
      setSelectedId(null);
    }
  };

  useEffect(() => {
    if (selectedId) {
      const selectedEl = elements.find(el => el.id === selectedId);
      if (selectedEl && 'color' in selectedEl && selectedEl.color) {
        setColor(selectedEl.color);
      }
    }
  }, [selectedId, elements]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, elements]);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
  };

  const toggleTextFormat = (field: keyof TextElement, value?: any) => {
    if (!selectedId) return;
    const newElements = elements.map(el => {
      if (el.id === selectedId && el.type === 'text') {
        return { ...el, [field]: value !== undefined ? value : !(el as any)[field] };
      }
      return el;
    });
    setElements(newElements);
    pushToHistory(newElements, hiddenPdfTextIds);
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      const fonts = {
        normal: await pdfDoc.embedFont(StandardFonts.Helvetica),
        bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
        boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
      };

      const pages = pdfDoc.getPages();

      for (const el of elements) {
        const page = pages[el.pageIndex];
        const { height } = page.getSize();
        // Note: pdf-lib uses bottom-left origin, Konva uses top-left origin.
        // We need to invert the Y axis.

        if (el.type === 'text') {
          const rgbColor = hexToRgb(el.color);
          let font = fonts.normal;
          if (el.isBold && el.isItalic) font = fonts.boldItalic;
          else if (el.isBold) font = fonts.bold;
          else if (el.isItalic) font = fonts.italic;

          page.drawText(el.text, {
            x: el.x,
            y: height - el.y - el.fontSize, // Adjust for font baseline
            size: el.fontSize,
            font: font,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
          });

          if (el.isUnderline) {
            const textWidth = font.widthOfTextAtSize(el.text, el.fontSize);
            page.drawLine({
              start: { x: el.x, y: height - el.y - el.fontSize - 2 },
              end: { x: el.x + textWidth, y: height - el.y - el.fontSize - 2 },
              thickness: 1,
              color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
            });
          }

          if (el.url) {
            const textWidth = font.widthOfTextAtSize(el.text, el.fontSize);
            const link = pdfDoc.context.obj({
              Type: 'Annot',
              Subtype: 'Link',
              Rect: [el.x, height - el.y - el.fontSize, el.x + textWidth, height - el.y],
              Border: [0, 0, 0],
              A: {
                Type: 'Action',
                S: 'URI',
                URI: pdfDoc.context.obj(el.url),
              },
            });
            const annots = page.node.Annots();
            if (annots) {
              annots.push(link);
            } else {
              page.node.set(pdfDoc.context.obj('Annots'), pdfDoc.context.obj([link]));
            }
          }
        } else if (el.type === 'image') {
          const imgBytes = await fetch(el.src).then(res => res.arrayBuffer());
          let image;
          if (el.src.startsWith('data:image/png')) {
            image = await pdfDoc.embedPng(imgBytes);
          } else {
            image = await pdfDoc.embedJpg(imgBytes);
          }
          page.drawImage(image, {
            x: el.x,
            y: height - el.y - el.height,
            width: el.width,
            height: el.height,
          });
        } else if (el.type === 'line') {
          const rgbColor = hexToRgb(el.color);
          const points = el.points;
          if (points.length >= 4) {
            // Draw lines between points
            for (let i = 0; i < points.length - 2; i += 2) {
              page.drawLine({
                start: { x: points[i], y: height - points[i + 1] },
                end: { x: points[i + 2], y: height - points[i + 3] },
                thickness: el.strokeWidth,
                color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
              });
            }
          }
        } else if (el.type === 'rect') {
          const rgbColor = hexToRgb(el.color);
          const opacity = el.isHighlight ? 0.4 : 1;
          page.drawRectangle({
            x: el.x,
            y: height - el.y - el.height,
            width: el.width,
            height: el.height,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
            opacity,
          });
        } else if (el.type === 'ellipse') {
          const rgbColor = hexToRgb(el.color);
          page.drawEllipse({
            x: el.x + el.radiusX, // pdf-lib ellipse x,y is center
            y: height - el.y - el.radiusY,
            xScale: el.radiusX,
            yScale: el.radiusY,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      setPdfUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error("Error editing PDF:", error);
      alert("Ocorreu um erro ao editar o PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPageElements = elements.filter(el => el.pageIndex === currentPage - 1);

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
            Seu arquivo foi editado com sucesso.
          </p>
          <div className="mt-8">
            <a
              href={pdfUrl}
              download="editado.pdf"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Baixar PDF Editado
            </a>
          </div>
          <div className="mt-4">
            <button
              onClick={() => {
                setPdfUrl(null);
                setFile(null);
                setElements([]);
              }}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
            >
              Editar outro arquivo
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
              Editar PDF
            </h1>
            <p className="text-xl text-gray-500">
              Adicione texto, imagens e desenhos ao seu documento PDF de forma rápida e fácil.
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
          <div className="bg-white border-b border-gray-200 py-3 px-4 sm:px-6 lg:px-8 flex justify-between items-center shadow-sm z-10 relative">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-800 hidden md:block">Editar PDF</h1>
              <div className="h-6 w-px bg-gray-300 mx-2 hidden md:block"></div>
              
              {/* Toolbar */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={handleUndo}
                  disabled={historyStep === 0}
                  className="p-2 rounded-md transition-colors text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Desfazer"
                >
                  <Undo2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyStep === history.length - 1}
                  className="p-2 rounded-md transition-colors text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refazer"
                >
                  <Redo2 className="w-5 h-5" />
                </button>
                <div className="h-6 w-px bg-gray-300 mx-1"></div>
                
                <button
                  onClick={() => setTool('select')}
                  className={cn("p-2 rounded-md transition-colors", tool === 'select' ? "bg-white shadow-sm text-emerald-600" : "text-gray-600 hover:bg-gray-200")}
                  title="Selecionar"
                >
                  <MousePointer2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setTool('magic-edit')}
                  className={cn("p-2 rounded-md transition-colors", tool === 'magic-edit' ? "bg-white shadow-sm text-emerald-600" : "text-gray-600 hover:bg-gray-200")}
                  title="Editar Texto Existente (Mágico)"
                >
                  <Wand2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setTool('text')}
                  className={cn("p-2 rounded-md transition-colors", tool === 'text' ? "bg-white shadow-sm text-emerald-600" : "text-gray-600 hover:bg-gray-200")}
                  title="Adicionar Texto"
                >
                  <Type className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setTool('draw')}
                  className={cn("p-2 rounded-md transition-colors", tool === 'draw' && color !== '#000000' ? "bg-white shadow-sm text-emerald-600" : "text-gray-600 hover:bg-gray-200")}
                  title="Desenhar"
                >
                  <PenTool className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={cn("p-2 rounded-md transition-colors", tool === 'eraser' ? "bg-white shadow-sm text-emerald-600" : "text-gray-600 hover:bg-gray-200")}
                  title="Apagar (Ocultar texto existente)"
                >
                  <Eraser className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setTool('highlight')}
                  className={cn("p-2 rounded-md transition-colors", tool === 'highlight' ? "bg-white shadow-sm text-emerald-600" : "text-gray-600 hover:bg-gray-200")}
                  title="Destacar (Marca-texto)"
                >
                  <Highlighter className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setTool('rect')}
                  className={cn("p-2 rounded-md transition-colors", tool === 'rect' ? "bg-white shadow-sm text-emerald-600" : "text-gray-600 hover:bg-gray-200")}
                  title="Retângulo"
                >
                  <Square className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setTool('ellipse')}
                  className={cn("p-2 rounded-md transition-colors", tool === 'ellipse' ? "bg-white shadow-sm text-emerald-600" : "text-gray-600 hover:bg-gray-200")}
                  title="Elipse"
                >
                  <Circle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setTool('draw');
                    setColor('#000000');
                  }}
                  className={cn("p-2 rounded-md transition-colors", tool === 'draw' && color === '#000000' ? "bg-white shadow-sm text-emerald-600" : "text-gray-600 hover:bg-gray-200")}
                  title="Assinar"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <label
                  className={cn("p-2 rounded-md transition-colors cursor-pointer", tool === 'image' ? "bg-white shadow-sm text-emerald-600" : "text-gray-600 hover:bg-gray-200")}
                  title="Adicionar Imagem"
                >
                  <ImageIcon className="w-5 h-5" />
                  <input type="file" accept="image/jpeg, image/png" className="hidden" onChange={handleImageUpload} />
                </label>
                
                <div className="h-6 w-px bg-gray-300 mx-1"></div>
                
                <div className="flex items-center gap-1">
                  <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1 hover:bg-gray-200 rounded text-gray-600" title="Menos Zoom"><ZoomOut size={18}/></button>
                  <span className="text-xs font-medium w-10 text-center text-gray-700">{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-1 hover:bg-gray-200 rounded text-gray-600" title="Mais Zoom"><ZoomIn size={18}/></button>
                </div>

                <div className="h-6 w-px bg-gray-300 mx-1"></div>
                
                <div className="flex items-center justify-center p-1">
                  <input 
                    type="color" 
                    value={color} 
                    onChange={(e) => {
                      const newColor = e.target.value;
                      setColor(newColor);
                      if (selectedId) {
                        const newElements = elements.map(el => 
                          el.id === selectedId && (el.type === 'text' || el.type === 'rect' || el.type === 'ellipse' || el.type === 'line') 
                            ? { ...el, color: newColor } 
                            : el
                        );
                        setElements(newElements);
                      }
                    }}
                    onBlur={() => {
                      if (selectedId) pushToHistory(elements, hiddenPdfTextIds);
                    }}
                    className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                    title="Cor"
                  />
                </div>
                
                {selectedId && elements.find(el => el.id === selectedId)?.type === 'text' && (
                  <div className="flex items-center gap-1 ml-1 bg-white p-1 rounded border border-gray-200 shadow-sm">
                    <input
                      type="text"
                      value={(elements.find(el => el.id === selectedId) as TextElement).text}
                      onChange={(e) => {
                        setElements(elements.map(el => 
                          el.id === selectedId ? { ...el, text: e.target.value } : el
                        ));
                      }}
                      onBlur={() => pushToHistory(elements, hiddenPdfTextIds)}
                      className="bg-gray-50 text-gray-800 px-2 py-1 rounded text-sm w-32 md:w-48 border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      placeholder="Texto"
                    />
                    <input
                      type="number"
                      value={(elements.find(el => el.id === selectedId) as TextElement).fontSize}
                      onChange={(e) => {
                        setElements(elements.map(el => 
                          el.id === selectedId ? { ...el, fontSize: Number(e.target.value) } : el
                        ));
                      }}
                      onBlur={() => pushToHistory(elements, hiddenPdfTextIds)}
                      className="bg-gray-50 text-gray-800 px-2 py-1 rounded text-sm w-16 border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      min="8"
                      max="120"
                      title="Tamanho da fonte"
                    />
                    <div className="h-4 w-px bg-gray-300 mx-1"></div>
                    <button 
                      onClick={() => toggleTextFormat('isBold')} 
                      className={cn("p-1 rounded text-gray-600 hover:bg-gray-100", (elements.find(el => el.id === selectedId) as TextElement).isBold ? "bg-gray-200" : "")}
                      title="Negrito"
                    ><Bold size={16}/></button>
                    <button 
                      onClick={() => toggleTextFormat('isItalic')} 
                      className={cn("p-1 rounded text-gray-600 hover:bg-gray-100", (elements.find(el => el.id === selectedId) as TextElement).isItalic ? "bg-gray-200" : "")}
                      title="Itálico"
                    ><Italic size={16}/></button>
                    <button 
                      onClick={() => toggleTextFormat('isUnderline')} 
                      className={cn("p-1 rounded text-gray-600 hover:bg-gray-100", (elements.find(el => el.id === selectedId) as TextElement).isUnderline ? "bg-gray-200" : "")}
                      title="Sublinhado"
                    ><Underline size={16}/></button>
                    <button 
                      onClick={() => {
                        const currentUrl = (elements.find(el => el.id === selectedId) as TextElement).url || '';
                        const url = prompt("Digite a URL do link (ou deixe em branco para remover):", currentUrl);
                        if (url !== null) toggleTextFormat('url', url || undefined);
                      }} 
                      className={cn("p-1 rounded text-gray-600 hover:bg-gray-100", (elements.find(el => el.id === selectedId) as TextElement).url ? "bg-gray-200 text-blue-600" : "")}
                      title="Link"
                    ><LinkIcon size={16}/></button>
                  </div>
                )}
                
                {selectedId && (
                  <button
                    onClick={handleDeleteSelected}
                    className="p-2 rounded-md text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors ml-1"
                    title="Excluir Selecionado"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-bold text-white transition-colors flex items-center gap-2 shadow-sm"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar Alterações"}
              </button>
            </div>
          </div>

          <div className="flex-1 flex bg-gray-200 overflow-hidden relative">
            <div className="flex-1 overflow-auto flex items-start justify-center p-8">
              <div className="relative shadow-xl bg-white" style={{ width: pageDimensions.width * scale, height: pageDimensions.height * scale }}>
                <Document 
                  file={file} 
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  className="absolute inset-0"
                >
                  <Page
                    pageNumber={currentPage}
                    onLoadSuccess={handlePageLoadSuccess}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    scale={scale}
                  />
                </Document>
                
                {pageDimensions.width > 0 && (
                  <div className="absolute inset-0 z-10">
                    <Stage
                      width={pageDimensions.width * scale}
                      height={pageDimensions.height * scale}
                      scaleX={scale}
                      scaleY={scale}
                      onMouseDown={handleStageMouseDown}
                      onMouseMove={handleStageMouseMove}
                      onMouseUp={handleStageMouseUp}
                      ref={stageRef}
                      style={{ cursor: tool === 'text' ? 'text' : tool === 'draw' ? 'crosshair' : 'default' }}
                    >
                      <Layer>
                        {tool === 'magic-edit' && pdfTexts.filter(pt => !hiddenPdfTextIds.includes(pt.id)).map((pt) => (
                          <Rect
                            key={pt.id}
                            x={pt.x - 2}
                            y={pt.y - 2}
                            width={pt.width + 4}
                            height={pt.height + 4}
                            fill={hoveredMagicId === pt.id ? "rgba(16, 185, 129, 0.2)" : "rgba(59, 130, 246, 0.1)"}
                            stroke={hoveredMagicId === pt.id ? "#10b981" : "#3b82f6"}
                            strokeWidth={hoveredMagicId === pt.id ? 2 : 1}
                            dash={hoveredMagicId === pt.id ? [] : [4, 4]}
                            cornerRadius={4}
                            onClick={() => handleMagicEditClick(pt)}
                            onTap={() => handleMagicEditClick(pt)}
                            onMouseEnter={(e) => {
                              const container = e.target.getStage().container();
                              container.style.cursor = 'pointer';
                              setHoveredMagicId(pt.id);
                            }}
                            onMouseLeave={(e) => {
                              const container = e.target.getStage().container();
                              container.style.cursor = 'default';
                              setHoveredMagicId(null);
                            }}
                          />
                        ))}
                        {currentPageElements.map((el) => {
                          if (el.type === 'text') {
                            return (
                              <Text
                                key={el.id}
                                x={el.x}
                                y={el.y}
                                text={el.text}
                                fontSize={el.fontSize}
                                fontFamily={el.fontFamily || 'Helvetica'}
                                fontStyle={`${el.isItalic ? 'italic ' : ''}${el.isBold ? 'bold' : 'normal'}`}
                                textDecoration={el.isUnderline ? 'underline' : ''}
                                fill={el.url ? '#2563eb' : el.color}
                                draggable={tool === 'select'}
                                onClick={() => tool === 'select' && setSelectedId(el.id)}
                                onTap={() => tool === 'select' && setSelectedId(el.id)}
                                onDragEnd={(e) => {
                                  const newElements = elements.map(item => 
                                    item.id === el.id ? { ...item, x: e.target.x(), y: e.target.y() } : item
                                  );
                                  setElements(newElements);
                                  pushToHistory(newElements, hiddenPdfTextIds);
                                }}
                                stroke={selectedId === el.id ? '#10b981' : undefined}
                                strokeWidth={selectedId === el.id ? 1 : 0}
                              />
                            );
                          } else if (el.type === 'image') {
                            return (
                              <URLImage
                                key={el.id}
                                image={el}
                                isSelected={selectedId === el.id}
                                onSelect={() => tool === 'select' && setSelectedId(el.id)}
                                onChange={(newAttrs: any) => {
                                  const newElements = elements.map(item => 
                                    item.id === el.id ? newAttrs : item
                                  );
                                  setElements(newElements);
                                  pushToHistory(newElements, hiddenPdfTextIds);
                                }}
                              />
                            );
                          } else if (el.type === 'line') {
                            return (
                              <Line
                                key={el.id}
                                points={el.points}
                                stroke={el.color}
                                strokeWidth={el.strokeWidth}
                                tension={0.5}
                                lineCap="round"
                                lineJoin="round"
                                draggable={tool === 'select'}
                                onClick={() => tool === 'select' && setSelectedId(el.id)}
                                onTap={() => tool === 'select' && setSelectedId(el.id)}
                                onDragEnd={(e) => {
                                  const newElements = elements.map(item => 
                                    item.id === el.id ? { ...item, x: e.target.x(), y: e.target.y() } : item
                                  );
                                  setElements(newElements);
                                  pushToHistory(newElements, hiddenPdfTextIds);
                                }}
                                shadowColor={selectedId === el.id ? '#10b981' : undefined}
                                shadowBlur={selectedId === el.id ? 5 : 0}
                              />
                            );
                          } else if (el.type === 'rect') {
                            return (
                              <Rect
                                key={el.id}
                                x={el.x}
                                y={el.y}
                                width={el.width}
                                height={el.height}
                                fill={el.color}
                                draggable={el.isWhiteout ? false : tool === 'select'}
                                listening={!el.isWhiteout}
                                onClick={el.isWhiteout ? undefined : () => tool === 'select' && setSelectedId(el.id)}
                                onTap={el.isWhiteout ? undefined : () => tool === 'select' && setSelectedId(el.id)}
                                onDragEnd={(e) => {
                                  if (el.isWhiteout) return;
                                  const newElements = elements.map(item => 
                                    item.id === el.id ? { ...item, x: e.target.x(), y: e.target.y() } : item
                                  );
                                  setElements(newElements);
                                  pushToHistory(newElements, hiddenPdfTextIds);
                                }}
                                stroke={selectedId === el.id && !el.isWhiteout ? '#10b981' : undefined}
                                strokeWidth={selectedId === el.id && !el.isWhiteout ? 2 : 0}
                                globalCompositeOperation={el.isHighlight ? 'multiply' : 'source-over'}
                              />
                            );
                          } else if (el.type === 'ellipse') {
                            return (
                              <Ellipse
                                key={el.id}
                                x={el.x + el.radiusX} // Konva ellipse x,y is center
                                y={el.y + el.radiusY}
                                radiusX={el.radiusX}
                                radiusY={el.radiusY}
                                fill={el.color}
                                draggable={tool === 'select'}
                                onClick={() => tool === 'select' && setSelectedId(el.id)}
                                onTap={() => tool === 'select' && setSelectedId(el.id)}
                                onDragEnd={(e) => {
                                  const newElements = elements.map(item => 
                                    item.id === el.id ? { ...item, x: e.target.x() - el.radiusX, y: e.target.y() - el.radiusY } : item
                                  );
                                  setElements(newElements);
                                  pushToHistory(newElements, hiddenPdfTextIds);
                                }}
                                stroke={selectedId === el.id ? '#10b981' : undefined}
                                strokeWidth={selectedId === el.id ? 2 : 0}
                              />
                            );
                          }
                          return null;
                        })}
                      </Layer>
                    </Stage>
                  </div>
                )}
              </div>
            </div>
            
            {/* Pagination Controls */}
            {numPages > 1 && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full flex items-center gap-4 shadow-lg z-20">
                <button 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-1 hover:bg-gray-700 rounded-full disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium">
                  Página {currentPage} de {numPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                  disabled={currentPage === numPages}
                  className="p-1 hover:bg-gray-700 rounded-full disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
