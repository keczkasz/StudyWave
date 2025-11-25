/**
 * StudyWaveVoice - Natural Language Text-to-Speech Engine
 * 
 * A sophisticated TTS system that reads text naturally, similar to ElevenLabs.
 * Features:
 * - Natural prosody with dynamic pitch and rhythm
 * - Multiple voice personalities
 * - Intelligent text preprocessing for PDFs
 * - Smooth audio streaming with Web Audio API
 * - Real-time progress tracking
 */

import { preprocessText, TextSegment, ProcessedText } from './textPreprocessor';

// Voice personality definitions
export interface VoicePersonality {
  id: string;
  name: string;
  description: string;
  lang: string;
  pitch: number; // 0.5 to 2.0
  rate: number; // 0.5 to 2.0
  volume: number; // 0 to 1
  style: 'neutral' | 'conversational' | 'narrative' | 'professional';
  preferredVoiceNames: string[]; // Browser voice name preferences
}

// Default voice personalities
export const VOICE_PERSONALITIES: VoicePersonality[] = [
  {
    id: 'aria',
    name: 'Aria',
    description: 'Warm and engaging, perfect for storytelling',
    lang: 'en-US',
    pitch: 1.0,
    rate: 0.95,
    volume: 1.0,
    style: 'narrative',
    preferredVoiceNames: ['Samantha', 'Karen', 'Victoria', 'Moira', 'Google US English Female'],
  },
  {
    id: 'marcus',
    name: 'Marcus',
    description: 'Deep and authoritative, ideal for academic content',
    lang: 'en-US',
    pitch: 0.85,
    rate: 0.9,
    volume: 1.0,
    style: 'professional',
    preferredVoiceNames: ['Daniel', 'Alex', 'Fred', 'Google US English Male'],
  },
  {
    id: 'nova',
    name: 'Nova',
    description: 'Clear and dynamic, great for presentations',
    lang: 'en-US',
    pitch: 1.1,
    rate: 1.0,
    volume: 1.0,
    style: 'conversational',
    preferredVoiceNames: ['Samantha', 'Fiona', 'Tessa', 'Google UK English Female'],
  },
  {
    id: 'oliver',
    name: 'Oliver',
    description: 'Calm and measured, excellent for technical documents',
    lang: 'en-GB',
    pitch: 0.9,
    rate: 0.85,
    volume: 1.0,
    style: 'neutral',
    preferredVoiceNames: ['Daniel', 'Oliver', 'Arthur', 'Google UK English Male'],
  },
  {
    id: 'elena',
    name: 'Elena',
    description: 'Expressive and melodic, brings text to life',
    lang: 'en-US',
    pitch: 1.15,
    rate: 0.95,
    volume: 1.0,
    style: 'narrative',
    preferredVoiceNames: ['Samantha', 'Allison', 'Ava', 'Google US English Female'],
  },
];

// Playback state
export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentSegmentIndex: number;
  totalSegments: number;
  currentTime: number;
  totalTime: number;
  currentText: string;
  progress: number; // 0 to 100
}

// Event callbacks
export interface VoiceCallbacks {
  onStateChange?: (state: PlaybackState) => void;
  onSegmentStart?: (segment: TextSegment, index: number) => void;
  onSegmentEnd?: (segment: TextSegment, index: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  onVoicesLoaded?: (voices: SpeechSynthesisVoice[]) => void;
}

/**
 * StudyWaveVoice Engine
 */
class StudyWaveVoiceEngine {
  private synthesis: SpeechSynthesis | null = null;
  private audioContext: AudioContext | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private currentPersonality: VoicePersonality = VOICE_PERSONALITIES[0];
  private utteranceQueue: SpeechSynthesisUtterance[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  
  private processedText: ProcessedText | null = null;
  private segments: TextSegment[] = [];
  private currentSegmentIndex: number = 0;
  private globalRate: number = 1.0;
  
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private accumulatedTime: number = 0;
  
  private callbacks: VoiceCallbacks = {};
  private progressInterval: number | null = null;
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      this.initializeVoices();
    }
  }
  
  /**
   * Initialize available voices
   */
  private initializeVoices(): void {
    if (!this.synthesis) return;
    
    const loadVoices = () => {
      this.voices = this.synthesis!.getVoices();
      if (this.voices.length > 0) {
        this.selectBestVoice();
        this.callbacks.onVoicesLoaded?.(this.voices);
      }
    };
    
    // Voices may load asynchronously
    loadVoices();
    this.synthesis.onvoiceschanged = loadVoices;
  }
  
  /**
   * Select the best available voice for current personality
   */
  private selectBestVoice(): void {
    if (this.voices.length === 0) return;
    
    // Try to find a preferred voice
    for (const preferredName of this.currentPersonality.preferredVoiceNames) {
      const voice = this.voices.find(v => 
        v.name.toLowerCase().includes(preferredName.toLowerCase()) &&
        v.lang.startsWith(this.currentPersonality.lang.split('-')[0])
      );
      if (voice) {
        this.selectedVoice = voice;
        return;
      }
    }
    
    // Fall back to any voice in the right language
    const langVoice = this.voices.find(v => 
      v.lang.startsWith(this.currentPersonality.lang.split('-')[0])
    );
    if (langVoice) {
      this.selectedVoice = langVoice;
      return;
    }
    
    // Ultimate fallback
    this.selectedVoice = this.voices[0];
  }
  
