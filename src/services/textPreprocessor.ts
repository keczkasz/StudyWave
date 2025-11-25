/**
 * StudyWave Text Preprocessor
 * Transforms raw PDF text into speech-optimized text with natural prosody markers
 * Supports English and Polish languages
 */

export interface ProcessedText {
  text: string;
  language: 'en' | 'pl';
  segments: TextSegment[];
  metadata: TextMetadata;
}

export interface TextSegment {
  text: string;
  type: 'sentence' | 'paragraph' | 'heading' | 'list' | 'quote';
  emphasis: 'normal' | 'strong' | 'soft';
  pauseAfter: number; // milliseconds
}

export interface TextMetadata {
  wordCount: number;
  sentenceCount: number;
  estimatedDuration: number; // seconds
  detectedLanguage: 'en' | 'pl';
  confidence: number;
}

// English abbreviations and their spoken forms
const ENGLISH_ABBREVIATIONS: Record<string, string> = {
  'Dr.': 'Doctor',
  'Mr.': 'Mister',
  'Mrs.': 'Misses',
  'Ms.': 'Miss',
  'Prof.': 'Professor',
  'Jr.': 'Junior',
  'Sr.': 'Senior',
  'vs.': 'versus',
  'etc.': 'et cetera',
  'i.e.': 'that is',
  'e.g.': 'for example',
  'Fig.': 'Figure',
  'Vol.': 'Volume',
  'No.': 'Number',
  'pp.': 'pages',
  'Inc.': 'Incorporated',
  'Ltd.': 'Limited',
  'Corp.': 'Corporation',
  'Ave.': 'Avenue',
  'St.': 'Street',
  'Blvd.': 'Boulevard',
  'approx.': 'approximately',
  'est.': 'established',
  'min.': 'minutes',
  'max.': 'maximum',
  'sec.': 'seconds',
  'hr.': 'hour',
  'hrs.': 'hours',
  'dept.': 'department',
  'govt.': 'government',
  'intl.': 'international',
  'natl.': 'national',
  'univ.': 'university',
};

// Polish abbreviations and their spoken forms
const POLISH_ABBREVIATIONS: Record<string, string> = {
  'dr': 'doktor',
  'dr.': 'doktor',
  'mgr': 'magister',
  'mgr.': 'magister',
  'inż.': 'inżynier',
  'prof.': 'profesor',
  'hab.': 'habilitowany',
  'płk': 'pułkownik',
  'gen.': 'generał',
  'mjr': 'major',
  'kpt.': 'kapitan',
  'św.': 'święty',
  'ul.': 'ulica',
  'al.': 'aleja',
  'pl.': 'plac',
  'os.': 'osiedle',
  'woj.': 'województwo',
  'pow.': 'powiat',
  'gm.': 'gmina',
  'nr': 'numer',
  'nr.': 'numer',
  'tel.': 'telefon',
  'godz.': 'godzina',
  'min.': 'minut',
  'sek.': 'sekund',
  'tj.': 'to jest',
  'tzn.': 'to znaczy',
  'np.': 'na przykład',
  'itd.': 'i tak dalej',
  'itp.': 'i tym podobne',
  'r.': 'roku',
  'w.': 'wiek',
  'ok.': 'około',
  'wg': 'według',
  'zob.': 'zobacz',
  'por.': 'porównaj',
  'przyp.': 'przypis',
  'red.': 'redakcja',
  'wyd.': 'wydawnictwo',
  'zł': 'złotych',
  'gr': 'groszy',
  'tys.': 'tysięcy',
  'mln': 'milionów',
  'mld': 'miliardów',
};

/**
 * Detect language with confidence score
 */
export function detectLanguage(text: string): { language: 'en' | 'pl'; confidence: number } {
  const sample = text.substring(0, 2000).toLowerCase();
  
  // Polish-specific characters (very strong indicator)
  const polishChars = /[ąćęłńóśźż]/gi;
  const polishCharCount = (sample.match(polishChars) || []).length;
  
  // Polish common words
  const polishWords = /\b(i|w|z|na|do|się|jest|to|co|jak|ale|nie|od|po|za|bez|pod|przez|dla|przy|nad|przed|między|oraz|lub|czy|że|który|która|które|ten|ta|te|ich|jego|jej|są|być|mieć|może|będzie|został|można|tylko|jeszcze|więc|także|kiedy|gdzie|tutaj|teraz|zawsze|nigdy|bardzo|dobrze)\b/gi;
  const polishWordMatches = (sample.match(polishWords) || []).length;
  
  // English common words
  const englishWords = /\b(the|a|an|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can|this|that|these|those|it|its|they|them|their|we|our|you|your|he|him|his|she|her|who|what|when|where|why|how|which|there|here|very|also|just|only|even|still|already|always|never|often|usually|sometimes|now|then|before|after|during|while|because|although|however|therefore|moreover|furthermore|nevertheless|meanwhile|finally|firstly|secondly)\b/gi;
  const englishWordMatches = (sample.match(englishWords) || []).length;
  
  const totalWords = sample.split(/\s+/).length;
  
  // Calculate scores
  let polishScore = 0;
  let englishScore = 0;
  
  // Polish characters are a very strong indicator
  if (polishCharCount > 0) {
    polishScore += 50 + (polishCharCount / totalWords) * 100;
  }
  
  // Word frequency analysis
  polishScore += (polishWordMatches / totalWords) * 100;
  englishScore += (englishWordMatches / totalWords) * 100;
  
  // Determine language and confidence
  const totalScore = polishScore + englishScore;
  if (totalScore === 0) {
    return { language: 'en', confidence: 0.5 };
  }
  
  if (polishScore > englishScore) {
    return { 
      language: 'pl', 
      confidence: Math.min(0.99, polishScore / (totalScore + 10))
    };
  } else {
    return { 
      language: 'en', 
      confidence: Math.min(0.99, englishScore / (totalScore + 10))
    };
  }
}

