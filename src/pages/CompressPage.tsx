import { PDFDocument } from "pdf-lib";
import { ToolPage } from "./ToolPage";
import { Settings } from "lucide-react";

function CompressOptions({ options, setOptions }: { options: any; setOptions: (opts: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
          <Settings className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-gray-900">Nível de Compressão</h3>
      </div>
      
      <div className="space-y-3">
        <label className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${options.level === 'low' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}>
          <input type="radio" name="compression" className="mt-1 mr-3 text-emerald-600 focus:ring-emerald-500" checked={options.level === 'low'} onChange={() => setOptions({ ...options, level: 'low' })} />
          <div>
            <p className="font-medium text-gray-900">Menos compressão</p>
            <p className="text-sm text-gray-500">Alta qualidade, menor redução de tamanho.</p>
          </div>
        </label>
        
        <label className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${options.level === 'medium' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}>
          <input type="radio" name="compression" className="mt-1 mr-3 text-emerald-600 focus:ring-emerald-500" checked={options.level === 'medium'} onChange={() => setOptions({ ...options, level: 'medium' })} />
          <div>
            <p className="font-medium text-gray-900">Compressão recomendada</p>
            <p className="text-sm text-gray-500">Boa qualidade, boa redução de tamanho.</p>
          </div>
        </label>
        
        <label className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${options.level === 'high' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}>
          <input type="radio" name="compression" className="mt-1 mr-3 text-emerald-600 focus:ring-emerald-500" checked={options.level === 'high'} onChange={() => setOptions({ ...options, level: 'high' })} />
          <div>
            <p className="font-medium text-gray-900">Extrema compressão</p>
            <p className="text-sm text-gray-500">Menor qualidade, maior redução de tamanho.</p>
          </div>
        </label>
      </div>
      <p className="text-xs text-gray-400 mt-4">
        * Nota: A compressão no navegador é limitada e pode não reduzir significativamente o tamanho de PDFs com muitas imagens de alta resolução.
      </p>
    </div>
  );
}

export function CompressPage() {
  const handleProcess = async (files: File[], options: any): Promise<Uint8Array> => {
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    // Basic compression by re-saving (removes unused objects, compresses streams)
    // Note: pdf-lib doesn't have advanced image downsampling, so this is a basic compression.
    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
    
    return pdfBytes;
  };

  return (
    <ToolPage
      title="Comprimir PDF"
      description="Diminua o tamanho do seu arquivo PDF, mantendo a melhor qualidade possível."
      accept={{ "application/pdf": [".pdf"] }}
      multiple={false}
      onProcess={handleProcess}
      optionsComponent={CompressOptions}
      defaultOptions={{ level: "medium" }}
      resultFilename="comprimido.pdf"
      actionText="Comprimir PDF"
    />
  );
}
