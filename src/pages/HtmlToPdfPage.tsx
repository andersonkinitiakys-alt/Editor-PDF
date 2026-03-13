import React, { useState, useRef } from 'react';
import { Globe, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '../lib/utils';

export function HtmlToPdfPage() {
  const [htmlContent, setHtmlContent] = useState('<h1>Olá Mundo!</h1><p>Escreva seu HTML aqui e veja a mágica acontecer.</p>');
  const [isProcessing, setIsProcessing] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleConvert = async () => {
    if (!previewRef.current) return;
    setIsProcessing(true);

    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('html-convertido.pdf');
    } catch (error) {
      console.error('Erro ao converter HTML:', error);
      alert('Ocorreu um erro ao converter o HTML para PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-6 px-4 sm:px-6 lg:px-8 shadow-sm z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">HTML para PDF</h1>
              <p className="text-sm text-gray-500">Converta seu código HTML em um documento PDF</p>
            </div>
          </div>
          <button
            onClick={handleConvert}
            disabled={isProcessing || !htmlContent.trim()}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg text-sm font-bold text-white transition-colors flex items-center gap-2 shadow-sm"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isProcessing ? "Convertendo..." : "Baixar PDF"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl mx-auto w-full p-4 gap-4">
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 font-mono text-sm text-gray-600 font-bold">
            Código HTML
          </div>
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="flex-1 p-4 w-full resize-none focus:outline-none font-mono text-sm text-gray-800"
            placeholder="Cole seu código HTML aqui..."
          />
        </div>

        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 font-mono text-sm text-gray-600 font-bold">
            Pré-visualização
          </div>
          <div className="flex-1 overflow-auto p-4 bg-gray-50">
            <div 
              ref={previewRef}
              className="bg-white p-8 shadow-sm min-h-full prose max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
