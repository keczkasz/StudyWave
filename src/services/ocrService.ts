// Dynamic imports to reduce initial bundle size
// tesseract.js (~3MB) and pdfjs-dist (~2MB) are only loaded when OCR is needed

export interface OCRProgress {
  page: number;
  totalPages: number;
  status: string;
}

// Lazy load pdfjs-dist
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

const getPdfLib = async () => {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }
  return pdfjsLib;
};

// Lazy load tesseract.js
let tesseractModule: typeof import('tesseract.js') | null = null;

const getTesseract = async () => {
  if (!tesseractModule) {
    tesseractModule = await import('tesseract.js');
  }
  return tesseractModule;
};

/**
 * Convert a PDF page to an image for OCR processing
 */
const convertPDFPageToImage = async (page: any): Promise<string> => {
  const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR accuracy
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Could not get canvas context');
  }

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext: any = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  return canvas.toDataURL('image/png');
};

/**
 * Perform OCR on a single image
 */
const performOCR = async (imageData: string, language: string = 'eng'): Promise<string> => {
  const tesseract = await getTesseract();
  const worker = await tesseract.createWorker(language);
  
  try {
    const { data: { text } } = await worker.recognize(imageData);
    return text;
  } finally {
    await worker.terminate();
  }
};

/**
 * Process a PDF file with OCR
 * @param file - PDF file to process
 * @param onProgress - Callback for progress updates
 * @returns Extracted text from all pages
 */
export const processPDFWithOCR = async (
  file: File,
  onProgress?: (progress: OCRProgress) => void
): Promise<string> => {
  onProgress?.({
    page: 0,
    totalPages: 0,
    status: 'Loading OCR engine...',
  });
  
  const pdfjs = await getPdfLib();
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  const totalPages = pdf.numPages;

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.({
      page: i,
      totalPages,
      status: `Scanning page ${i} of ${totalPages}...`,
    });

    const page = await pdf.getPage(i);
    const imageData = await convertPDFPageToImage(page);
    const pageText = await performOCR(imageData);
    
    fullText += pageText + '\n\n';
  }

  return fullText.trim();
};

/**
 * Check if a PDF needs OCR (has little to no extractable text)
 */
export const needsOCR = (extractedText: string): boolean => {
  const trimmedText = extractedText.trim();
  const wordCount = trimmedText.split(/\s+/).length;
  
  // If less than 50 words, likely a scanned PDF
  return wordCount < 50;
};
