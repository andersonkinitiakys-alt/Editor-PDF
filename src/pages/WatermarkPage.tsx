import { ToolPage } from "./ToolPage";
import { addWatermark } from "../lib/pdf-utils";

function WatermarkOptionsComponent({ options, setOptions }: { options: any; setOptions: (opts: any) => void; files: File[] }) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="text" className="block text-sm font-medium text-gray-700">
          Texto da marca d'água
        </label>
        <div className="mt-1">
          <input
            type="text"
            name="text"
            id="text"
            className="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
            value={options.text}
            onChange={(e) => setOptions({ ...options, text: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export function WatermarkPage() {
  return (
    <ToolPage
      title="Adicionar marca d'água"
      description="Escolha uma imagem ou texto para inserir no seu PDF. Selecione a posição, transparência e tipografia."
      actionText="Adicionar marca d'água"
      onProcess={(files, options) => addWatermark(files[0], options.text)}
      multiple={false}
      defaultOptions={{ text: "CONFIDENCIAL" }}
      optionsComponent={WatermarkOptionsComponent}
    />
  );
}
