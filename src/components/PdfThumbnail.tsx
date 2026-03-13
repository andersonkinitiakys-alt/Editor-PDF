import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2, File as FileIcon } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfThumbnailProps {
  file: File;
  onLoadSuccess?: (numPages: number) => void;
}

export const PdfThumbnail = React.memo(function PdfThumbnail({ file, onLoadSuccess }: PdfThumbnailProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!fileUrl) return <div className="h-24 w-24 bg-gray-100 animate-pulse rounded-lg" />;

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-gray-50 rounded-lg border border-gray-200">
      <Document
        file={fileUrl}
        loading={<Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />}
        error={<FileIcon className="h-12 w-12 text-emerald-500" />}
        onLoadSuccess={({ numPages }) => {
          if (onLoadSuccess) onLoadSuccess(numPages);
        }}
      >
        <Page
          pageNumber={1}
          width={120}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="shadow-sm"
        />
      </Document>
    </div>
  );
});
