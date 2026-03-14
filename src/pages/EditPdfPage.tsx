import React, { useState, useEffect, useRef, useCallback } from "react";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { UploadCloud, Download, Type, PenTool, Image as ImageIcon, MousePointer2, Trash2, ChevronLeft, ChevronRight, Loader2, Eraser, Highlighter, Square, Circle, Edit3, X, ZoomIn, ZoomOut, Bold, Italic, Underline, Link as LinkIcon, Wand2, Undo2, Redo2, ChevronDown, Shapes, RotateCw } from "lucide-react";
import { pdfjs, Document, Page } from "react-pdf";
import { useDropzone } from "react-dropzone";
import { cn } from "../lib/utils";
import { Stage, Layer, Text, Image as KonvaImage, Line, Transformer, Rect, Ellipse, Label, Tag } from "react-konva";
import useImage from "use-image";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Tool = 'select' | 'text' | 'draw' | 'image' | 'eraser' | 'highlight' | 'rect' | 'ellipse' | 'magic-edit';

interface BaseElement {
  id: string;
  type: 'text' | 'image' | 'line' | 'rect' | 'ellipse';
  x: number;
  y: number;
  rotation?: number;
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
  backgroundColor?: string;
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

const RotatableText = ({ element, tool, isSelected, onSelect, onChange }: any) => {
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
      <Label
        ref={shapeRef}
        x={element.x}
        y={element.y}
        rotation={element.rotation || 0}
        draggable={tool === 'select'}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            ...element,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          onChange({
            ...element,
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
          });
        }}
      >
        {element.backgroundColor && element.backgroundColor !== 'transparent' && (
          <Tag fill={element.backgroundColor} cornerRadius={2} />
        )}
        <Text
          text={element.text}
          fontSize={element.fontSize}
          fontFamily={element.fontFamily || 'Helvetica'}
          fontStyle={`${element.isItalic ? 'italic ' : ''}${element.isBold ? 'bold' : 'normal'}`}
          textDecoration={element.isUnderline ? 'underline' : ''}
          fill={element.url ? '#2563eb' : element.color}
          padding={element.backgroundColor && element.backgroundColor !== 'transparent' ? 2 : 0}
          width={element.width}
          wrap="none"
          ellipsis={false}
        />
      </Label>
      {isSelected && tool === 'select' && (
        <Transformer
          ref={trRef}
          resizeEnabled={false} // Disable resizing for text to keep font-size scaling pure, only rotation
          rotateEnabled={true}
          boundBoxFunc={(oldBox, newBox) => newBox}
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
  
  const [history, setHistory] = useState<{ elements: PdfElement[], hiddenPdfTextIds: string[], page: number }[]>([
    { elements: [], hiddenPdfTextIds: [], page: 1 }
  ]);
  const [historyStep, setHistoryStep] = useState<number>(0);
  const historyStepRef = useRef(0);

  const stageRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    const usedFonts = new Set<string>();
    elements.forEach(el => {
      if (el.type === 'text' && el.fontFamily && !['Helvetica', 'TimesRoman', 'Courier', 'Symbol', 'ZapfDingbats'].includes(el.fontFamily)) {
        usedFonts.add(el.fontFamily);
      }
    });

    if (usedFonts.size > 0) {
      const fontFamilies = Array.from(usedFonts).map(f => f.replace(/\s+/g, '+')).join('|');
      const linkId = 'dynamic-google-fonts';
      let link = document.getElementById(linkId) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      link.href = `https://fonts.googleapis.com/css?family=${fontFamilies}&display=swap`;
    }
  }, [elements]);

  const updateHistoryStep = useCallback((step: number) => {
    setHistoryStep(step);
    historyStepRef.current = step;
  }, []);

  const pushToHistory = useCallback((newElements: PdfElement[], newHiddenIds: string[]) => {
    setHistory(prevHistory => {
      const currentStep = historyStepRef.current;
      // Deep clone to prevent unintended mutations from the current state
      const clonedElements = JSON.parse(JSON.stringify(newElements));
      const clonedHiddenIds = [...newHiddenIds];
      
      const newHistory = prevHistory.slice(0, currentStep + 1);
      newHistory.push({ 
        elements: clonedElements, 
        hiddenPdfTextIds: clonedHiddenIds, 
        page: currentPage 
      });
      
      // Limit history to 50 steps
      const finalHistory = newHistory.length > 51 ? newHistory.slice(newHistory.length - 51) : newHistory;
      updateHistoryStep(finalHistory.length - 1);
      return finalHistory;
    });
  }, [updateHistoryStep, currentPage]);

  const handleUndo = useCallback(() => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      const state = history[prevStep];
      updateHistoryStep(prevStep);
      setElements(JSON.parse(JSON.stringify(state.elements)));
      setHiddenPdfTextIds([...state.hiddenPdfTextIds]);
      setCurrentPage(state.page);
      
      // Preserve selection if the element still exists in the previous state
      setSelectedId(prevId => {
        if (!prevId) return null;
        return state.elements.find(el => el.id === prevId) ? prevId : null;
      });
    }
  }, [historyStep, history, updateHistoryStep]);

  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      const state = history[nextStep];
      updateHistoryStep(nextStep);
      setElements(JSON.parse(JSON.stringify(state.elements)));
      setHiddenPdfTextIds([...state.hiddenPdfTextIds]);
      setCurrentPage(state.page);
      
      // Preserve selection if the element still exists in the next state
      setSelectedId(prevId => {
        if (!prevId) return null;
        return state.elements.find(el => el.id === prevId) ? prevId : null;
      });
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
      setHistory([{ elements: [], hiddenPdfTextIds: [], page: 1 }]);
      updateHistoryStep(0);
      setCurrentPage(1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger undo/redo if the user is typing in an input or textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

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
      const styles = textContent.styles;
      
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
            rotation: Math.atan2(item.transform[1], item.transform[0]) * (180 / Math.PI),
            dirX: item.transform[0] / fontSize,
            dirY: item.transform[1] / fontSize,
            ascentX: item.transform[2] / fontSize,
            ascentY: item.transform[3] / fontSize,
          };
        } else {
          const rotation = Math.atan2(item.transform[1], item.transform[0]) * (180 / Math.PI);
          const isRotated = Math.abs(rotation) > 0.1;
          const rotationDiff = Math.abs(currentGroup.rotation - rotation);
          const isSameRotation = isRotated ? (rotationDiff < 0.8) : (rotationDiff < 0.2);
          
          // Melhoria para detecção de texto vertical/diagonal
          const angleRad = (rotation * Math.PI) / 180;
          const cosA = Math.cos(angleRad);
          const sinA = Math.sin(angleRad);

          // Projeta a distância entre os pontos no eixo do texto
          const dx = pdfX - currentGroup.x;
          const dy = pdfY - currentGroup.y;
          const distAlongText = dx * cosA + dy * sinA;
          const distPerpText = Math.abs(-dx * sinA + dy * cosA);

          // Interaction Floor: Threshold mínimo de 1.5px p/ garantir seleção de fontes pequenas
          const perpThreshold = Math.max(isRotated ? fontSize * 0.15 : fontSize * 0.15, 1.5);
          const isSameLine = distPerpText < perpThreshold;
          
          // Gap Floor: Threshold mínimo de 2px p/ evitar fragmentação de palavras em fontes pequenas
          const gapThreshold = Math.max(isRotated ? fontSize * 0.5 : fontSize * 0.3, 2.0);
          const gap = distAlongText - currentGroup.width;
          const isClose = gap < gapThreshold;

          if (isSameLine && isClose && isSameRotation) {
            if (gap > fontSize * 0.05) currentGroup.str += ' ';
            currentGroup.str += item.str;
            currentGroup.width = distAlongText + width;
            currentGroup.fontSize = Math.max(currentGroup.fontSize, fontSize);
            // Mantemos a rotação do primeiro item como 'master' para evitar drift
          } else {
            groupedTexts.push(currentGroup);
            currentGroup = {
              str: item.str,
              x: pdfX,
              y: pdfY,
              width: width,
              fontSize: fontSize,
              fontFamily: styles[item.fontName]?.fontFamily || 'Helvetica',
              rotation: rotation,
              dirX: item.transform[0] / fontSize,
              dirY: item.transform[1] / fontSize,
              ascentX: item.transform[2] / fontSize,
              ascentY: item.transform[3] / fontSize,
            };
          }
        }
      }
      if (currentGroup) groupedTexts.push(currentGroup);
      const texts = groupedTexts.map((item: any, index: number) => {
        const isElementRotated = Math.abs(item.rotation) > 0.1;
        
        // Ratio unificado em 0.80: Com o mapeamento vetorial robusto, 
        // 0.80 atende perfeitamente tanto horizontais quanto inclinados.
        const baselineRatio = 0.80;

        // Buffer Floor: Mínimo de 0.5px p/ garantir hitbox em escalas reduzidas
        const widthBuffer = isElementRotated ? Math.max(item.width * 0.01, 0.5) : 0;

        // Ponto de origem (Baseline Left) ajustado para centralização óptica (TL)
        const pdfX_tl = item.x + (item.fontSize * baselineRatio * item.ascentX) - (widthBuffer / 2 * item.dirX);
        const pdfY_tl = item.y + (item.fontSize * baselineRatio * item.ascentY) - (widthBuffer / 2 * item.dirY);

        // Mapeamento Robusto: Converte para Viewport considerando TODAS as transformações (escala, flip, rotação da página)
        const [screenX, screenY] = viewport.convertToViewportPoint(pdfX_tl, pdfY_tl);
        
        // Cálculo de Ângulo Vetorial: Projetamos um vetor unitário da direção do texto para calcular o ângulo real na tela
        const [v0x, v0y] = viewport.convertToViewportPoint(0, 0);
        const [v1x, v1y] = viewport.convertToViewportPoint(item.dirX, item.dirY);
        const screenAngle = Math.atan2(v1y - v0y, v1x - v0x) * (180 / Math.PI);
        
        return {
          id: `page-${currentPage}-text-${index}-${item.x}-${item.y}`,
          str: item.str,
          x: screenX,
          y: screenY,
          width: item.width + widthBuffer,
          height: item.fontSize, 
          fontSize: item.fontSize,
          fontFamily: item.fontFamily,
          rotation: screenAngle,
          isBold: item.fontFamily?.toLowerCase().includes('bold') || false,
          isItalic: item.fontFamily?.toLowerCase().includes('italic') || item.fontFamily?.toLowerCase().includes('oblique') || false,
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
    
    // Precisão Máxima: Zero Padding para cobertura 100% "colada" no texto original.
    const paddingX = 0; 
    const paddingY = 0;

    // Amostragem por Área (Grade 7x7): Captura 49 pontos para detectar a cor com maior porcentagem (moda).
    let bgColor = '#ffffff';
    try {
      const canvases = document.querySelectorAll('.react-pdf__Page__canvas');
      if (canvases.length > 0) {
        const canvas = canvases[0] as HTMLCanvasElement;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (ctx) {
          const colors: { [hex: string]: number } = {};
          const angleRad = (pt.rotation || 0) * (Math.PI / 180);
          const cosA = Math.cos(angleRad);
          const sinA = Math.sin(angleRad);

          // Criar uma grade 7x7 sobre a área do texto (incluindo margem de padding)
          for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
              // Coordenadas locais na grade (de -paddingX/Y até width/height + paddingX/Y)
              const lx = -paddingX + (col * (pt.width + paddingX * 2) / 6);
              const ly = -paddingY + (row * (pt.height + paddingY * 2) / 6);
              
              // Rotacionar para espaço global
              const globalDX = lx * cosA - ly * sinA;
              const globalDY = lx * sinA + ly * cosA;
              
              const sampleX = Math.max(0, (pt.x * scale) + globalDX * scale);
              const sampleY = Math.max(0, (pt.y * scale) + globalDY * scale);
              
              const pixel = ctx.getImageData(sampleX * devicePixelRatio, sampleY * devicePixelRatio, 1, 1).data;
              if (pixel[3] > 0) {
                const hex = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
                colors[hex] = (colors[hex] || 0) + 1;
              }
            }
          }

          const sortedColors = Object.entries(colors).sort((a, b) => b[1] - a[1]);
          if (sortedColors.length > 0) {
            bgColor = sortedColors[0][0];
          }
        }
      }
    } catch (e) {
      console.warn("Could not read canvas pixels for background color", e);
    }
    
    const angleRad = (pt.rotation || 0) * (Math.PI / 180);
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    
    // Deslocamento vetorial para centralizar o padding (mesmo em vertical/diagonal)
    const dx = (-paddingX) * cosA - (-paddingY) * sinA;
    const dy = (-paddingX) * sinA + (-paddingY) * cosA;

    const newRect: RectElement = {
      id: Date.now().toString() + '-bg',
      type: 'rect',
      pageIndex: currentPage - 1,
      x: pt.x + dx,
      y: pt.y + dy,
      width: pt.width + (paddingX * 2),
      height: pt.height + (paddingY * 2),
      color: bgColor,
      rotation: pt.rotation,
      isWhiteout: true,
    };
    
    const getBestMatchingFont = (original: string): string => {
      const lower = original.toLowerCase();
      
      // Direct matches for 200+ library
      if (lower.includes('roboto')) return 'Roboto';
      if (lower.includes('inter')) return 'Inter';
      if (lower.includes('montserrat')) return 'Montserrat';
      if (lower.includes('open sans')) return 'Open Sans';
      if (lower.includes('lato')) return 'Lato';
      if (lower.includes('poppins')) return 'Poppins';
      if (lower.includes('raleway')) return 'Raleway';
      if (lower.includes('ubuntu')) return 'Ubuntu';
      if (lower.includes('verdana')) return 'Verdana';
      if (lower.includes('tahoma')) return 'Tahoma';
      if (lower.includes('trebuchet')) return 'Trebuchet MS';
      if (lower.includes('century gothic')) return 'Century Gothic';
      if (lower.includes('calibri')) return 'Calibri';
      if (lower.includes('segoe ui')) return 'Segoe UI';
      // Expanded Sans check to avoid falling into 'serif' catch-all
      if (lower.includes('helvetica') || lower.includes('arial') || lower.includes('sans') || lower.includes('liberation')) return 'Helvetica';
      
      if (lower.includes('georgia')) return 'Georgia';
      if (lower.includes('garamond')) return 'Garamond';
      if (lower.includes('palatino')) return 'Palatino';
      if (lower.includes('baskerville')) return 'Baskerville';
      if (lower.includes('playfair')) return 'Playfair Display';
      if (lower.includes('lora')) return 'Lora';
      if (lower.includes('merriweather')) return 'Merriweather';
      if (lower.includes('times')) return 'TimesRoman';
      
      if (lower.includes('consolas')) return 'Consolas';
      if (lower.includes('fira code')) return 'Fira Code';
      if (lower.includes('jetbrains')) return 'JetBrains Mono';
      if (lower.includes('monaco')) return 'Monaco';
      if (lower.includes('courier')) return 'Courier';
      
      if (lower.includes('comic sans')) return 'Comic Sans MS';
      if (lower.includes('pacifico')) return 'Pacifico';
      if (lower.includes('brush script')) return 'Brush Script MT';
      if (lower.includes('impact')) return 'Impact';
      
      if (lower.includes('symbol')) return 'Symbol';
      if (lower.includes('zapf') || lower.includes('dingbats') || lower.includes('wingdings')) return 'ZapfDingbats';

      // Advanced category fallback - specifically excluding 'sans' from 'serif' check
      if (lower.includes('serif') && !lower.includes('sans')) return 'TimesRoman';
      if (lower.includes('mono') || lower.includes('fixed') || lower.includes('code')) return 'Courier';
      if (lower.includes('script') || lower.includes('hand')) return 'Pacifico';
      
      return 'Helvetica';
    };

    const originalFont = pt.fontFamily?.toLowerCase() || '';
    const mappedFont = getBestMatchingFont(originalFont);

    const newText: TextElement = {
      id: Date.now().toString() + '-txt',
      type: 'text',
      pageIndex: currentPage - 1,
      x: pt.x,
      y: pt.y,
      text: pt.str,
      fontSize: pt.fontSize,
      fontFamily: mappedFont,
      isBold: pt.isBold,
      isItalic: pt.isItalic,
      rotation: pt.rotation,
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
        Helvetica: {
          normal: await pdfDoc.embedFont(StandardFonts.Helvetica),
          bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
          italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
          boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
        },
        TimesRoman: {
          normal: await pdfDoc.embedFont(StandardFonts.TimesRoman),
          bold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
          italic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
          boldItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
        },
        Courier: {
          normal: await pdfDoc.embedFont(StandardFonts.Courier),
          bold: await pdfDoc.embedFont(StandardFonts.CourierBold),
          italic: await pdfDoc.embedFont(StandardFonts.CourierOblique),
          boldItalic: await pdfDoc.embedFont(StandardFonts.CourierBoldOblique),
        },
        Symbol: {
          normal: await pdfDoc.embedFont(StandardFonts.Symbol),
          bold: await pdfDoc.embedFont(StandardFonts.Symbol),
          italic: await pdfDoc.embedFont(StandardFonts.Symbol),
          boldItalic: await pdfDoc.embedFont(StandardFonts.Symbol),
        },
        ZapfDingbats: {
          normal: await pdfDoc.embedFont(StandardFonts.ZapfDingbats),
          bold: await pdfDoc.embedFont(StandardFonts.ZapfDingbats),
          italic: await pdfDoc.embedFont(StandardFonts.ZapfDingbats),
          boldItalic: await pdfDoc.embedFont(StandardFonts.ZapfDingbats),
        }
      };

      const pages = pdfDoc.getPages();

      for (const el of elements) {
        const page = pages[el.pageIndex];
        const { height } = page.getSize();
        // Note: pdf-lib uses bottom-left origin, Konva uses top-left origin.
        // We need to invert the Y axis.

        if (el.type === 'text') {
          const rgbColor = hexToRgb(el.color);
          const getFontFamily = (family?: string) => {
            if (!family) return fonts.Helvetica;
            const lower = family.toLowerCase();
            
            // Comprehensive Serif Mapping
            if (
              lower.includes('times') || lower.includes('serif') || lower.includes('georgia') || 
              lower.includes('garamond') || lower.includes('schoolbook') || lower.includes('baskerville') || 
              lower.includes('cambria') || lower.includes('perpetua') || lower.includes('merriweather') || 
              lower.includes('pt serif') || lower.includes('lora') || lower.includes('palatino') || 
              lower.includes('playfair') || lower.includes('crimson') || lower.includes('arvo') || 
              lower.includes('cardo') || lower.includes('bitter') || lower.includes('liberation serif') ||
              lower.includes('baskervville') || lower.includes('bodoni mt') || lower.includes('book antiqua') ||
              lower.includes('didot') || lower.includes('eb garamond') || lower.includes('libre baskerville') ||
              lower.includes('domine') || lower.includes('vollkorn') || lower.includes('zilla slab') ||
              lower.includes('old standard tt') || lower.includes('neuton') || lower.includes('crimson pro')
            ) return fonts.TimesRoman;
            
            // Comprehensive Monospace Mapping
            if (
              lower.includes('courier') || lower.includes('mono') || lower.includes('consolas') || 
              lower.includes('fira') || lower.includes('jetbrains') || lower.includes('source code') || 
              lower.includes('monaco') || lower.includes('fixed') || lower.includes('oxygen') || 
              lower.includes('share tech') || lower.includes('nanum gothic coding') || 
              lower.includes('liberation mono') || lower.includes('inconsolata') || lower.includes('menlo') ||
              lower.includes('ms gothic') || lower.includes('roboto mono') || lower.includes('space mono') ||
              lower.includes('ubuntu mono') || lower.includes('ibm plex mono') || lower.includes('courier prime') ||
              lower.includes('overpass mono') || lower.includes('nova mono') || lower.includes('vt323')
            ) return fonts.Courier;
            
            // Symbols Mapping
            if (lower.includes('symbol') || lower.includes('math')) return fonts.Symbol;
            if (
              lower.includes('zapf') || lower.includes('dingbat') || lower.includes('wingding') || 
              lower.includes('webding') || lower.includes('icons') || lower.includes('font awesome')
            ) return fonts.ZapfDingbats;

            // Cursive / Handwriting / Decorative mappings (Fallback to Times or Helvetica based on vibe)
            if (
              lower.includes('script') || lower.includes('hand') || lower.includes('pacificos') || 
              lower.includes('dancing') || lower.includes('lobster') || lower.includes('caveat') ||
              lower.includes('sacramento') || lower.includes('satisfy') || lower.includes('vibes') ||
              lower.includes('brush') || lower.includes('comic') || lower.includes('cookie') ||
              lower.includes('kaushan') || lower.includes('parisienne') || lower.includes('tangerine')
            ) return fonts.TimesRoman; // Serif vibe for scripts
            
            // Default to Sans-Serif (Helvetica) for all others (Roboto, Montserrat, Inter, Open Sans, etc.)
            return fonts.Helvetica;
          };

          const familyMatch = getFontFamily(el.fontFamily);
          let font = familyMatch.normal;
          if (el.isBold && el.isItalic) font = familyMatch.boldItalic;
          else if (el.isBold) font = familyMatch.bold;
          else if (el.isItalic) font = familyMatch.italic;

          let adjustedX = el.x;
          let textWidth = font.widthOfTextAtSize(el.text, el.fontSize);
          
          const rotationAngle = el.rotation || 0;
          const isRotated = rotationAngle !== 0;
          const angleRad = (-rotationAngle) * (Math.PI / 180); // PDF CCW

          if (el.backgroundColor && el.backgroundColor !== 'transparent') {
            const bgRgbColor = hexToRgb(el.backgroundColor);
            
            // Desenhar fundo. O Konva está no top-left, então para o PDF-lib 
            // rotacionar no mesmo ponto, usamos (el.x, height - el.y) e ajustamos para o pivot de baixo.
            // Para simplicidade e precisão extrema: o pivot do Rect no PDF-lib é o bot-left dele.
            // Mas o nosso rect ja está no topo-esquerdo rotacionado.
            // Então vamos mover o pivot para o ponto de rotação.
            page.drawRectangle({
              x: el.x,
              y: height - el.y,
              width: textWidth,
              height: -el.fontSize * 1.1, // Altura negativa para descer do topo
              color: rgb(bgRgbColor.r, bgRgbColor.g, bgRgbColor.b),
              rotate: isRotated ? degrees(-rotationAngle) : undefined,
            });
          }

          // Para o texto, precisamos mover da origem do Konva (Top-Left) para o Baseline do PDF.
          // Usamos um ratio de 0.8 (ascent habitual) para garantir alinhamento milimétrico.
          const baseSideShiftX = el.fontSize * 0.8 * Math.sin(angleRad);
          const baseSideShiftY = -el.fontSize * 0.8 * Math.cos(angleRad);

          page.drawText(el.text, {
            x: el.x + baseSideShiftX,
            y: (height - el.y) + baseSideShiftY,
            size: el.fontSize,
            font: font,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
            rotate: isRotated ? degrees(-rotationAngle) : undefined,
          });

          if (el.isUnderline) {
            page.drawLine({
              start: { x: adjustedX, y: height - el.y - el.fontSize - 2 },
              end: { x: adjustedX + textWidth, y: height - el.y - el.fontSize - 2 },
              thickness: 1,
              color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
            });
          }

          if (el.url) {
            const link = pdfDoc.context.obj({
              Type: 'Annot',
              Subtype: 'Link',
              Rect: [adjustedX, height - el.y - el.fontSize, adjustedX + textWidth, height - el.y],
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
            rotate: el.rotation ? degrees(-el.rotation) : undefined,
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
          const rotationAngle = el.rotation || 0;
          const angleRadCCW = (-rotationAngle) * (Math.PI / 180);

          // Para rotacionar ao redor do Top-Left (Konva) usando o PDF-lib (que rotaciona no pivot X,Y):
          // Precisamos encontrar a coordenada do Bottom-Left NO ESPAÇO ROTACIONADO.
          // PDF-lib pivot (x,y) -> desenha positivo W, H (sobe em Y).
          // Se (x,y) for o Bottom-Left, ele rotaciona ali.
          
          // Vetor do Top-Left para o Bottom-Left no espaço local: (0, -height)
          // Rotacionado por angleRadCCW:
          // dx = 0 * cos(A) - (-H) * sin(A) = H * sin(A)
          // dy = 0 * sin(A) + (-H) * cos(A) = -H * cos(A)
          
          const pivotShiftX = el.height * Math.sin(angleRadCCW);
          const pivotShiftY = -el.height * Math.cos(angleRadCCW);

          page.drawRectangle({
            x: el.x + pivotShiftX,
            y: (height - el.y) + pivotShiftY,
            width: el.width,
            height: el.height,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
            rotate: rotationAngle ? degrees(-rotationAngle) : undefined,
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
            rotate: el.rotation ? degrees(-el.rotation) : undefined,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
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
          <div className="bg-white border-b border-gray-200 py-3 px-4 sm:px-6 lg:px-8 flex justify-between items-center shadow-md z-[50] sticky top-0">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-800 hidden md:block">Editar PDF</h1>
              <div className="h-6 w-px bg-gray-300 mx-2 hidden md:block"></div>
              
              {/* Toolbar */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={handleUndo}
                  disabled={historyStep === 0}
                  className="p-2 rounded-md transition-colors text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Desfazer (Ctrl+Z)"
                >
                  <Undo2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyStep === history.length - 1}
                  className="p-2 rounded-md transition-colors text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refazer (Ctrl+Y)"
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
                <div className="relative group">
                  <button
                    className={cn("p-2 rounded-md transition-colors flex items-center justify-center", (tool === 'rect' || tool === 'ellipse') ? "bg-white shadow-sm text-emerald-600" : "text-gray-600 hover:bg-gray-200")}
                    title="Formas"
                  >
                    {tool === 'ellipse' ? <Circle className="w-5 h-5" /> : <Shapes className="w-5 h-5" />}
                    <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" />
                  </button>
                  <div className="absolute hidden group-hover:flex flex-col bg-white border border-gray-200 shadow-md rounded-md top-full left-0 z-50 mt-1 overflow-hidden min-w-[120px]">
                    <button 
                      onClick={() => setTool('rect')} 
                      className={cn("p-2 hover:bg-emerald-50 flex items-center gap-2 text-sm w-full text-left transition-colors", tool === 'rect' ? "text-emerald-700 font-medium bg-emerald-50/50" : "text-gray-700")}
                    >
                      <Square className="w-4 h-4"/> Retângulo
                    </button>
                    <button 
                      onClick={() => setTool('ellipse')} 
                      className={cn("p-2 hover:bg-emerald-50 flex items-center gap-2 text-sm w-full text-left transition-colors", tool === 'ellipse' ? "text-emerald-700 font-medium bg-emerald-50/50" : "text-gray-700")}
                    >
                      <Circle className="w-4 h-4"/> Elipse
                    </button>
                  </div>
                </div>
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
                      title="Tamanho da fonte"
                    />
                    <select
                      value={(elements.find(el => el.id === selectedId) as TextElement).fontFamily || 'Helvetica'}
                      onChange={(e) => {
                        setElements(elements.map(el => 
                          el.id === selectedId ? { ...el, fontFamily: e.target.value } : el
                        ));
                      }}
                      onBlur={() => pushToHistory(elements, hiddenPdfTextIds)}
                      className="bg-gray-50 text-gray-800 px-2 py-1 rounded text-sm w-32 border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      title="Fonte"
                    >
                      <option value="Helvetica">Helvetica / Arial (Padrão)</option>
                      <option value="Abril Fatface">Abril Fatface</option>
                      <option value="Alex Brush">Alex Brush</option>
                      <option value="Algerian">Algerian</option>
                      <option value="Allura">Allura</option>
                      <option value="American Typewriter">American Typewriter</option>
                      <option value="Andale Mono">Andale Mono</option>
                      <option value="Apple Chancery">Apple Chancery</option>
                      <option value="Arial">Arial</option>
                      <option value="Arial Black">Arial Black</option>
                      <option value="Arimo">Arimo</option>
                      <option value="Arizonia">Arizonia</option>
                      <option value="Arvo">Arvo</option>
                      <option value="Avenir">Avenir</option>
                      <option value="Bangers">Bangers</option>
                      <option value="Barlow">Barlow</option>
                      <option value="Baskerville">Baskerville</option>
                      <option value="Bauhaus 93">Bauhaus 93</option>
                      <option value="Bitter">Bitter</option>
                      <option value="Blackadder ITC">Blackadder</option>
                      <option value="Bodoni MT">Bodoni</option>
                      <option value="Book Antiqua">Book Antiqua</option>
                      <option value="Broadway">Broadway</option>
                      <option value="Brush Script MT">Brush Script</option>
                      <option value="Cabin">Cabin</option>
                      <option value="Calibri">Calibri</option>
                      <option value="Cambria">Cambria</option>
                      <option value="Candara">Candara</option>
                      <option value="Cardo">Cardo</option>
                      <option value="Caslon">Caslon MT</option>
                      <option value="Caveat">Caveat</option>
                      <option value="Century Gothic">Century Gothic</option>
                      <option value="Century Schoolbook">Century Schoolbook</option>
                      <option value="Chiller">Chiller</option>
                      <option value="Cinzel">Cinzel</option>
                      <option value="Comic Sans MS">Comic Sans</option>
                      <option value="Consolas">Consolas</option>
                      <option value="Constantia">Constantia</option>
                      <option value="Cookie">Cookie</option>
                      <option value="Cooper Black">Cooper Black</option>
                      <option value="Copperplate">Copperplate</option>
                      <option value="Courgette">Courgette</option>
                      <option value="Courier">Courier</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Courier Prime">Courier Prime</option>
                      <option value="Creepster">Creepster</option>
                      <option value="Crimson Pro">Crimson Pro</option>
                      <option value="Crimson Text">Crimson Text</option>
                      <option value="Damion">Damion</option>
                      <option value="Dancing Script">Dancing Script</option>
                      <option value="Didot">Didot</option>
                      <option value="Domine">Domine</option>
                      <option value="Dosis">Dosis</option>
                      <option value="EB Garamond">EB Garamond</option>
                      <option value="Exo 2">Exo 2</option>
                      <option value="Fira Code">Fira Code</option>
                      <option value="Fira Mono">Fira Mono</option>
                      <option value="Fira Sans">Fira Sans</option>
                      <option value="Font Awesome">Font Awesome</option>
                      <option value="Franklin Gothic Medium">Franklin Gothic</option>
                      <option value="Frederickat">Fredoka One</option>
                      <option value="Fredericka the Great">Fredericka the Great</option>
                      <option value="Freestyle Script">Freestyle Script</option>
                      <option value="Frutiger">Frutiger</option>
                      <option value="Futura">Futura</option>
                      <option value="Futura Inline">Futura Display</option>
                      <option value="Garamond">Garamond</option>
                      <option value="Geneva">Geneva</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Gill Sans">Gill Sans</option>
                      <option value="Goudy Stout">Goudy Stout</option>
                      <option value="Great Vibes">Great Vibes</option>
                      <option value="Handlee">Handlee</option>
                      <option value="Haettenschweiler">Haettenschweiler</option>
                      <option value="Heebo">Heebo</option>
                      <option value="Helvetica Neue">Helvetica Neue</option>
                      <option value="Hoefler Text">Hoefler Text</option>
                      <option value="IBM Plex Mono">IBM Plex Mono</option>
                      <option value="Impact">Impact</option>
                      <option value="Inconsolata">Inconsolata</option>
                      <option value="Indie Flower">Indie Flower</option>
                      <option value="Inter">Inter</option>
                      <option value="JetBrains Mono">JetBrains Mono</option>
                      <option value="JokerMan">JokerMan</option>
                      <option value="Josefin Sans">Josefin Sans</option>
                      <option value="Josefin Slab">Josefin Slab</option>
                      <option value="Kanit">Kanit</option>
                      <option value="Karla">Karla</option>
                      <option value="Kaushan Script">Kaushan Script</option>
                      <option value="Lato">Lato</option>
                      <option value="Libre Baskerville">Libre Baskerville</option>
                      <option value="Lobster">Lobster</option>
                      <option value="Lobster Two">Lobster Two</option>
                      <option value="Lora">Lora</option>
                      <option value="Lucida Bright">Lucida Bright</option>
                      <option value="Lucida Console">Lucida Console</option>
                      <option value="Lucida Handwriting">Lucida Handwriting</option>
                      <option value="Lucida Sans Unicode">Lucida Sans</option>
                      <option value="Luckiest Guy">Luckiest Guy</option>
                      <option value="Material Icons">Material Icons</option>
                      <option value="Menlo">Menlo</option>
                      <option value="Merriweather">Merriweather</option>
                      <option value="Mistral">Mistral</option>
                      <option value="Monaco">Monaco</option>
                      <option value="Monoton">Monoton</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Mr Dafoe">Mr Dafoe</option>
                      <option value="MS Gothic">MS Gothic</option>
                      <option value="Mukta">Mukta</option>
                      <option value="Myriad Pro">Myriad Pro</option>
                      <option value="Nanum Gothic">Nanum Gothic</option>
                      <option value="Nanum Gothic Coding">Nanum Gothic Coding</option>
                      <option value="Neuton">Neuton</option>
                      <option value="Noto Sans">Noto Sans</option>
                      <option value="Noto Serif">Noto Serif</option>
                      <option value="Nova Mono">Nova Mono</option>
                      <option value="Nunito">Nunito</option>
                      <option value="Old English Text MT">Old English</option>
                      <option value="Old Standard TT">Old Standard TT</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Optima">Optima</option>
                      <option value="Oswald">Oswald</option>
                      <option value="Overpass Mono">Overpass Mono</option>
                      <option value="Oxygen Mono">Oxygen Mono</option>
                      <option value="Pacifico">Pacifico</option>
                      <option value="Palatino">Palatino</option>
                      <option value="Papyrus">Papyrus</option>
                      <option value="Parisienne">Parisienne</option>
                      <option value="Passion One">Passion One</option>
                      <option value="PT Mono">PT Mono</option>
                      <option value="PT Sans">PT Sans</option>
                      <option value="PT Serif">PT Serif</option>
                      <option value="Patua One">Patua One</option>
                      <option value="Perpetua">Perpetua</option>
                      <option value="Petit Formal Script">Petit Formal Script</option>
                      <option value="Pinyon Script">Pinyon Script</option>
                      <option value="Playbill">Playbill</option>
                      <option value="Playfair Display">Playfair Display</option>
                      <option value="Poiret One">Poiret One</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Quicksand">Quicksand</option>
                      <option value="Raleway">Raleway</option>
                      <option value="Ravie">Ravie</option>
                      <option value="Righteous">Righteous</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Roboto Mono">Roboto Mono</option>
                      <option value="Rochester">Rochester</option>
                      <option value="Rockwell">Rockwell</option>
                      <option value="Sacramento">Sacramento</option>
                      <option value="Satisfy">Satisfy</option>
                      <option value="Segoe UI">Segoe UI</option>
                      <option value="Shadows Into Light">Shadows Into Light</option>
                      <option value="Share Tech Mono">Share Tech Mono</option>
                      <option value="Showcard Gothic">Showcard Gothic</option>
                      <option value="Snap ITC">Snap ITC</option>
                      <option value="Snell Roundhand">Snell Roundhand</option>
                      <option value="Source Code Pro">Source Code Pro</option>
                      <option value="Source Sans Pro">Source Sans Pro</option>
                      <option value="Space Mono">Space Mono</option>
                      <option value="Special Elite">Special Elite</option>
                      <option value="Stencil">Stencil</option>
                      <option value="Symbol">Símbolos Matemáticos</option>
                      <option value="Tahoma">Tahoma</option>
                      <option value="Tangerine">Tangerine</option>
                      <option value="TimesRoman">Times New Roman</option>
                      <option value="Titillium Web">Titillium Web</option>
                      <option value="Trebuchet MS">Trebuchet MS</option>
                      <option value="Ubuntu">Ubuntu</option>
                      <option value="Ubuntu Mono">Ubuntu Mono</option>
                      <option value="Univers">Univers</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Vivaldi">Vivaldi</option>
                      <option value="Vollkorn">Vollkorn</option>
                      <option value="VT323">VT323 (Retro)</option>
                      <option value="Webdings">Webdings (Ícones)</option>
                      <option value="Wide Latin">Wide Latin</option>
                      <option value="Wingdings">Wingdings 1</option>
                      <option value="Wingdings 2">Wingdings 2</option>
                      <option value="Wingdings 3">Wingdings 3</option>
                      <option value="Work Sans">Work Sans</option>
                      <option value="Yellowtail">Yellowtail</option>
                      <option value="ZapfDingbats">Universal Dingbats</option>
                      <option value="Zapfino">Zapfino</option>
                      <option value="Zilla Slab">Zilla Slab</option>
                    </select>
                    <div className="h-4 w-px bg-gray-300 mx-1"></div>
                    <div className="flex items-center gap-1 border border-gray-200 rounded px-1" title="Cor de fundo do texto">
                      <Highlighter size={14} className="text-gray-500"/>
                      <input 
                        type="color" 
                        value={(elements.find(el => el.id === selectedId) as TextElement).backgroundColor || '#ffffff'} 
                        onChange={(e) => toggleTextFormat('backgroundColor', e.target.value)}
                        className="w-5 h-5 cursor-pointer border-0 p-0"
                      />
                      <button 
                        onClick={() => toggleTextFormat('backgroundColor', 'transparent')} 
                        className="p-0.5 rounded text-red-500 hover:bg-red-50"
                        title="Transparente"
                      ><X size={14}/></button>
                    </div>
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
                    <div className="h-4 w-px bg-gray-300 mx-1"></div>
                    <div className="flex items-center gap-1" title="Rotação (Graus)">
                      <RotateCw size={14} className="text-gray-500"/>
                      <input
                        type="number"
                        value={Math.round((elements.find(el => el.id === selectedId) as TextElement).rotation || 0)}
                        onChange={(e) => {
                          setElements(elements.map(el => 
                            el.id === selectedId ? { ...el, rotation: Number(e.target.value) } : el
                          ));
                        }}
                        onBlur={() => pushToHistory(elements, hiddenPdfTextIds)}
                        className="bg-gray-50 text-gray-800 px-1 py-1 rounded text-sm w-16 border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        min="-360"
                        max="360"
                      />
                      <span className="text-gray-500 text-xs font-medium">°</span>
                    </div>
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
                        {tool === 'magic-edit' && pdfTexts.filter(pt => !hiddenPdfTextIds.includes(pt.id)).map((pt) => {
                          const px = 0;
                          const py = 0;
                          const aRad = (pt.rotation || 0) * (Math.PI / 180);
                          const cA = Math.cos(aRad);
                          const sA = Math.sin(aRad);
                          const dx = (-px) * cA - (-py) * sA;
                          const dy = (-px) * sA + (-py) * cA;
                          
                          return (
                            <Rect
                              key={pt.id}
                              x={pt.x + dx}
                              y={pt.y + dy}
                              width={pt.width + (px * 2)}
                              height={pt.height + (py * 2)}
                              rotation={pt.rotation || 0}
                              fill={hoveredMagicId === pt.id ? "rgba(16, 185, 129, 0.2)" : "rgba(59, 130, 246, 0.1)"}
                              stroke={hoveredMagicId === pt.id ? "#10b981" : "#3b82f6"}
                              strokeWidth={hoveredMagicId === pt.id ? 2 : 1}
                              dash={hoveredMagicId === pt.id ? [] : [4, 4]}
                              cornerRadius={0}
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
                          );
                        })}
                        {currentPageElements.map((el) => {
                          if (el.type === 'text') {
                            return (
                              <RotatableText
                                key={el.id}
                                element={el}
                                tool={tool}
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
                            const isSelected = selectedId === el.id;
                            return (
                              <React.Fragment key={el.id}>
                                <Rect
                                  x={el.x}
                                  y={el.y}
                                  width={el.width}
                                  height={el.height}
                                  rotation={el.rotation || 0}
                                  fill={el.color}
                                  draggable={el.isWhiteout ? false : tool === 'select'}
                                  listening={!el.isWhiteout}
                                  onClick={el.isWhiteout ? undefined : () => tool === 'select' && setSelectedId(el.id)}
                                  onTap={el.isWhiteout ? undefined : () => tool === 'select' && setSelectedId(el.id)}
                                  ref={isSelected ? (node) => {
                                    if (node && trRef.current) {
                                      trRef.current.nodes([node]);
                                      trRef.current.getLayer().batchDraw();
                                    }
                                  } : null}
                                  onDragEnd={(e) => {
                                    if (el.isWhiteout) return;
                                    const newElements = elements.map(item => 
                                      item.id === el.id ? { ...item, x: e.target.x(), y: e.target.y() } : item
                                    );
                                    setElements(newElements);
                                    pushToHistory(newElements, hiddenPdfTextIds);
                                  }}
                                  onTransformEnd={(e) => {
                                    const node = e.target;
                                    const scaleX = node.scaleX();
                                    const scaleY = node.scaleY();
                                    node.scaleX(1);
                                    node.scaleY(1);
                                    const newElements = elements.map(item => 
                                      item.id === el.id ? { 
                                        ...item, 
                                        x: node.x(), 
                                        y: node.y(), 
                                        width: Math.max(1, node.width() * scaleX),
                                        height: Math.max(1, node.height() * scaleY),
                                        rotation: node.rotation()
                                      } : item
                                    );
                                    setElements(newElements);
                                    pushToHistory(newElements, hiddenPdfTextIds);
                                  }}
                                  globalCompositeOperation={el.isHighlight ? 'multiply' : 'source-over'}
                                />
                                {isSelected && tool === 'select' && !el.isWhiteout && (
                                  <Transformer
                                    ref={trRef}
                                    rotateEnabled={true}
                                    enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'left-middle', 'right-middle']}
                                    boundBoxFunc={(oldBox, newBox) => {
                                      if (Math.abs(newBox.width) < 1 || Math.abs(newBox.height) < 1) {
                                        return oldBox;
                                      }
                                      return newBox;
                                    }}
                                  />
                                )}
                              </React.Fragment>
                            );
                          } else if (el.type === 'ellipse') {
                            const isSelected = selectedId === el.id;
                            return (
                              <React.Fragment key={el.id}>
                                <Ellipse
                                  x={el.x + el.radiusX}
                                  y={el.y + el.radiusY}
                                  radiusX={el.radiusX}
                                  radiusY={el.radiusY}
                                  rotation={el.rotation || 0}
                                  fill={el.color}
                                  draggable={tool === 'select'}
                                  onClick={() => tool === 'select' && setSelectedId(el.id)}
                                  onTap={() => tool === 'select' && setSelectedId(el.id)}
                                  ref={isSelected ? (node) => {
                                    if (node && trRef.current) {
                                      trRef.current.nodes([node]);
                                      trRef.current.getLayer().batchDraw();
                                    }
                                  } : null}
                                  onDragEnd={(e) => {
                                    const newElements = elements.map(item => 
                                      item.id === el.id ? { ...item, x: e.target.x() - el.radiusX, y: e.target.y() - el.radiusY } : item
                                    );
                                    setElements(newElements);
                                    pushToHistory(newElements, hiddenPdfTextIds);
                                  }}
                                  onTransformEnd={(e) => {
                                    const node = e.target as any;
                                    const scaleX = node.scaleX();
                                    const scaleY = node.scaleY();
                                    node.scaleX(1);
                                    node.scaleY(1);
                                    const newElements = elements.map(item => 
                                      item.id === el.id ? { 
                                        ...item, 
                                        x: node.x() - node.radiusX() * scaleX, 
                                        y: node.y() - node.radiusY() * scaleY, 
                                        radiusX: Math.max(1, node.radiusX() * scaleX),
                                        radiusY: Math.max(1, node.radiusY() * scaleY),
                                        rotation: node.rotation()
                                      } : item
                                    );
                                    setElements(newElements);
                                    pushToHistory(newElements, hiddenPdfTextIds);
                                  }}
                                />
                                {isSelected && tool === 'select' && (
                                  <Transformer
                                    ref={trRef}
                                    rotateEnabled={true}
                                    enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                                    boundBoxFunc={(oldBox, newBox) => {
                                      if (Math.abs(newBox.width) < 1 || Math.abs(newBox.height) < 1) {
                                        return oldBox;
                                      }
                                      return newBox;
                                    }}
                                  />
                                )}
                              </React.Fragment>
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
                  title="Página Anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 text-sm font-medium">
                  Página 
                  <input 
                    type="number" 
                    value={currentPage}
                    onChange={(e) => {
                      let p = parseInt(e.target.value);
                      if (!isNaN(p)) {
                        if (p < 1) p = 1;
                        if (p > numPages) p = numPages;
                        setCurrentPage(p);
                      }
                    }}
                    className="w-14 text-center bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-white focus:outline-none focus:border-emerald-500 hide-arrows"
                    min={1}
                    max={numPages}
                  /> 
                  de {numPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                  disabled={currentPage === numPages}
                  className="p-1 hover:bg-gray-700 rounded-full disabled:opacity-50"
                  title="Próxima Página"
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
