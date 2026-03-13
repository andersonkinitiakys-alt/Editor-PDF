import { ToolPage } from "./ToolPage";
import { pdfjs } from "react-pdf";

export function PdfToJpgPage() {
  const handleProcess = async (files: File[]): Promise<Uint8Array> => {
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    
    // We'll use JSZip to bundle the images
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
      
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      
      if (!context) continue;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
      } as any).promise;
      
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
      
      zip.file(`pagina_${i}.jpg`, base64Data, { base64: true });
    }

    const zipContent = await zip.generateAsync({ type: "uint8array" });
    return zipContent;
  };

  return (
    <ToolPage
      title="PDF para JPG"
      description="Extraia todas as imagens contidas em um PDF ou converta cada página em um arquivo JPG."
      accept={{ "application/pdf": [".pdf"] }}
      multiple={false}
      onProcess={handleProcess}
      resultFilename="imagens_convertidas.zip"
      resultMimeType="application/zip"
      actionText="Converter para JPG"
    />
  );
}
