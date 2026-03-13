import React, { useState, useRef } from 'react';
import { ScanText, UploadCloud, FileText, Loader2, Download } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { pdfjs, Document, Page } from 'react-pdf';
import Tesseract from 'tesseract.js';
import jsPDF from 'jspdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function OcrPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [language, setLanguage] = useState('por');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setExtractedText('');
      setProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const handleProcess = async () => {
    if (!file || numPages === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setExtractedText('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High scale for better OCR
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // @ts-ignore
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        const imgData = canvas.toDataURL('image/png');

        const result = await Tesseract.recognize(imgData, language, {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(((i - 1) / numPages) * 100 + (m.progress * (100 / numPages)));
            }
          }
        });

        fullText += `--- Página ${i} ---\n\n${result.data.text}\n\n`;
      }

      setExtractedText(fullText);
      setProgress(100);
    } catch (error) {
      console.error('Erro no OCR:', error);
      alert('Ocorreu um erro ao processar o documento.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadText = () => {
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'texto-extraido.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-6 px-4 sm:px-6 lg:px-8 shadow-sm z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <ScanText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">OCR PDF</h1>
              <p className="text-sm text-gray-500">Transforme PDFs digitalizados em texto pesquisável</p>
            </div>
          </div>
          
          {file && (
            <div className="flex items-center gap-4">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 shadow-sm"
                disabled={isProcessing}
              >
                <option value="por">Português</option>
                <option value="eng">Inglês</option>
                <option value="spa">Espanhol</option>
                <option value="fra">Francês</option>
                <option value="deu">Alemão</option>
              </select>
              
              <button
                onClick={handleProcess}
                disabled={isProcessing || numPages === 0}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg text-sm font-bold text-white transition-colors flex items-center gap-2 shadow-sm"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />}
                {isProcessing ? "Processando..." : "Iniciar OCR"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
          {/* Upload/Preview Section */}
          <div className="flex-1 flex flex-col items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            {!file ? (
              <div
                {...getRootProps()}
                className={`w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-colors cursor-pointer
                  ${isDragActive ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"}`}
              >
                <input {...getInputProps()} />
                <UploadCloud className={`w-12 h-12 mb-4 ${isDragActive ? "text-indigo-500" : "text-gray-400"}`} />
                <p className="text-lg text-center text-gray-600 font-medium">
                  {isDragActive ? "Solte o PDF aqui..." : "Selecione o arquivo PDF"}
                </p>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  ou arraste e solte aqui
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    <span className="font-medium text-gray-700 truncate">{file.name}</span>
                  </div>
                  <button
                    onClick={() => { setFile(null); setExtractedText(''); }}
                    className="text-sm text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    disabled={isProcessing}
                  >
                    Remover
                  </button>
                </div>
                
                <div className="w-full max-w-sm border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-gray-100 flex justify-center p-4">
                  <Document file={file} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                    <Page pageNumber={1} width={250} renderTextLayer={false} renderAnnotationLayer={false} className="shadow-md" />
                  </Document>
                </div>
                <p className="text-sm text-gray-500 mt-4 font-medium">{numPages} página(s)</p>
                
                {isProcessing && (
                  <div className="w-full mt-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-1 font-medium">
                      <span>Processando OCR...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Result Section */}
          <div className="flex-1 flex flex-col bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Texto Extraído
              </h2>
              {extractedText && (
                <button
                  onClick={handleDownloadText}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Salvar .txt
                </button>
              )}
            </div>
            
            <textarea
              value={extractedText}
              readOnly
              className="flex-1 w-full p-4 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm text-gray-800"
              placeholder={isProcessing ? "Extraindo texto... aguarde." : "O texto extraído aparecerá aqui..."}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
