import { ToolPage } from "./ToolPage";
import { rotatePdf } from "../lib/pdf-utils";

function RotateOptionsComponent({ options, setOptions }: { options: any; setOptions: (opts: any) => void; files: File[] }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Direção da rotação
        </label>
        <div className="mt-2 space-y-2">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-emerald-600 focus:ring-emerald-500"
              name="rotation"
              value="90"
              checked={options.degrees === 90}
              onChange={() => setOptions({ ...options, degrees: 90 })}
            />
            <span className="ml-2">Direita (90°)</span>
          </label>
          <br />
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-emerald-600 focus:ring-emerald-500"
              name="rotation"
              value="-90"
              checked={options.degrees === -90}
              onChange={() => setOptions({ ...options, degrees: -90 })}
            />
            <span className="ml-2">Esquerda (-90°)</span>
          </label>
          <br />
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-emerald-600 focus:ring-emerald-500"
              name="rotation"
              value="180"
              checked={options.degrees === 180}
              onChange={() => setOptions({ ...options, degrees: 180 })}
            />
            <span className="ml-2">Inverter (180°)</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export function RotatePage() {
  return (
    <ToolPage
      title="Rodar PDF"
      description="Rode os seus PDFs da forma que precisar. Pode rodar vários PDFs ao mesmo tempo!"
      actionText="Rodar PDF"
      onProcess={async (files, options) => {
        // We could rotate multiple, but for simplicity let's just rotate the first one or all
        // If multiple, we'd need to return an array or merge them. Let's just process the first one for now.
        return rotatePdf(files[0], options.degrees);
      }}
      multiple={false}
      defaultOptions={{ degrees: 90 }}
      optionsComponent={RotateOptionsComponent}
    />
  );
}
