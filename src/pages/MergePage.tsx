import { ToolPage } from "./ToolPage";
import { mergePdfs } from "../lib/pdf-utils";

export function MergePage() {
  return (
    <ToolPage
      title="Juntar arquivos PDF"
      description="Junte PDFs e coloque-os na ordem que preferir. Rápido e fácil."
      actionText="Juntar PDF"
      onProcess={mergePdfs}
      multiple={true}
      resultFilename="pdf_juntado.pdf"
    />
  );
}
