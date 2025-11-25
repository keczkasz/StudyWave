/**
 * StudyWave Text Preprocessor
 * Transforms raw PDF text into speech-optimized text with natural prosody markers
 */

export interface ProcessedText {
  text: string;
  segments: TextSegment[];
  metadata: TextMetadata;
}

export interface TextSegment {
  text: string;
  type: 'sentence' | 'paragraph' | 'heading' | 'list' | 'quote';
  emphasis: 'normal' | 'strong' | 'soft';
  pauseAfter: number; // milliseconds
  pitchShift: number; // semitones (-5 to +5)
  speedModifier: number; // 0.8 to 1.2
}

export interface TextMetadata {
  wordCount: number;
  sentenceCount: number;
  estimatedDuration: number; // seconds
  readingLevel: 'simple' | 'moderate' | 'complex';
  hasCodeBlocks: boolean;
  hasMath: boolean;
}

// Common abbreviations and their spoken forms
const ABBREVIATIONS: Record<string, string> = {
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
  'assoc.': 'association',
  'ref.': 'reference',
  'tel.': 'telephone',
  'fax.': 'facsimile',
};

// Number words for natural reading
const NUMBER_WORDS: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
  '10': 'ten',
  '11': 'eleven',
  '12': 'twelve',
};

// Ordinal suffixes
const ORDINAL_SUFFIXES: Record<string, string> = {
  '1st': 'first',
  '2nd': 'second',
  '3rd': 'third',
  '4th': 'fourth',
  '5th': 'fifth',
  '6th': 'sixth',
  '7th': 'seventh',
  '8th': 'eighth',
  '9th': 'ninth',
  '10th': 'tenth',
  '11th': 'eleventh',
  '12th': 'twelfth',
  '13th': 'thirteenth',
  '20th': 'twentieth',
  '21st': 'twenty first',
  '100th': 'one hundredth',
};

/**
 * Clean raw PDF text from common artifacts
 */
function cleanPDFArtifacts(text: string): string {
  let cleaned = text;
  
  // Remove page numbers (common patterns)
  cleaned = cleaned.replace(/^[\s]*[-–—]?\s*\d+\s*[-–—]?\s*$/gm, '');
  cleaned = cleaned.replace(/Page\s+\d+(\s+of\s+\d+)?/gi, '');
  
  // Remove common header/footer patterns
  cleaned = cleaned.replace(/^[\s]*Chapter\s+\d+[\s]*$/gm, '\n\nChapter $&.\n\n');
  
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
 * Expand abbreviations to their spoken forms
 */
function expandAbbreviations(text: string): string {
  let expanded = text;
  
  for (const [abbr, full] of Object.entries(ABBREVIATIONS)) {
    const regex = new RegExp(abbr.replace('.', '\\.'), 'g');
    expanded = expanded.replace(regex, full);
  }
  
  // Expand ordinals
  for (const [ordinal, word] of Object.entries(ORDINAL_SUFFIXES)) {
    const regex = new RegExp(`\\b${ordinal}\\b`, 'gi');
    expanded = expanded.replace(regex, word);
  }
  
  return expanded;
}

/**
 * Convert numbers to spoken form for natural reading
 */
function speakNumbers(text: string): string {
  let spoken = text;
  
  // Handle percentages
  spoken = spoken.replace(/(\d+(?:\.\d+)?)\s*%/g, '$1 percent');
  
  // Handle currency
  spoken = spoken.replace(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g, (_, amount) => {
    const num = amount.replace(/,/g, '');
    const parts = num.split('.');
    let result = `${parts[0]} dollars`;
    if (parts[1] && parts[1] !== '00') {
      result += ` and ${parts[1]} cents`;
    }
    return result;
  });
  
  spoken = spoken.replace(/€(\d+(?:,\d{3})*(?:\.\d{2})?)/g, (_, amount) => {
    return `${amount.replace(/,/g, '')} euros`;
  });
  
  spoken = spoken.replace(/£(\d+(?:,\d{3})*(?:\.\d{2})?)/g, (_, amount) => {
    return `${amount.replace(/,/g, '')} pounds`;
  });
  
  // Handle years (4-digit numbers between 1000-2100)
  spoken = spoken.replace(/\b(1[0-9]{3}|20[0-9]{2}|21[0-9]{2})\b/g, (year) => {
    const num = parseInt(year);
    if (num >= 2000 && num <= 2009) {
      return `two thousand ${num === 2000 ? '' : NUMBER_WORDS[year.slice(-1)] || year.slice(-1)}`.trim();
    } else if (num >= 2010) {
      return `twenty ${year.slice(-2)}`;
    }
    return year;
  });
  
  // Handle time
  spoken = spoken.replace(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/g, (_, hour, min, period) => {
    const h = parseInt(hour);
    const m = parseInt(min);
    let result = `${h}`;
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
    return result;
  });
  
  // Handle fractions
  spoken = spoken.replace(/(\d+)\/(\d+)/g, (_, num, denom) => {
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
  });
  
  // Handle decimal numbers
  spoken = spoken.replace(/(\d+)\.(\d+)/g, (_, whole, decimal) => {
    return `${whole} point ${decimal.split('').join(' ')}`;
  });
  
  // Small numbers (0-12) to words in context
  spoken = spoken.replace(/\b([0-9]|1[0-2])\s+(times?|people|items?|things?|ways?|steps?|points?)/gi, 
    (match, num, noun) => {
      return `${NUMBER_WORDS[num] || num} ${noun}`;
    });
  
  return spoken;
}

/**
 * Add prosody markers for natural speech rhythm
 */
function addProsodyMarkers(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  
  // Split into paragraphs first
  const paragraphs = text.split(/\n\n+/);
  
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;
    
    // Detect paragraph type
    const isHeading = /^(Chapter|Section|Part|Introduction|Conclusion|Summary|Abstract)/i.test(paragraph) ||
                      (paragraph.length < 100 && !paragraph.includes('.'));
    const isList = /^[\s]*[-•●○◦▪▸►]\s/.test(paragraph) || /^\s*\d+\.\s/.test(paragraph);
    const isQuote = /^["'"'].*["'"']$/.test(paragraph.trim()) || /^>\s/.test(paragraph);
    
    // Split paragraph into sentences
    const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (!sentence) continue;
      
      // Analyze sentence structure for prosody
      const isQuestion = sentence.endsWith('?');
      const isExclamation = sentence.endsWith('!');
      const hasComma = sentence.includes(',');
      const isShort = sentence.split(/\s+/).length < 6;
      const isLong = sentence.split(/\s+/).length > 25;
      
      // Determine segment properties
      let type: TextSegment['type'] = 'sentence';
      let emphasis: TextSegment['emphasis'] = 'normal';
      let pauseAfter = 400; // default pause after sentence
      let pitchShift = 0;
      let speedModifier = 1.0;
      
      if (isHeading) {
        type = 'heading';
        emphasis = 'strong';
        pauseAfter = 800;
        pitchShift = 1;
        speedModifier = 0.9;
      } else if (isList) {
        type = 'list';
        pauseAfter = 300;
      } else if (isQuote) {
        type = 'quote';
        emphasis = 'soft';
        speedModifier = 0.95;
      } else if (i === 0) {
        // First sentence of paragraph - slight emphasis
        emphasis = 'strong';
        pitchShift = 0.5;
      }
      
      if (isQuestion) {
        pitchShift += 2; // Rising intonation
        pauseAfter = 500;
      } else if (isExclamation) {
        emphasis = 'strong';
        pitchShift += 1;
        pauseAfter = 500;
      }
      
      if (isShort) {
        speedModifier *= 0.95; // Slow down short sentences
      } else if (isLong) {
        speedModifier *= 1.05; // Speed up long sentences slightly
        pauseAfter = 600;
      }
      
      // Add comma pauses within the sentence
      let processedSentence = sentence;
      if (hasComma) {
        processedSentence = sentence.replace(/,\s*/g, ', ');
      }
      
      segments.push({
        text: processedSentence,
        type,
        emphasis,
        pauseAfter,
        pitchShift,
        speedModifier,
      });
    }
    
    // Add paragraph break
    if (segments.length > 0) {
      segments[segments.length - 1].pauseAfter = 700;
    }
  }
  
  return segments;
}

