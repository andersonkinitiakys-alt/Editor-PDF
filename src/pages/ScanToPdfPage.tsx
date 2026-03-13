import React, { useState, useRef, useCallback } from 'react';
import { Scan, Camera, Download, Loader2, Trash2, SwitchCamera } from 'lucide-react';
import Webcam from 'react-webcam';
import jsPDF from 'jspdf';

export function ScanToPdfPage() {
  const [images, setImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const webcamRef = useRef<Webcam>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImages((prev) => [...prev, imageSrc]);
    }
  }, [webcamRef]);

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleConvert = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    try {
      const pdf = new jsPDF();
      
      for (let i = 0; i < images.length; i++) {
        const img = new Image();
        img.src = images[i];
        
        await new Promise((resolve) => {
          img.onload = () => {
            if (i > 0) pdf.addPage();
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgRatio = img.width / img.height;
            const pdfRatio = pdfWidth / pdfHeight;
            
            let finalWidth = pdfWidth;
            let finalHeight = pdfHeight;
            
            if (imgRatio > pdfRatio) {
              finalHeight = pdfWidth / imgRatio;
            } else {
              finalWidth = pdfHeight * imgRatio;
            }
            
            const x = (pdfWidth - finalWidth) / 2;
            const y = (pdfHeight - finalHeight) / 2;
            
            pdf.addImage(images[i], 'JPEG', x, y, finalWidth, finalHeight);
            resolve(null);
          };
        });
      }
      
      pdf.save('documento-digitalizado.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-6 px-4 sm:px-6 lg:px-8 shadow-sm z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
              <Scan className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Digitalizar para PDF</h1>
              <p className="text-sm text-gray-500">Use sua câmera para criar um documento PDF</p>
            </div>
          </div>
          <button
            onClick={handleConvert}
            disabled={isProcessing || images.length === 0}
            className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg text-sm font-bold text-white transition-colors flex items-center gap-2 shadow-sm"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isProcessing ? "Gerando PDF..." : "Baixar PDF"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
          {/* Camera Section */}
          <div className="flex-1 flex flex-col items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-lg overflow-hidden mb-6 shadow-inner">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={toggleCamera}
                className="p-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors shadow-sm"
                title="Trocar Câmera"
              >
                <SwitchCamera className="w-6 h-6" />
              </button>
              <button
                onClick={capture}
                className="p-4 bg-teal-600 hover:bg-teal-700 text-white rounded-full transition-colors shadow-md"
                title="Capturar Foto"
              >
                <Camera className="w-8 h-8" />
              </button>
            </div>
          </div>

          {/* Gallery Section */}
          <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              Páginas ({images.length})
            </h2>
            
            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                <Scan className="w-12 h-12 mb-2 opacity-50" />
                <p>Nenhuma página capturada</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {images.map((img, index) => (
                  <div key={index} className="relative group aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden shadow-sm border border-gray-200">
                    <img src={img} alt={`Página ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded">
                      {index + 1}
                    </div>
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                      title="Remover página"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