/**
 * Clean raw PDF text from common artifacts
 */
function cleanPDFArtifacts(text: string): string {
  let cleaned = text;
  
  // Remove page numbers (common patterns)
  cleaned = cleaned.replace(/^[\s]*[-–—]?\s*\d+\s*[-–—]?\s*$/gm, '');
  cleaned = cleaned.replace(/Page\s+\d+(\s+of\s+\d+)?/gi, '');
  cleaned = cleaned.replace(/Strona\s+\d+(\s+z\s+\d+)?/gi, ''); // Polish
  
  // Fix hyphenated words split across lines
  cleaned = cleaned.replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2');
  
  // Remove excessive whitespace while preserving paragraph breaks
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Remove isolated special characters
  cleaned = cleaned.replace(/^\s*[•●○◦▪▸►◆◇★☆→←↑↓]\s*$/gm, '');
  
  // Clean up URLs (read domain only)
  cleaned = cleaned.replace(/https?:\/\/(?:www\.)?([a-zA-Z0-9-]+)\.([a-zA-Z]+)[^\s]*/g, 
    (_, domain, tld) => `${domain} dot ${tld}`);
  
  // Handle email addresses
  cleaned = cleaned.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})/g,
    (_, user, domain, tld) => `${user} at ${domain} dot ${tld}`);
  
  // Remove citation markers like [1], [2,3], etc.
  cleaned = cleaned.replace(/\[\d+(?:,\s*\d+)*\]/g, '');
  cleaned = cleaned.replace(/\(\d+(?:,\s*\d+)*\)/g, '');
  
  // Remove footnote markers
  cleaned = cleaned.replace(/[*†‡§¶]\d*/g, '');
  
  return cleaned.trim();
}

/**
 * Expand abbreviations based on language
 */
function expandAbbreviations(text: string, language: 'en' | 'pl'): string {
  let expanded = text;
  const abbreviations = language === 'pl' ? POLISH_ABBREVIATIONS : ENGLISH_ABBREVIATIONS;
  
  for (const [abbr, full] of Object.entries(abbreviations)) {
    // Create regex that matches the abbreviation as a word
    const escapedAbbr = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedAbbr}\\b`, 'gi');
    expanded = expanded.replace(regex, full);
  }
  
  return expanded;
}

/**
 * Convert numbers to spoken form
 */
function speakNumbers(text: string, language: 'en' | 'pl'): string {
  let spoken = text;
  
  // Handle percentages
  if (language === 'pl') {
    spoken = spoken.replace(/(\d+(?:[,.]\d+)?)\s*%/g, '$1 procent');
  } else {
    spoken = spoken.replace(/(\d+(?:\.\d+)?)\s*%/g, '$1 percent');
  }
  
  // Handle currency
  if (language === 'pl') {
    spoken = spoken.replace(/(\d+(?:,\d{2})?)\s*zł/gi, '$1 złotych');
    spoken = spoken.replace(/(\d+)\s*gr/gi, '$1 groszy');
  }
  
  spoken = spoken.replace(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g, (_, amount) => {
    return `${amount.replace(/,/g, '')} ${language === 'pl' ? 'dolarów' : 'dollars'}`;
  });
  
  spoken = spoken.replace(/€(\d+(?:,\d{3})*(?:[,.]\d{2})?)/g, (_, amount) => {
    return `${amount.replace(/,/g, '')} euro`;
  });
  
  // Handle time
  spoken = spoken.replace(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/g, (_, hour, min, period) => {
    const h = parseInt(hour);
    const m = parseInt(min);
    let result = `${h}`;
    
    if (language === 'pl') {
      if (m === 0) {
        result += '';
      } else if (m < 10) {
        result += ` zero ${m}`;
      } else {
        result += ` ${m}`;
      }
    } else {
      if (m === 0) {
        result += ` o'clock`;
      } else if (m < 10) {
        result += ` oh ${m}`;
      } else {
        result += ` ${m}`;
      }
      if (period) {
        result += ` ${period.toLowerCase()}`;
      }
    }
    return result;
  });
  
  // Handle fractions
  spoken = spoken.replace(/(\d+)\/(\d+)/g, (_, num, denom) => {
    if (language === 'pl') {
      const denomWordsPl: Record<string, string> = {
        '2': 'druga',
        '3': 'trzecia',
        '4': 'czwarta',
        '5': 'piąta',
        '6': 'szósta',
        '7': 'siódma',
        '8': 'ósma',
        '9': 'dziewiąta',
        '10': 'dziesiąta',
      };
      if (denomWordsPl[denom]) {
        return `${num} ${denomWordsPl[denom]}`;
      }
      return `${num} przez ${denom}`;
    } else {
      const denomWords: Record<string, string> = {
        '2': 'half',
        '3': 'third',
        '4': 'quarter',
        '5': 'fifth',
        '6': 'sixth',
        '7': 'seventh',
        '8': 'eighth',
        '9': 'ninth',
        '10': 'tenth',
      };
      if (denomWords[denom]) {
        const plural = parseInt(num) > 1 ? 's' : '';
        return `${num} ${denomWords[denom]}${plural}`;
      }
      return `${num} over ${denom}`;
    }
  });
  
  // Handle decimal numbers
  if (language === 'pl') {
    spoken = spoken.replace(/(\d+),(\d+)/g, '$1 przecinek $2');
  } else {
    spoken = spoken.replace(/(\d+)\.(\d+)/g, (_, whole, decimal) => {
      return `${whole} point ${decimal.split('').join(' ')}`;
    });
  }
  
  return spoken;
}

