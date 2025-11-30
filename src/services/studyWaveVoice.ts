/**
 * StudyWaveVoice - Natural Language Text-to-Speech Engine
 * 
 * A sophisticated TTS system that reads text naturally in English and Polish.
 * Features:
 * - Automatic language detection
 * - Natural prosody with dynamic pitch and rhythm
 * - Multiple voice personalities per language
 * - Intelligent text preprocessing for PDFs
 * - Real-time progress tracking
 */

import { preprocessText, detectLanguage, ProcessedText, TextSegment } from './textPreprocessor';

export interface VoicePersonality {
  id: string;
  name: string;
  description: string;
  style: string;
  language: 'en' | 'pl';
  voiceName?: string;
  pitch: number;
  rate: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  totalTime: number;
  currentText: string;
  detectedLanguage?: 'en' | 'pl';
  currentVoice?: string;
}

// Voice personalities for English and Polish
export const VOICE_PERSONALITIES: VoicePersonality[] = [
  // English voices
  {
    id: "en-marcus",
    name: "Marcus",
    description: "Professional English male voice, clear and authoritative",
    style: "English (Male)",
    language: 'en',
    pitch: 0.95,
    rate: 1.0,
  },
  {
    id: "en-emma",
    name: "Emma",
    description: "Warm English female voice, engaging and friendly",
    style: "English (Female)",
    language: 'en',
    pitch: 1.08,
    rate: 1.0,
  },
  {
    id: "en-james",
    name: "James",
    description: "British English male, sophisticated and calm",
    style: "British (Male)",
    language: 'en',
    pitch: 0.9,
    rate: 0.95,
  },
  {
    id: "en-sophia",
    name: "Sophia",
    description: "American English female, dynamic and expressive",
    style: "American (Female)",
    language: 'en',
    pitch: 1.12,
    rate: 1.0,
  },
  // Polish voices
  {
    id: "pl-jakub",
    name: "Jakub",
    description: "Profesjonalny polski głos męski, wyraźny i pewny",
    style: "Polski (Męski)",
    language: 'pl',
    pitch: 0.95,
    rate: 1.0,
  },
  {
    id: "pl-zofia",
    name: "Zofia",
    description: "Ciepły polski głos żeński, przyjazny i naturalny",
    style: "Polski (Żeński)",
    language: 'pl',
    pitch: 1.08,
    rate: 1.0,
  },
  {
    id: "pl-adam",
    name: "Adam",
    description: "Spokojny polski głos męski, idealny do nauki",
    style: "Polski (Męski)",
    language: 'pl',
    pitch: 0.88,
    rate: 0.95,
  },
  {
    id: "pl-anna",
    name: "Anna",
    description: "Ekspresyjny polski głos żeński, angażujący i melodyjny",
    style: "Polski (Żeński)",
    language: 'pl',
    pitch: 1.15,
    rate: 1.0,
  },
];

interface StudyWaveCallbacks {
  onStateChange?: (state: PlaybackState) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  onVoicesLoaded?: () => void;
  onLanguageDetected?: (language: 'en' | 'pl', confidence: number) => void;
}

class StudyWaveVoice {
  private synthesis: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private rawText: string = "";
  private processedText: ProcessedText | null = null;
  private segments: TextSegment[] = [];
  private currentSegmentIndex: number = 0;
  private currentRate: number = 1.0;
  private currentPersonality: VoicePersonality = VOICE_PERSONALITIES[0];
  private isPaused: boolean = false;
  private isPlaying: boolean = false;
  private callbacks: StudyWaveCallbacks = {};
  private startTime: number = 0;
  private pausedTime: number = 0;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private selectedBrowserVoice: SpeechSynthesisVoice | null = null;
  private detectedLanguage: 'en' | 'pl' = 'en';

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synthesis = window.speechSynthesis;
      
      const loadVoices = () => {
        this.availableVoices = this.synthesis?.getVoices() || [];
        if (this.availableVoices.length > 0 && this.callbacks.onVoicesLoaded) {
          this.callbacks.onVoicesLoaded();
        }
      };

