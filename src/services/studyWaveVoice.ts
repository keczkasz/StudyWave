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
    id: "scholar",
    name: "Scholar",
    description: "Clear and articulate, perfect for academic content",
    style: "Academic",
    pitch: 1.0,
    rate: 1.0,
  },
  {
    id: "narrator",
    name: "Narrator",
    description: "Warm and engaging, ideal for storytelling",
    style: "Narrative",
    pitch: 0.95,
    rate: 0.95,
  },
  {
    id: "calm",
    name: "Calm",
    description: "Soothing and relaxed, great for meditation or focus",
    style: "Relaxing",
    pitch: 0.9,
    rate: 0.85,
  },
  {
    id: "energetic",
    name: "Energetic",
    description: "Upbeat and dynamic, keeps you engaged",
    style: "Dynamic",
    pitch: 1.1,
    rate: 1.1,
  },
];

interface StudyWaveCallbacks {
  onStateChange?: (state: PlaybackState) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  onVoicesLoaded?: () => void;
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
    // Try to find a high-quality voice based on personality
    const englishVoices = this.availableVoices.filter(v => v.lang.startsWith('en'));
    
    // Prefer Google voices for better quality
    const googleVoice = englishVoices.find(v => v.name.includes('Google'));
    if (googleVoice) return googleVoice;

    // Fallback to any English voice
    return englishVoices[0] || this.availableVoices[0] || null;
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

    this.chunks = this.splitIntoChunks(this.text);
    
    const totalDuration = this.estimateDuration(this.text, this.currentRate);
    const startPosition = options.startPosition || 0;
    this.currentChunkIndex = Math.floor((startPosition / totalDuration) * this.chunks.length);

    this.startTime = Date.now();
    this.pausedTime = 0;
    this.speakNextChunk();
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