/**
 * Split text into segments with prosody hints
 */
function createSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  
  // Split into paragraphs first
  const paragraphs = text.split(/\n\n+/);
  
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;
    
    // Detect paragraph type
    const isHeading = /^(Chapter|Section|Part|Introduction|Conclusion|Summary|Abstract|Rozdział|Sekcja|Część|Wstęp|Zakończenie|Podsumowanie|Streszczenie)/i.test(paragraph) ||
                      (paragraph.length < 100 && !paragraph.includes('.'));
    const isList = /^[\s]*[-•●○◦▪▸►]\s/.test(paragraph) || /^\s*\d+\.\s/.test(paragraph);
    const isQuote = /^["'"„»].*["'"«"]$/.test(paragraph.trim()) || /^>\s/.test(paragraph);
    
    // Split paragraph into sentences
    const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (!sentence) continue;
      
      // Analyze sentence for prosody
      const isQuestion = sentence.endsWith('?');
      const isExclamation = sentence.endsWith('!');
      const isShort = sentence.split(/\s+/).length < 6;
      
      let type: TextSegment['type'] = 'sentence';
      let emphasis: TextSegment['emphasis'] = 'normal';
      let pauseAfter = 400;
      
      if (isHeading) {
        type = 'heading';
        emphasis = 'strong';
        pauseAfter = 800;
      } else if (isList) {
        type = 'list';
        pauseAfter = 300;
      } else if (isQuote) {
        type = 'quote';
        emphasis = 'soft';
      } else if (i === 0) {
        emphasis = 'strong';
      }
      
      if (isQuestion || isExclamation) {
        pauseAfter = 500;
      }
      
      if (isShort) {
        pauseAfter = Math.max(pauseAfter - 100, 200);
      }
      
      segments.push({
        text: sentence,
        type,
        emphasis,
        pauseAfter,
      });
    }
    
    // Add extra pause at paragraph end
    if (segments.length > 0) {
      segments[segments.length - 1].pauseAfter = 700;
    }
  }
  
  return segments;
}

/**
 * Main preprocessing function
 */
export function preprocessText(rawText: string): ProcessedText {
  // Detect language first
  const { language, confidence } = detectLanguage(rawText);
  
  // Step 1: Clean PDF artifacts
  let text = cleanPDFArtifacts(rawText);
  
  // Step 2: Expand abbreviations
  text = expandAbbreviations(text, language);
  
  // Step 3: Convert numbers to spoken form
  text = speakNumbers(text, language);
  
  // Step 4: Create segments
  const segments = createSegments(text);
  
  // Step 5: Calculate metadata
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const baseDuration = (words.length / 150) * 60;
  const pauseDuration = segments.reduce((sum, seg) => sum + seg.pauseAfter, 0) / 1000;
  
  return {
    text,
    language,
    segments,
    metadata: {
      wordCount: words.length,
      sentenceCount: sentences.length,
      estimatedDuration: baseDuration + pauseDuration,
      detectedLanguage: language,
      confidence,
    },
  };
}

/**
 * Get plain text from segments
 */
export function getPlainText(segments: TextSegment[]): string {
  return segments.map(s => s.text).join(' ');
}
