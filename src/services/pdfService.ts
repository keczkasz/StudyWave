// Dynamic import for pdfjs-dist to reduce initial bundle size
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

const getPdfLib = async () => {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // Set worker path using the package version
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }
  return pdfjsLib;
};

export const extractTextFromPDF = async (
  file: File,
  onProgress?: (message: string) => void
): Promise<string> => {
  try {
    onProgress?.('Loading PDF processor...');
    const pdfjs = await getPdfLib();
    
    onProgress?.('Analyzing PDF...');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const totalPages = pdf.numPages;
    
    for (let i = 1; i <= totalPages; i++) {
      onProgress?.(`Extracting text from page ${i} of ${totalPages}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

export const estimateReadingTime = (text: string, wordsPerMinute: number = 150): number => {
  const words = text.split(/\s+/).length;
  return Math.ceil((words / wordsPerMinute) * 60); // in seconds
};
