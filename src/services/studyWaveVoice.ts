export interface VoicePersonality {
  id: string;
  name: string;
  description: string;
  style: string;
  voiceName?: string; // For browser voices
  pitch?: number;
  rate?: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  totalTime: number;
  currentText: string;
}

export const VOICE_PERSONALITIES: VoicePersonality[] = [
  {
    id: "en-male",
    name: "David",
    description: "Professional English male voice, clear and authoritative",
    style: "English (Male)",
    pitch: 0.95,
    rate: 1.0,
    voiceName: "en-male",
  },
  {
    id: "en-female",
    name: "Emma",
    description: "Warm English female voice, engaging and friendly",
    style: "English (Female)",
    pitch: 1.05,
    rate: 1.0,
    voiceName: "en-female",
  },
  {
    id: "pl-male",
    name: "Jakub",
    description: "Profesjonalny polski głos męski, wyraźny i pewny",
    style: "Polish (Male)",
    pitch: 0.95,
    rate: 1.0,
    voiceName: "pl-male",
  },
  {
    id: "pl-female",
    name: "Zofia",
    description: "Ciepły polski głos żeński, przyjazny i naturalny",
    style: "Polish (Female)",
    pitch: 1.05,
    rate: 1.0,
    voiceName: "pl-female",
  },
];

interface StudyWaveCallbacks {
  onStateChange?: (state: PlaybackState) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  onVoicesLoaded?: () => void;
}

// Language detection helper
function detectLanguage(text: string): 'en' | 'pl' {
  const polishChars = /[ąćęłńóśźż]/i;
  const polishWords = /\b(i|w|z|na|do|się|jest|to|co|jak|ale|nie|od|po|za|bez|pod|przez)\b/gi;
  
  // Check for Polish characters (strong indicator)
  if (polishChars.test(text)) {
    return 'pl';
  }
  
  // Count Polish common words in first 1000 chars
  const sample = text.substring(0, 1000);
  const polishMatches = (sample.match(polishWords) || []).length;
  
  // If more than 15% of words are common Polish words, likely Polish
  const words = sample.split(/\s+/).length;
  if (polishMatches / words > 0.15) {
    return 'pl';
  }
  
  return 'en';
}

class StudyWaveVoice {
  private synthesis: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private text: string = "";
  private chunks: string[] = [];
  private currentChunkIndex: number = 0;
  private currentRate: number = 1.0;
  private currentPersonality: VoicePersonality = VOICE_PERSONALITIES[0];
  private isPaused: boolean = false;
  private isPlaying: boolean = false;
  private callbacks: StudyWaveCallbacks = {};
  private startTime: number = 0;
  private elapsedTime: number = 0;
  private pausedTime: number = 0;
  private availableVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synthesis = window.speechSynthesis;
      