      loadVoices();
      if (this.synthesis) {
        this.synthesis.addEventListener('voiceschanged', loadVoices);
      }
    }
  }

  isSupported(): boolean {
    return this.synthesis !== null && this.availableVoices.length > 0;
  }

  setCallbacks(callbacks: StudyWaveCallbacks) {
    this.callbacks = callbacks;
  }

  setPersonality(personalityId: string) {
    const personality = VOICE_PERSONALITIES.find(p => p.id === personalityId);
    if (personality) {
      this.currentPersonality = personality;
      this.selectedBrowserVoice = null; // Reset browser voice when changing personality
    }
  }

  getCurrentPersonality(): VoicePersonality {
    return this.currentPersonality;
  }

  getPersonalitiesByLanguage(language: 'en' | 'pl'): VoicePersonality[] {
    return VOICE_PERSONALITIES.filter(p => p.language === language);
  }

  /**
   * Get all available browser voices
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.availableVoices;
  }

  /**
   * Get voices filtered by language
   */
  getVoicesByLanguage(language: 'en' | 'pl'): SpeechSynthesisVoice[] {
    const langPrefix = language === 'pl' ? 'pl' : 'en';
    return this.availableVoices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
  }

  /**
   * Set a specific browser voice directly
   */
  setVoiceDirectly(voice: SpeechSynthesisVoice) {
    this.selectedBrowserVoice = voice;
    
    // Update personality to match voice language
    const lang = voice.lang.toLowerCase().startsWith('pl') ? 'pl' : 'en';
    const gender = this.detectGenderFromVoiceName(voice.name);
    
    // Find matching personality or keep current
    const matchingPersonality = VOICE_PERSONALITIES.find(
      p => p.language === lang && p.id.includes(gender)
    );
    if (matchingPersonality) {
      this.currentPersonality = matchingPersonality;
    }
  }

  private detectGenderFromVoiceName(name: string): 'male' | 'female' {
    const nameLower = name.toLowerCase();
    const femalePatterns = [
      'female', 'woman', 'girl', 
      // Polish female names
      'zuzanna', 'zofia', 'paulina', 'ewa', 'anna', 'maria', 'katarzyna', 'agnieszka', 'małgorzata',
      // English female names
      'emma', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'monica', 'nicky', 'fiona', 'sophia'
    ];
    
    if (femalePatterns.some(pattern => nameLower.includes(pattern))) {
      return 'female';
    }
    return 'male';
  }

  private selectBestVoice(language: 'en' | 'pl'): SpeechSynthesisVoice | null {
    // If a specific voice was selected, use it
    if (this.selectedBrowserVoice) {
      return this.selectedBrowserVoice;
    }

    // Determine preferred gender from personality
    const isFemale = this.currentPersonality.id.includes('emma') || 
                     this.currentPersonality.id.includes('sophia') ||
                     this.currentPersonality.id.includes('zofia') ||
                     this.currentPersonality.id.includes('anna');
    
    // Filter voices by language
    const langCode = language === 'pl' ? 'pl' : 'en';
    const languageVoices = this.availableVoices.filter(v => 
      v.lang.toLowerCase().startsWith(langCode)
    );
    
    if (languageVoices.length === 0) {
      // Fallback to any available voice
      return this.availableVoices[0] || null;
    }
    
    // Try to find gender-appropriate voice
    const femalePatterns = ['female', 'woman', 'zuzanna', 'zofia', 'paulina', 'anna', 'emma', 'samantha', 'victoria', 'karen'];
    const malePatterns = ['male', 'man', 'jakub', 'jan', 'piotr', 'adam', 'david', 'daniel', 'oliver', 'thomas'];
    
    const matchingVoices = languageVoices.filter(v => {
      const nameLower = v.name.toLowerCase();
      if (isFemale) {
        return femalePatterns.some(pattern => nameLower.includes(pattern));
      } else {
        return malePatterns.some(pattern => nameLower.includes(pattern));
      }
    });
    
    if (matchingVoices.length > 0) {
      // Prefer Google or Microsoft voices for quality
      const premiumVoice = matchingVoices.find(v => 
        v.name.includes('Google') || v.name.includes('Microsoft')
      );
      return premiumVoice || matchingVoices[0];
    }
    
    // Fallback to any voice in the target language
    const premiumVoice = languageVoices.find(v => 
      v.name.includes('Google') || v.name.includes('Microsoft')
    );
    return premiumVoice || languageVoices[0];
  }

  private estimateDuration(text: string, rate: number): number {
    const words = text.split(/\s+/).length;
    const wordsPerMinute = 150 * rate;
    return (words / wordsPerMinute) * 60;
  }

  private emitStateChange() {
    if (this.callbacks.onStateChange) {
      const totalDuration = this.processedText?.metadata.estimatedDuration || 
                           this.estimateDuration(this.rawText, this.currentRate);
      const progress = this.segments.length > 0 
        ? (this.currentSegmentIndex / this.segments.length) * totalDuration 
        : 0;

      const voice = this.selectedBrowserVoice || this.selectBestVoice(this.detectedLanguage);

      this.callbacks.onStateChange({
        isPlaying: this.isPlaying,
        isPaused: this.isPaused,
        currentTime: progress,
        totalTime: totalDuration,
        currentText: this.segments[this.currentSegmentIndex]?.text || "",
        detectedLanguage: this.detectedLanguage,
        currentVoice: voice?.name,
      });
    }
  }

  private speakNextSegment() {
    if (!this.synthesis || this.currentSegmentIndex >= this.segments.length) {
      this.isPlaying = false;
      this.isPaused = false;
      if (this.callbacks.onComplete) this.callbacks.onComplete();
      this.emitStateChange();
      return;
    }

    const segment = this.segments[this.currentSegmentIndex];
    this.utterance = new SpeechSynthesisUtterance(segment.text);
    
    // Apply personality settings with segment adjustments
    let effectiveRate = this.currentRate * this.currentPersonality.rate;
    let effectivePitch = this.currentPersonality.pitch;
    
    // Adjust for emphasis
    if (segment.emphasis === 'strong') {
      effectivePitch *= 1.02;
      effectiveRate *= 0.95;
    } else if (segment.emphasis === 'soft') {
      effectivePitch *= 0.98;
      effectiveRate *= 0.98;
    }
    
    // Adjust for segment type
    if (segment.type === 'heading') {
      effectivePitch *= 1.05;
      effectiveRate *= 0.9;
    } else if (segment.type === 'quote') {
      effectivePitch *= 0.97;
    }
    
    this.utterance.rate = Math.max(0.5, Math.min(2.0, effectiveRate));
    this.utterance.pitch = Math.max(0.5, Math.min(2.0, effectivePitch));
    
    // Set voice
    const voice = this.selectBestVoice(this.detectedLanguage);
    if (voice) {
      this.utterance.voice = voice;
      this.utterance.lang = voice.lang;
    }

    this.utterance.onstart = () => {
      this.emitStateChange();
    };

    this.utterance.onend = () => {
      this.currentSegmentIndex++;
      this.emitStateChange();
      
      // Apply pause after segment
      const pauseTime = segment.pauseAfter / this.currentRate;
      if (pauseTime > 0 && this.currentSegmentIndex < this.segments.length && !this.isPaused) {
        setTimeout(() => {
          if (this.isPlaying && !this.isPaused) {
            this.speakNextSegment();
          }
        }, pauseTime);
      } else {
        this.speakNextSegment();
      }
    };

    this.utterance.onerror = (event) => {
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        if (this.callbacks.onError) {
          this.callbacks.onError(new Error(`Speech synthesis error: ${event.error}`));
        }
      }
    };

    this.synthesis.speak(this.utterance);
  }

  speak(options: {
    text: string;
    startPosition?: number;
    autoDetectLanguage?: boolean;
  }) {
    if (!this.synthesis) {
      if (this.callbacks.onError) {
        this.callbacks.onError(new Error("Speech synthesis not supported"));
      }
      return;
    }

    // Stop any current playback
    this.stop();

    this.rawText = options.text;
    this.isPaused = false;
    this.isPlaying = true;

    // Process text with preprocessing
    this.processedText = preprocessText(options.text);
    this.segments = this.processedText.segments;

    // Auto-detect language if enabled
    if (options.autoDetectLanguage !== false) {
      const detected = detectLanguage(options.text);
      this.detectedLanguage = detected.language;
      
      // Notify about language detection
      if (this.callbacks.onLanguageDetected) {
        this.callbacks.onLanguageDetected(detected.language, detected.confidence);
      }
      
      // Auto-switch personality if language changed
      if (this.currentPersonality.language !== detected.language) {
        const matchingPersonality = VOICE_PERSONALITIES.find(
          p => p.language === detected.language
        );
        if (matchingPersonality) {
          this.currentPersonality = matchingPersonality;
        }
      }
    } else {
      this.detectedLanguage = this.currentPersonality.language;
    }

    // Calculate starting position
    if (this.segments.length === 0) {
      if (this.callbacks.onError) {
        this.callbacks.onError(new Error("No speakable text found"));
      }
      return;
    }

    const totalDuration = this.processedText.metadata.estimatedDuration;
    const startPosition = options.startPosition || 0;
    this.currentSegmentIndex = Math.floor(startPosition * this.segments.length);

    this.startTime = Date.now();
    this.pausedTime = 0;
    
    this.emitStateChange();
    this.speakNextSegment();
  }

  pause() {
    if (this.synthesis && this.isPlaying && !this.isPaused) {
      this.synthesis.cancel();
      this.isPaused = true;
      this.pausedTime += Date.now() - this.startTime;
      this.emitStateChange();
    }
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.startTime = Date.now();
      this.emitStateChange();
      this.speakNextSegment();
    }
  }

  stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.currentSegmentIndex = 0;
      this.isPaused = false;
      this.isPlaying = false;
      this.emitStateChange();
    }
  }

  setRate(rate: number) {
    this.currentRate = Math.max(0.5, Math.min(2.0, rate));
    if (this.utterance && this.synthesis && this.isPlaying) {
      const wasPlaying = this.isPlaying && !this.isPaused;
      this.synthesis.cancel();
      if (wasPlaying) {
        this.speakNextSegment();
      }
    }
  }

  getRate(): number {
    return this.currentRate;
  }

  seekTo(position: number) {
    if (!this.rawText || this.segments.length === 0) return;

    const normalizedPosition = Math.max(0, Math.min(1, position));
    const targetChunkIndex = Math.floor(normalizedPosition * this.segments.length);
    this.currentSegmentIndex = Math.max(0, Math.min(targetChunkIndex, this.segments.length - 1));

    if (this.isPlaying) {
      if (this.synthesis) {
        this.synthesis.cancel();
      }
      if (!this.isPaused) {
        this.speakNextSegment();
      }
    }
    
    this.emitStateChange();
  }

  skipForward(seconds: number) {
    const totalDuration = this.processedText?.metadata.estimatedDuration || 
                         this.estimateDuration(this.rawText, this.currentRate);
    const currentPosition = this.segments.length > 0 
      ? this.currentSegmentIndex / this.segments.length 
      : 0;
    const newPosition = Math.min(1, currentPosition + (seconds / totalDuration));
    this.seekTo(newPosition);
  }

  skipBackward(seconds: number) {
    const totalDuration = this.processedText?.metadata.estimatedDuration || 
                         this.estimateDuration(this.rawText, this.currentRate);
    const currentPosition = this.segments.length > 0 
      ? this.currentSegmentIndex / this.segments.length 
      : 0;
    const newPosition = Math.max(0, currentPosition - (seconds / totalDuration));
    this.seekTo(newPosition);
  }

  /**
   * Get current playback info
   */
  getPlaybackInfo(): PlaybackState {
    const totalDuration = this.processedText?.metadata.estimatedDuration || 
                         this.estimateDuration(this.rawText, this.currentRate);
    const progress = this.segments.length > 0 
      ? (this.currentSegmentIndex / this.segments.length) * totalDuration 
      : 0;
    const voice = this.selectedBrowserVoice || this.selectBestVoice(this.detectedLanguage);

    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentTime: progress,
      totalTime: totalDuration,
      currentText: this.segments[this.currentSegmentIndex]?.text || "",
      detectedLanguage: this.detectedLanguage,
      currentVoice: voice?.name,
    };
  }

  /**
   * Get detected language
   */
  getDetectedLanguage(): 'en' | 'pl' {
    return this.detectedLanguage;
  }
}

export const studyWaveVoice = new StudyWaveVoice();
