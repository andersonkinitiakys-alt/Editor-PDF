import { PDFDocument } from "pdf-lib";
import { ToolPage } from "./ToolPage";

export function JpgToPdfPage() {
  const handleProcess = async (files: File[]): Promise<Uint8Array> => {
    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
      const imageBytes = await file.arrayBuffer();
      let image;
      
      if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        image = await pdfDoc.embedJpg(imageBytes);
      } else if (file.type === 'image/png') {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        continue; // Skip unsupported
      }

      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    return await pdfDoc.save();
  };

  return (
    <ToolPage
      title="JPG para PDF"
      description="Converta imagens JPG para PDF em segundos. Ajuste a orientação e as margens facilmente."
      actionText="Converter para PDF"
      onProcess={handleProcess}
      multiple={true}
      resultFilename="imagens_convertidas.pdf"
      accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] }}
    />
  );
}