      // Load voices
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
    }
  }

  private splitIntoChunks(text: string, maxLength: number = 200): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxLength) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += " " + sentence;
      }
    }

    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  }

  private estimateDuration(text: string, rate: number): number {
    const words = text.split(/\s+/).length;
    const wordsPerMinute = 150 * rate;
    return (words / wordsPerMinute) * 60;
  }

  private selectVoice(): SpeechSynthesisVoice | null {
    const personalityId = this.currentPersonality.id;
    
    // Determine language and gender from personality
    let targetLang = 'en';
    let preferFemale = false;
    
    if (personalityId.startsWith('pl-')) {
      targetLang = 'pl';
      preferFemale = personalityId === 'pl-female';
    } else if (personalityId.startsWith('en-')) {
      targetLang = 'en';
      preferFemale = personalityId === 'en-female';
    }
    
    // Filter voices by language
    const languageVoices = this.availableVoices.filter(v => 
      v.lang.startsWith(targetLang)
    );
    
    if (languageVoices.length === 0) {
      return this.availableVoices[0] || null;
    }
    
    // Try to find gender-appropriate voice based on name patterns
    const femalePatterns = ['female', 'woman', 'girl', 'zuzanna', 'zofia', 'paulina', 'ewa', 'emma', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'monica', 'nicky'];
    const malePatterns = ['male', 'man', 'boy', 'jakub', 'jan', 'piotr', 'adam', 'david', 'daniel', 'oliver', 'thomas', 'nathan', 'alex'];
    
    const matchingVoices = languageVoices.filter(v => {
      const nameLower = v.name.toLowerCase();
      if (preferFemale) {
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

  private emitStateChange() {
    if (this.callbacks.onStateChange) {
      const totalDuration = this.estimateDuration(this.text, this.currentRate);
      const progress = this.chunks.length > 0 
        ? (this.currentChunkIndex / this.chunks.length) * totalDuration 
        : 0;

      this.callbacks.onStateChange({
        isPlaying: this.isPlaying,
        isPaused: this.isPaused,
        currentTime: progress,
        totalTime: totalDuration,
        currentText: this.chunks[this.currentChunkIndex] || "",
      });
    }
  }

  private speakNextChunk() {
    if (!this.synthesis || this.currentChunkIndex >= this.chunks.length) {
      this.isPlaying = false;
      this.isPaused = false;
      if (this.callbacks.onComplete) this.callbacks.onComplete();
      this.emitStateChange();
      return;
    }

    const chunk = this.chunks[this.currentChunkIndex];
    this.utterance = new SpeechSynthesisUtterance(chunk);
    
    // Apply personality settings
    this.utterance.rate = this.currentRate * (this.currentPersonality.rate || 1.0);
    this.utterance.pitch = this.currentPersonality.pitch || 1.0;
    
    // Set voice
    const voice = this.selectVoice();
    if (voice) {
      this.utterance.voice = voice;
    }

    this.utterance.onstart = () => {
      this.emitStateChange();
    };

    this.utterance.onend = () => {
      this.currentChunkIndex++;
      this.elapsedTime = Date.now() - this.startTime - this.pausedTime;
      this.emitStateChange();
      this.speakNextChunk();
    };

    this.utterance.onerror = (event) => {
      if (this.callbacks.onError) {
        this.callbacks.onError(new Error(`Speech synthesis error: ${event.error}`));
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

    this.text = options.text;
    this.isPaused = false;
    this.isPlaying = true;

    // Auto-detect language if enabled
    if (options.autoDetectLanguage !== false) {
      const detectedLang = detectLanguage(this.text);
      const currentLang = this.currentPersonality.id.startsWith('pl-') ? 'pl' : 'en';
      
      // Auto-switch to detected language if different
      if (detectedLang !== currentLang) {
        const targetPersonality = VOICE_PERSONALITIES.find(p => 
          p.id.startsWith(detectedLang)
        );
        if (targetPersonality) {
          this.currentPersonality = targetPersonality;
        }
      }
    }

    this.chunks = this.splitIntoChunks(this.text);
    
    const totalDuration = this.estimateDuration(this.text, this.currentRate);
    const startPosition = options.startPosition || 0;
    this.currentChunkIndex = Math.floor((startPosition / totalDuration) * this.chunks.length);

    this.startTime = Date.now();
    this.pausedTime = 0;
    this.speakNextChunk();
  }

  // Get all available voices for user selection
  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.availableVoices;
  }

  // Set voice directly by voice object
  setVoiceDirectly(voice: SpeechSynthesisVoice) {
    // Find or create a personality for this voice
    const lang = voice.lang.startsWith('pl') ? 'pl' : 'en';
    const gender = this.detectGenderFromVoiceName(voice.name);
    const personalityId = `${lang}-${gender}`;
    
    const personality = VOICE_PERSONALITIES.find(p => p.id === personalityId) || VOICE_PERSONALITIES[0];
    this.currentPersonality = { ...personality, voiceName: voice.name };
  }

  private detectGenderFromVoiceName(name: string): 'male' | 'female' {
    const nameLower = name.toLowerCase();
    const femalePatterns = ['female', 'woman', 'girl', 'zuzanna', 'zofia', 'paulina', 'ewa', 'emma', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'monica', 'nicky'];
    
    if (femalePatterns.some(pattern => nameLower.includes(pattern))) {
      return 'female';
    }
    return 'male';
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
      this.speakNextChunk();
    }
  }

  stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.currentChunkIndex = 0;
      this.isPaused = false;
      this.isPlaying = false;
      this.emitStateChange();
    }
  }

  setRate(rate: number) {
    this.currentRate = rate;
    if (this.utterance && this.synthesis && this.isPlaying) {
      // Restart with new rate
      const wasPlaying = this.isPlaying && !this.isPaused;
      this.synthesis.cancel();
      if (wasPlaying) {
        this.speakNextChunk();
      }
    }
  }

  seekTo(position: number) {
    if (!this.text || this.chunks.length === 0) return;

    const targetChunkIndex = Math.floor(position * this.chunks.length);
    this.currentChunkIndex = Math.max(0, Math.min(targetChunkIndex, this.chunks.length - 1));

    if (this.isPlaying) {
      if (this.synthesis) {
        this.synthesis.cancel();
      }
      this.speakNextChunk();
    }
  }

  skipForward(seconds: number) {
    const totalDuration = this.estimateDuration(this.text, this.currentRate);
    const currentPosition = (this.currentChunkIndex / this.chunks.length);
    const newPosition = Math.min(1, currentPosition + (seconds / totalDuration));
    this.seekTo(newPosition);
  }

  skipBackward(seconds: number) {
    const totalDuration = this.estimateDuration(this.text, this.currentRate);
    const currentPosition = (this.currentChunkIndex / this.chunks.length);
    const newPosition = Math.max(0, currentPosition - (seconds / totalDuration));
    this.seekTo(newPosition);
  }
}

export const studyWaveVoice = new StudyWaveVoice();
