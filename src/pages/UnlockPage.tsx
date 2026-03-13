import { PDFDocument } from "pdf-lib";
import { ToolPage } from "./ToolPage";
import { Lock } from "lucide-react";

function UnlockOptions({ options, setOptions }: { options: any; setOptions: (opts: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
          <Lock className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-gray-900">Insira a senha do PDF</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Para remover a proteção, você precisa saber a senha atual do arquivo.
      </p>
      <input
        type="password"
        value={options.password || ""}
        onChange={(e) => setOptions({ ...options, password: e.target.value })}
        placeholder="Senha do documento"
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />
    </div>
  );
}

export function UnlockPage() {
  const handleProcess = async (files: File[], options: any): Promise<Uint8Array> => {
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    
    try {
      // Try to load the PDF with the provided password
      const pdfDoc = await PDFDocument.load(arrayBuffer, { password: options.password } as any);
      
      // Save it without a password
      return await pdfDoc.save();
    } catch (err: any) {
      if (err.message && err.message.includes("password")) {
        throw new Error("Senha incorreta ou o arquivo não está protegido.");
      } else {
        throw new Error("Ocorreu um erro ao desbloquear o PDF. Verifique se a senha está correta.");
      }
    }
  };

  return (
    <ToolPage
      title="Desbloquear PDF"
      description="Remova a senha de segurança de PDFs para poder usá-los como quiser."
      accept={{ "application/pdf": [".pdf"] }}
      multiple={false}
      onProcess={handleProcess}
      optionsComponent={UnlockOptions}
      defaultOptions={{ password: "" }}
      resultFilename="desbloqueado.pdf"
      actionText="Desbloquear PDF"
    />
  );
}
