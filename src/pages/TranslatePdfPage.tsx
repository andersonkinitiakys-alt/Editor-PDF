import React, { useState } from 'react';
import { Languages, UploadCloud, FileText, Loader2, Download } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { pdfjs, Document, Page } from 'react-pdf';
import { GoogleGenAI } from '@google/genai';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function TranslatePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('Inglês');

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setExtractedText('');
      setTranslatedText('');
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
    setExtractedText('');
    setTranslatedText('');

    try {
      // 1. Extract Text
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
      }

      setExtractedText(fullText);

      // 2. Translate using Gemini
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setTranslatedText("Erro: Chave de API do Gemini não configurada.");
        setIsProcessing(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Traduza o seguinte texto para ${targetLanguage}. Mantenha a formatação o mais próximo possível do original:\n\n${fullText.substring(0, 30000)}`, // Limit to avoid huge prompts
      });

      setTranslatedText(response.text || "Não foi possível traduzir o texto.");
    } catch (error) {
      console.error('Erro na tradução:', error);
      alert('Ocorreu um erro ao processar ou traduzir o documento.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadText = () => {
    const blob = new Blob([translatedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `traducao-${targetLanguage.toLowerCase()}.txt`;
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
            <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg">
              <Languages className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Traduzir PDF</h1>
              <p className="text-sm text-gray-500">Traduza o texto do seu PDF para outro idioma instantaneamente</p>
            </div>
          </div>
          
          {file && (
            <div className="flex items-center gap-4">
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-2.5 shadow-sm"
                disabled={isProcessing}
              >
                <option value="Inglês">Inglês</option>
                <option value="Espanhol">Espanhol</option>
                <option value="Francês">Francês</option>
                <option value="Alemão">Alemão</option>
                <option value="Italiano">Italiano</option>
                <option value="Japonês">Japonês</option>
                <option value="Português">Português</option>
              </select>
              
              <button
                onClick={handleProcess}
                disabled={isProcessing || numPages === 0}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg text-sm font-bold text-white transition-colors flex items-center gap-2 shadow-sm"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                {isProcessing ? "Traduzindo..." : "Traduzir"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 h-full min-h-[500px]">
          {/* Upload/Original Section */}
          <div className="flex-1 flex flex-col bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            {!file ? (
              <div
                {...getRootProps()}
                className={`w-full h-full min-h-[300px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-colors cursor-pointer
                  ${isDragActive ? "border-cyan-500 bg-cyan-50" : "border-gray-300 hover:border-cyan-400 hover:bg-gray-50"}`}
              >
                <input {...getInputProps()} />
                <UploadCloud className={`w-12 h-12 mb-4 ${isDragActive ? "text-cyan-500" : "text-gray-400"}`} />
                <p className="text-lg text-center text-gray-600 font-medium">
                  {isDragActive ? "Solte o PDF aqui..." : "Selecione o arquivo PDF"}
                </p>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  ou arraste e solte aqui
                </p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col">
                <div className="w-full flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                    <span className="font-medium text-gray-700 truncate">{file.name}</span>
                  </div>
                  <button
                    onClick={() => { setFile(null); setExtractedText(''); setTranslatedText(''); }}
                    className="text-sm text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    disabled={isProcessing}
                  >
                    Remover
                  </button>
                </div>
                
                <h2 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Texto Original</h2>
                <textarea
                  value={extractedText}
                  readOnly
                  className="flex-1 w-full p-4 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm text-gray-800"
                  placeholder={isProcessing ? "Extraindo texto..." : "O texto original aparecerá aqui..."}
                />
              </div>
            )}
          </div>

          {/* Translated Section */}
          <div className="flex-1 flex flex-col bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                Tradução ({targetLanguage})
              </h2>
              {translatedText && (
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
              value={translatedText}
              readOnly
              className="flex-1 w-full p-4 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm text-gray-800"
              placeholder={isProcessing ? "Traduzindo com IA... aguarde." : "A tradução aparecerá aqui..."}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
