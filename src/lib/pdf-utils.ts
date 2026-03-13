import { PDFDocument, rgb, degrees } from 'pdf-lib';

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  return await mergedPdf.save();
}

export async function splitPdf(file: File, options: any): Promise<Uint8Array[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const totalPages = pdf.getPageCount();
  
  const splitPdfs: Uint8Array[] = [];

  if (options.mode === 'split') {
    if (options.splitMode === 'custom') {
      if (options.mergeCustomRanges) {
        const newPdf = await PDFDocument.create();
        for (const range of options.customRanges) {
          const from = Math.max(1, Math.min(range.from, totalPages));
          const to = Math.max(1, Math.min(range.to, totalPages));
          const start = Math.min(from, to);
          const end = Math.max(from, to);
          
          const indices = [];
          for (let i = start; i <= end; i++) {
            indices.push(i - 1);
          }
          const copiedPages = await newPdf.copyPages(pdf, indices);
          copiedPages.forEach((page) => newPdf.addPage(page));
        }
        splitPdfs.push(await newPdf.save());
      } else {
        for (const range of options.customRanges) {
          const newPdf = await PDFDocument.create();
          const from = Math.max(1, Math.min(range.from, totalPages));
          const to = Math.max(1, Math.min(range.to, totalPages));
          const start = Math.min(from, to);
          const end = Math.max(from, to);
          
          const indices = [];
          for (let i = start; i <= end; i++) {
            indices.push(i - 1);
          }
          const copiedPages = await newPdf.copyPages(pdf, indices);
          copiedPages.forEach((page) => newPdf.addPage(page));
          splitPdfs.push(await newPdf.save());
        }
      }
    } else if (options.splitMode === 'fixed') {
      const chunkSize = Math.max(1, options.fixedRange);
      for (let i = 0; i < totalPages; i += chunkSize) {
        const newPdf = await PDFDocument.create();
        const indices = [];
        for (let j = i; j < i + chunkSize && j < totalPages; j++) {
          indices.push(j);
        }
        const copiedPages = await newPdf.copyPages(pdf, indices);
        copiedPages.forEach((page) => newPdf.addPage(page));
        splitPdfs.push(await newPdf.save());
      }
    }
  } else if (options.mode === 'extract') {
    if (options.extractMode === 'all') {
      for (let i = 0; i < totalPages; i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(copiedPage);
        splitPdfs.push(await newPdf.save());
      }
    } else if (options.extractMode === 'select') {
      const pagesToExtract = new Set<number>();
      const parts = options.extractPages.split(',');
      
      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(Number);
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) {
              if (i >= 1 && i <= totalPages) {
                pagesToExtract.add(i - 1);
              }
            }
          }
        } else {
          const page = Number(part);
          if (!isNaN(page) && page >= 1 && page <= totalPages) {
            pagesToExtract.add(page - 1);
          }
        }
      }

      const sortedIndices = Array.from(pagesToExtract).sort((a, b) => a - b);

      if (options.mergeExtractPages) {
        if (sortedIndices.length > 0) {
          const newPdf = await PDFDocument.create();
          const copiedPages = await newPdf.copyPages(pdf, sortedIndices);
          copiedPages.forEach((page) => newPdf.addPage(page));
          splitPdfs.push(await newPdf.save());
        }
      } else {
        for (const index of sortedIndices) {
          const newPdf = await PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(pdf, [index]);
          newPdf.addPage(copiedPage);
          splitPdfs.push(await newPdf.save());
        }
      }
    }
  }

  return splitPdfs;
}

export async function rotatePdf(file: File, rotationDegrees: number): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  const pages = pdf.getPages();
  pages.forEach(page => {
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + rotationDegrees));
  });
  
  return await pdf.save();
}

export async function addWatermark(file: File, text: string): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  const pages = pdf.getPages();
  pages.forEach(page => {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 4,
      y: height / 2,
      size: 50,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.5,
      rotate: degrees(45),
    });
  });
  
  return await pdf.save();
}

export async function addPageNumbers(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  const pages = pdf.getPages();
  pages.forEach((page, index) => {
    const { width } = page.getSize();
    page.drawText(`${index + 1}`, {
      x: width / 2,
      y: 20,
      size: 12,
      color: rgb(0, 0, 0),
    });
  });
  
  return await pdf.save();
}
