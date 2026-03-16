
import { PDFDocument, PDFName, PDFDict, PDFStream, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';

async function testFontExtraction() {
    // 1. Criar um PDF com uma fonte embutida (se possível) ou apenas carregar um existente.
    // Para teste, vamos tentar carregar um PDF que sabemos que tem fontes.
    // Como não temos um, vamos criar um simples.
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.addPage();
    page.drawText('Hello World', { font, size: 50 });
    const pdfBytes = await pdfDoc.save();
    
    // Agora vamos tentar re-carregar e encontrar os objetos de fonte
    const doc = await PDFDocument.load(pdfBytes);
    const fontDicts = doc.context.enumerateIndirectObjects().filter(([ref, obj]) => {
        return obj instanceof PDFDict && obj.get(PDFName.of('Type')) === PDFName.of('Font');
    });

    console.log(`Encontradas ${fontDicts.length} fontes.`);

    for (const [ref, obj] of fontDicts) {
        const dict = obj as PDFDict;
        const baseFont = dict.get(PDFName.of('BaseFont'));
        console.log(`Fonte: ${baseFont?.toString()}`);

        const descriptor = dict.get(PDFName.of('FontDescriptor'));
        if (descriptor instanceof PDFDict) {
            console.log(`  Descriptor encontrado.`);
            const fontFile2 = descriptor.get(PDFName.of('FontFile2'));
            if (fontFile2) {
                console.log(`  FontFile2 (TrueType) encontrado!`);
            }
        }
    }
}

testFontExtraction().catch(console.error);
