import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileUp, FileText, Settings, Download, Loader2, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";

interface ConversionPageProps {
  title: string;
  description: string;
  accept: Record<string, string[]>;
  actionText: string;
  outputExtension: string;
}

export function ConversionPage({ title, description, accept, actionText, outputExtension }: ConversionPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setIsDone(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
  } as any);

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    setIsProcessing(false);
    setIsDone(true);
  };

  const handleDownload = () => {
    if (!file) return;
    
    // Create a dummy file with the new extension
    const newFileName = file.name.replace(/\.[^/.]+$/, "") + outputExtension;
    const blob = new Blob(["Simulated converted content for " + file.name], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = newFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">{title}</h1>
        <p className="mt-5 text-xl text-gray-500">{description}</p>
      </div>

      {!file ? (
        <div
          {...getRootProps()}
          className={cn(
            "w-full max-w-3xl p-12 border-3 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-200",
            isDragActive ? "border-emerald-500 bg-emerald-50" : "border-gray-300 hover:border-emerald-400 hover:bg-gray-50"
          )}
        >
          <input {...getInputProps()} />
          <FileUp className="mx-auto h-16 w-16 text-emerald-500 mb-6" />
          <p className="text-2xl font-bold text-gray-900 mb-2">
            {isDragActive ? "Solte o arquivo aqui..." : "Selecione o arquivo"}
          </p>
          <p className="text-gray-500">ou arraste e solte aqui</p>
        </div>
      ) : (
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{file.name}</h3>
                <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            {!isProcessing && !isDone && (
              <button
                onClick={() => setFile(null)}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                Remover
              </button>
            )}
          </div>

          <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
            {isProcessing ? (
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto" />
                <p className="text-lg font-medium text-gray-900">Processando arquivo...</p>
                <p className="text-gray-500">Isso pode levar alguns instantes.</p>
              </div>
            ) : isDone ? (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <Download className="w-10 h-10 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Pronto!</h3>
                  <p className="text-gray-500">Seu arquivo foi processado com sucesso.</p>
                </div>
                <button
                  onClick={handleDownload}
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-sm transition-all"
                >
                  Baixar Arquivo
                </button>
                <div className="pt-4">
                  <button
                    onClick={() => {
                      setFile(null);
                      setIsDone(false);
                    }}
                    className="text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Processar outro arquivo
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="bg-blue-50 text-blue-700 p-4 rounded-lg flex items-start gap-3 text-left max-w-md mx-auto">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    Nota: Esta é uma simulação. A conversão real de formatos complexos (como DOCX, XLSX, PPTX) requer um servidor backend dedicado e não pode ser feita inteiramente no navegador.
                  </p>
                </div>
                <button
                  onClick={handleProcess}
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-sm transition-all flex items-center gap-2 mx-auto"
                >
                  <Settings className="w-5 h-5" />
                  {actionText}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