/**
 * Calculate text metadata
 */
function calculateMetadata(text: string, segments: TextSegment[]): TextMetadata {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  // Average words per sentence for reading level
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  let readingLevel: TextMetadata['readingLevel'] = 'moderate';
  if (avgWordsPerSentence < 12) readingLevel = 'simple';
  else if (avgWordsPerSentence > 20) readingLevel = 'complex';
  
  // Estimate duration (150 words per minute average)
  const baseDuration = (words.length / 150) * 60;
  const pauseDuration = segments.reduce((sum, seg) => sum + seg.pauseAfter, 0) / 1000;
  const estimatedDuration = baseDuration + pauseDuration;
  
  // Detect code blocks
  const hasCodeBlocks = /```[\s\S]*?```|`[^`]+`/.test(text) ||
                        /function\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=/.test(text);
  
  // Detect math
  const hasMath = /\$\$[\s\S]*?\$\$|\$[^$]+\$|\\[a-zA-Z]+\{/.test(text) ||
                  /[∑∏∫∂∇√∞±×÷≠≤≥≈∈∉⊂⊃∪∩]/.test(text);
  
  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    estimatedDuration,
    readingLevel,
    hasCodeBlocks,
    hasMath,
  };
}

/**
 * Main preprocessing function
 * Transforms raw PDF text into speech-optimized format
 */
export function preprocessText(rawText: string): ProcessedText {
  // Step 1: Clean PDF artifacts
  let text = cleanPDFArtifacts(rawText);
  
  // Step 2: Expand abbreviations
  text = expandAbbreviations(text);
  
  // Step 3: Convert numbers to spoken form
  text = speakNumbers(text);
  
  // Step 4: Generate prosody segments
  const segments = addProsodyMarkers(text);
  
  // Step 5: Calculate metadata
  const metadata = calculateMetadata(text, segments);
  
  return {
    text,
    segments,
    metadata,
  };
}

/**
 * Get plain text from segments (for display)
 */
export function getPlainText(segments: TextSegment[]): string {
  return segments.map(s => s.text).join(' ');
}

/**
 * Estimate reading time from text
 */
export function estimateReadingTime(text: string, wordsPerMinute: number = 150): number {
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  return Math.ceil((words / wordsPerMinute) * 60);
}
