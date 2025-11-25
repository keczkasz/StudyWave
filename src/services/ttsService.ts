/**
 * Legacy TTS Service
 * 
 * This service is maintained for backward compatibility.
 * For new features, use StudyWaveVoice (studyWaveVoice) instead.
 * 
 * @deprecated Use studyWaveVoice from './studyWaveVoice' for new implementations
 */

import { studyWaveVoice } from './studyWaveVoice';

class TTSService {
  private text: string = "";
  private currentRate: number = 1.0;

  constructor() {
    // Initialize through StudyWaveVoice
  }

  isSupported(): boolean {
    return studyWaveVoice.isSupported() || (typeof window !== "undefined" && "speechSynthesis" in window);
  }

  speak(options: {
    text: string;
    rate?: number;
    onProgress?: (progress: { currentTime: number; totalTime: number }) => void;
    onEnd?: () => void;
    startPosition?: number;
  }) {
    this.text = options.text;
    this.currentRate = options.rate || 1.0;
    
    // Use StudyWaveVoice if available
    if (studyWaveVoice.isSupported()) {
      studyWaveVoice.setRate(this.currentRate);
      
      const totalDuration = this.estimateDuration(this.text, this.currentRate);
      const startPos = options.startPosition ? options.startPosition / totalDuration : 0;
      
      studyWaveVoice.setCallbacks({
        onStateChange: (state) => {
          options.onProgress?.({
            currentTime: state.currentTime,
            totalTime: state.totalTime,
          });
        },
        onComplete: options.onEnd,
      });
      
      studyWaveVoice.speak({
        text: options.text,
        startPosition: startPos,
      });
    }
  }

  private estimateDuration(text: string, rate: number): number {
    const words = text.split(/\s+/).length;
    const wordsPerMinute = 150 * rate;
    return (words / wordsPerMinute) * 60;
  }

  pause() {
    studyWaveVoice.pause();
  }

  stop() {
    studyWaveVoice.stop();
  }

  setRate(rate: number) {
    this.currentRate = rate;
    studyWaveVoice.setRate(rate);
  }
}

export const ttsService = new TTSService();
