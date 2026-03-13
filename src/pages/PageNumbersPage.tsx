import { ToolPage } from "./ToolPage";
import { addPageNumbers } from "../lib/pdf-utils";

export function PageNumbersPage() {
  return (
    <ToolPage
      title="Adicionar números de página"
      description="Adicione números de página em PDFs com facilidade. Escolha a posição, dimensões e tipografia."
      actionText="Adicionar números"
      onProcess={(files) => addPageNumbers(files[0])}
      multiple={false}
    />
  );
}
