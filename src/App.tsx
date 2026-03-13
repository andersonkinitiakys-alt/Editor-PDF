/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { MergePage } from "./pages/MergePage";
import { SplitPage } from "./pages/SplitPage";
import { RotatePage } from "./pages/RotatePage";
import { WatermarkPage } from "./pages/WatermarkPage";
import { PageNumbersPage } from "./pages/PageNumbersPage";
import { ConversionPage } from "./pages/ConversionPage";
import { JpgToPdfPage } from "./pages/JpgToPdfPage";
import { PdfToJpgPage } from "./pages/PdfToJpgPage";
import { UnlockPage } from "./pages/UnlockPage";
import { CompressPage } from "./pages/CompressPage";
import { OrganizePage } from "./pages/OrganizePage";
import { EditPdfPage } from "./pages/EditPdfPage";
import { HtmlToPdfPage } from "./pages/HtmlToPdfPage";
import { ScanToPdfPage } from "./pages/ScanToPdfPage";
import { OcrPdfPage } from "./pages/OcrPdfPage";
import { TranslatePdfPage } from "./pages/TranslatePdfPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="merge" element={<MergePage />} />
          <Route path="split" element={<SplitPage />} />
          <Route path="rotate" element={<RotatePage />} />
          <Route path="watermark" element={<WatermarkPage />} />
          <Route path="page-numbers" element={<PageNumbersPage />} />
          <Route path="compress" element={<CompressPage />} />
          <Route path="edit" element={<EditPdfPage />} />
          <Route path="sign-pdf" element={<EditPdfPage initialTool="draw" />} />
          <Route path="redact-pdf" element={<EditPdfPage initialTool="rect" />} />
          <Route path="html-to-pdf" element={<HtmlToPdfPage />} />
          <Route path="scan-to-pdf" element={<ScanToPdfPage />} />
          <Route path="ocr-pdf" element={<OcrPdfPage />} />
          <Route path="translate-pdf" element={<TranslatePdfPage />} />
          <Route path="organize" element={<OrganizePage />} />
          <Route path="unlock" element={<UnlockPage />} />
          <Route path="jpg-to-pdf" element={<JpgToPdfPage />} />
          <Route path="pdf-to-jpg" element={<PdfToJpgPage />} />
          
          <Route path="pdf-to-pdfa" element={<ConversionPage title="PDF para PDF/A" description="Converta PDF para PDF/A, a versão padronizada ISO do PDF para arquivamento a longo prazo." accept={{ "application/pdf": [".pdf"] }} actionText="Converter para PDF/A" outputExtension=".pdf" />} />
          <Route path="compare-pdf" element={<ConversionPage title="Comparar PDF" description="Selecione dois arquivos PDF para comparar e destacar as diferenças." accept={{ "application/pdf": [".pdf"] }} actionText="Comparar PDFs" outputExtension=".pdf" />} />
          <Route path="crop-pdf" element={<ConversionPage title="Recortar PDF" description="Recorte as margens das páginas do PDF para unificar o tamanho." accept={{ "application/pdf": [".pdf"] }} actionText="Recortar PDF" outputExtension=".pdf" />} />
          
          {/* Simulated backend tools */}
          <Route path="pdf-to-word" element={<ConversionPage title="PDF para Word" description="Converta facilmente seus arquivos PDF em documentos DOCX fáceis de editar." accept={{ "application/pdf": [".pdf"] }} actionText="Converter para Word" outputExtension=".docx" />} />
          <Route path="pdf-to-powerpoint" element={<ConversionPage title="PDF para PowerPoint" description="Transforme seus PDFs em apresentações PPTX fáceis de editar." accept={{ "application/pdf": [".pdf"] }} actionText="Converter para PowerPoint" outputExtension=".pptx" />} />
          <Route path="pdf-to-excel" element={<ConversionPage title="PDF para Excel" description="Extraia dados diretamente de PDFs para planilhas Excel em poucos segundos." accept={{ "application/pdf": [".pdf"] }} actionText="Converter para Excel" outputExtension=".xlsx" />} />
          <Route path="word-to-pdf" element={<ConversionPage title="Word para PDF" description="Converta seus documentos WORD para PDF com a máxima qualidade." accept={{ "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"], "application/msword": [".doc"] }} actionText="Converter para PDF" outputExtension=".pdf" />} />
          <Route path="powerpoint-to-pdf" element={<ConversionPage title="PowerPoint para PDF" description="Converta suas apresentações PPTX para PDF com a máxima qualidade." accept={{ "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"], "application/vnd.ms-powerpoint": [".ppt"] }} actionText="Converter para PDF" outputExtension=".pdf" />} />
          <Route path="excel-to-pdf" element={<ConversionPage title="Excel para PDF" description="Converta suas planilhas XLSX para PDF com a máxima qualidade." accept={{ "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] }} actionText="Converter para PDF" outputExtension=".pdf" />} />
          <Route path="protect" element={<ConversionPage title="Proteger PDF" description="Proteja arquivos PDF com senha. Criptografe documentos PDF para impedir acesso não autorizado." accept={{ "application/pdf": [".pdf"] }} actionText="Proteger PDF" outputExtension=".pdf" />} />
          <Route path="repair" element={<ConversionPage title="Reparar PDF" description="Conserte um PDF danificado e recupere dados de arquivos corrompidos." accept={{ "application/pdf": [".pdf"] }} actionText="Reparar PDF" outputExtension=".pdf" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
