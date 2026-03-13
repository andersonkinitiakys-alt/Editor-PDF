import React, { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { PdfThumbnail } from './PdfThumbnail';

export interface FileItemCardProps extends React.HTMLAttributes<HTMLDivElement> {
  file: File;
  index: number;
  totalFiles: number;
  onRemove: (index: number) => void;
  onMoveLeft: (index: number) => void;
  onMoveRight: (index: number) => void;
  isDragging?: boolean;
  isOverlay?: boolean;
  dragListeners?: Record<string, Function>;
  dragAttributes?: Record<string, any>;
}

export const FileItemCard = forwardRef<HTMLDivElement, FileItemCardProps>(({
  file,
  index,
  totalFiles,
  onRemove,
  onMoveLeft,
  onMoveRight,
  isDragging,
  isOverlay,
  dragListeners,
  dragAttributes,
  style,
  ...props
}, ref) => {
  const [pageCount, setPageCount] = React.useState<number | null>(null);

  return (
    <div
      ref={ref}
      style={style}
      {...props}
      className={`relative group bg-white rounded-xl shadow-sm border ${
        isOverlay ? 'border-emerald-500 shadow-2xl scale-105 rotate-2 cursor-grabbing' : 
        isDragging ? 'border-emerald-500 opacity-30 shadow-inner' : 'border-gray-200 hover:shadow-md'
      } p-3 flex flex-col items-center text-center transition-all aspect-[3/4] justify-between z-10`}
    >
      {!isOverlay && !isDragging && (
        <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveLeft(index);
            }}
            disabled={index === 0}
            className="p-1 bg-white rounded-md shadow-sm border border-gray-200 text-gray-500 hover:text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Mover para a esquerda"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveRight(index);
            }}
            disabled={index === totalFiles - 1}
            className="p-1 bg-white rounded-md shadow-sm border border-gray-200 text-gray-500 hover:text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Mover para a direita"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {!isOverlay && !isDragging && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
          className="absolute -top-3 -right-3 bg-white text-gray-400 hover:text-red-500 rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity border border-gray-100 z-20"
          title="Remover arquivo"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      <div 
        {...dragAttributes} 
        {...dragListeners}
        className={`absolute inset-0 z-10 ${isOverlay ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}`}
      />

      <div className="w-full h-32 mb-3 pointer-events-none relative z-0 flex items-center justify-center">
        <PdfThumbnail file={file} onLoadSuccess={setPageCount} />
      </div>

      <div className="w-full mt-auto pointer-events-none z-0">
        <span className="text-sm font-medium text-gray-900 line-clamp-2 w-full px-1" title={file.name}>
          {file.name}
        </span>
        <span className="text-xs text-gray-500 mt-1 block">
          {(file.size / 1024 / 1024).toFixed(2)} MB
          {pageCount !== null && ` • ${pageCount} ${pageCount === 1 ? 'página' : 'páginas'}`}
        </span>
      </div>
      
      {!isOverlay && !isDragging && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-gray-400 z-0">
          <GripVertical className="h-5 w-5" />
        </div>
      )}
    </div>
  );
});

FileItemCard.displayName = 'FileItemCard';

interface SortableFileItemProps {
  id: string;
  file: File;
  index: number;
  totalFiles: number;
  onRemove: (index: number) => void;
  onMoveLeft: (index: number) => void;
  onMoveRight: (index: number) => void;
}

export const SortableFileItem: React.FC<SortableFileItemProps> = ({ id, file, index, totalFiles, onRemove, onMoveLeft, onMoveRight }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <FileItemCard
      ref={setNodeRef}
      style={style}
      file={file}
      index={index}
      totalFiles={totalFiles}
      onRemove={onRemove}
      onMoveLeft={onMoveLeft}
      onMoveRight={onMoveRight}
      isDragging={isDragging}
      dragListeners={listeners as Record<string, Function>}
      dragAttributes={attributes}
    />
  );
}