  /**
   * Check if TTS is supported
   */
  isSupported(): boolean {
    return this.synthesis !== null && this.voices.length > 0;
  }
  
  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }
  
  /**
   * Get available voice personalities
   */
  getPersonalities(): VoicePersonality[] {
    return VOICE_PERSONALITIES;
  }
  
  /**
   * Set voice personality
   */
  setPersonality(personalityId: string): void {
    const personality = VOICE_PERSONALITIES.find(p => p.id === personalityId);
    if (personality) {
      this.currentPersonality = personality;
      this.selectBestVoice();
    }
  }
  
  /**
   * Get current personality
   */
  getCurrentPersonality(): VoicePersonality {
    return this.currentPersonality;
  }
  
  /**
   * Set global playback rate
   */
  setRate(rate: number): void {
    this.globalRate = Math.max(0.5, Math.min(2.0, rate));
    if (this.currentUtterance) {
      this.currentUtterance.rate = this.calculateRate(this.segments[this.currentSegmentIndex]);
    }
  }
  
  /**
   * Get current rate
   */
  getRate(): number {
    return this.globalRate;
  }
  
  /**
   * Set callbacks
   */
  setCallbacks(callbacks: VoiceCallbacks): void {
    this.callbacks = callbacks;
  }
  
  /**
   * Calculate effective rate for a segment
   */
  private calculateRate(segment: TextSegment): number {
    const baseRate = this.currentPersonality.rate * this.globalRate;
    return Math.max(0.5, Math.min(2.0, baseRate * segment.speedModifier));
  }
  
  /**
   * Calculate effective pitch for a segment
   */
  private calculatePitch(segment: TextSegment): number {
    const basePitch = this.currentPersonality.pitch;
    // Convert semitones to pitch multiplier (semitone = 2^(1/12))
    const semitoneMultiplier = Math.pow(2, segment.pitchShift / 12);
    return Math.max(0.5, Math.min(2.0, basePitch * semitoneMultiplier));
  }
  
  /**
   * Get current playback state
   */
  private getState(): PlaybackState {
    const elapsed = this.isPlaying && !this.isPaused
      ? this.accumulatedTime + (Date.now() - this.startTime) / 1000
      : this.accumulatedTime;
    
    const totalTime = this.processedText?.metadata.estimatedDuration || 0;
    const progress = totalTime > 0 ? (elapsed / totalTime) * 100 : 0;
    
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentSegmentIndex: this.currentSegmentIndex,
      totalSegments: this.segments.length,
      currentTime: elapsed,
      totalTime,
      currentText: this.segments[this.currentSegmentIndex]?.text || '',
      progress: Math.min(100, progress),
    };
  }
  
  /**
   * Emit state change
   */
  private emitStateChange(): void {
    this.callbacks.onStateChange?.(this.getState());
  }
  
  /**
   * Start progress tracking
   */
  private startProgressTracking(): void {
    this.stopProgressTracking();
    this.progressInterval = window.setInterval(() => {
      this.emitStateChange();
    }, 100);
  }
  
  /**
   * Stop progress tracking
   */
  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
  
  /**
   * Create utterance for a segment
   */
  private createUtterance(segment: TextSegment): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(segment.text);
    
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    
    utterance.rate = this.calculateRate(segment);
    utterance.pitch = this.calculatePitch(segment);
    utterance.volume = this.currentPersonality.volume;
    utterance.lang = this.currentPersonality.lang;
    
    return utterance;
  }
  
  /**
   * Speak the next segment
   */
  private speakNextSegment(): void {
    if (!this.synthesis || this.currentSegmentIndex >= this.segments.length) {
      this.handleComplete();
      return;
    }
    
    if (this.isPaused) {
      return;
    }
    
    const segment = this.segments[this.currentSegmentIndex];
    this.callbacks.onSegmentStart?.(segment, this.currentSegmentIndex);
    
    const utterance = this.createUtterance(segment);
    this.currentUtterance = utterance;
    
    utterance.onend = () => {
      this.callbacks.onSegmentEnd?.(segment, this.currentSegmentIndex);
      this.currentSegmentIndex++;
      
      // Apply pause after segment
      if (segment.pauseAfter > 0 && this.currentSegmentIndex < this.segments.length) {
        setTimeout(() => {
          this.speakNextSegment();
        }, segment.pauseAfter / this.globalRate);
      } else {
        this.speakNextSegment();
      }
    };
    
    utterance.onerror = (event) => {
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        this.callbacks.onError?.(new Error(`Speech synthesis error: ${event.error}`));
      }
    };
    
    this.synthesis.speak(utterance);
  }
  
  /**
   * Handle playback completion
   */
  private handleComplete(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.stopProgressTracking();
    this.emitStateChange();
    this.callbacks.onComplete?.();
  }
  
  /**
   * Preprocess and prepare text for speech
   */
  prepareText(rawText: string): ProcessedText {
    this.processedText = preprocessText(rawText);
    this.segments = this.processedText.segments;
    return this.processedText;
  }
  
  /**
   * Start speaking
   */
  speak(options: {
    text: string;
    startPosition?: number; // 0 to 1
    onProgress?: (progress: { currentTime: number; totalTime: number }) => void;
    onEnd?: () => void;
  }): void {
    if (!this.synthesis) {
      this.callbacks.onError?.(new Error('Speech synthesis not supported'));
      return;
    }
    
    // Stop any current playback
    this.stop();
    
    // Prepare text
    this.prepareText(options.text);
    
    if (this.segments.length === 0) {
      this.callbacks.onError?.(new Error('No speakable text found'));
      return;
    }
    
    // Set up legacy callbacks for compatibility
    if (options.onProgress) {
      const existingCallback = this.callbacks.onStateChange;
      this.callbacks.onStateChange = (state) => {
        existingCallback?.(state);
        options.onProgress?.({
          currentTime: state.currentTime,
          totalTime: state.totalTime,
        });
      };
    }
    if (options.onEnd) {
      const existingCallback = this.callbacks.onComplete;
      this.callbacks.onComplete = () => {
        existingCallback?.();
        options.onEnd?.();
      };
    }
    
    // Calculate starting segment from position
    if (options.startPosition && options.startPosition > 0) {
      this.currentSegmentIndex = Math.floor(options.startPosition * this.segments.length);
      this.accumulatedTime = options.startPosition * (this.processedText?.metadata.estimatedDuration || 0);
    } else {
      this.currentSegmentIndex = 0;
      this.accumulatedTime = 0;
    }
    
    // Start playback
    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = Date.now();
    
    this.startProgressTracking();
    this.emitStateChange();
    this.speakNextSegment();
  }
  
  /**
   * Pause playback
   */
  pause(): void {
    if (!this.synthesis || !this.isPlaying || this.isPaused) return;
    
    this.isPaused = true;
    this.pausedTime = Date.now();
    this.accumulatedTime += (this.pausedTime - this.startTime) / 1000;
    this.synthesis.cancel();
    
    this.stopProgressTracking();
    this.emitStateChange();
  }
  
  /**
   * Resume playback
   */
  resume(): void {
    if (!this.synthesis || !this.isPlaying || !this.isPaused) return;
    
    this.isPaused = false;
    this.startTime = Date.now();
    
    this.startProgressTracking();
    this.emitStateChange();
    this.speakNextSegment();
  }
  
  /**
   * Toggle play/pause
   */
  togglePlayPause(): void {
    if (this.isPaused) {
      this.resume();
    } else if (this.isPlaying) {
      this.pause();
    }
  }
  
  /**
   * Stop playback
   */
  stop(): void {
    if (!this.synthesis) return;
    
    this.synthesis.cancel();
    this.isPlaying = false;
    this.isPaused = false;
    this.currentSegmentIndex = 0;
    this.accumulatedTime = 0;
    this.currentUtterance = null;
    
    this.stopProgressTracking();
    this.emitStateChange();
  }
  
  /**
   * Seek to position
   */
  seekTo(position: number): void {
    if (!this.processedText || this.segments.length === 0) return;
    
    const wasPlaying = this.isPlaying && !this.isPaused;
    this.synthesis?.cancel();
    
    // Calculate segment from position (0 to 1)
    const normalizedPosition = Math.max(0, Math.min(1, position));
    this.currentSegmentIndex = Math.floor(normalizedPosition * this.segments.length);
    this.accumulatedTime = normalizedPosition * this.processedText.metadata.estimatedDuration;
    
    if (wasPlaying) {
      this.startTime = Date.now();
      this.speakNextSegment();
    }
    
    this.emitStateChange();
  }
  
  /**
   * Skip forward by seconds
   */
  skipForward(seconds: number): void {
    if (!this.processedText) return;
    
    const totalTime = this.processedText.metadata.estimatedDuration;
    const currentTime = this.getState().currentTime;
    const newPosition = Math.min(1, (currentTime + seconds) / totalTime);
    this.seekTo(newPosition);
  }
  
  /**
   * Skip backward by seconds
   */
  skipBackward(seconds: number): void {
    if (!this.processedText) return;
    
    const totalTime = this.processedText.metadata.estimatedDuration;
    const currentTime = this.getState().currentTime;
    const newPosition = Math.max(0, (currentTime - seconds) / totalTime);
    this.seekTo(newPosition);
  }
  
  /**
   * Get current state
   */
  getCurrentState(): PlaybackState {
    return this.getState();
  }
  
  /**
   * Get processed text metadata
   */
  getMetadata(): ProcessedText['metadata'] | null {
    return this.processedText?.metadata || null;
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.stopProgressTracking();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
export const studyWaveVoice = new StudyWaveVoiceEngine();

// Export class for testing
export { StudyWaveVoiceEngine };
