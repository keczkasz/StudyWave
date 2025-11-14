class TTSService {
  private synthesis: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private text: string = "";
  private chunks: string[] = [];
  private currentChunkIndex: number = 0;
  private currentRate: number = 1.0;
  private isPaused: boolean = false;
  private onProgressCallback: ((progress: { currentTime: number; totalTime: number }) => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private startTime: number = 0;
  private elapsedTime: number = 0;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  isSupported(): boolean {
    return this.synthesis !== null;
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

  private speakNextChunk() {
    if (!this.synthesis || this.currentChunkIndex >= this.chunks.length) {
      if (this.onEndCallback) this.onEndCallback();
      return;
    }

    const chunk = this.chunks[this.currentChunkIndex];
    this.utterance = new SpeechSynthesisUtterance(chunk);
    this.utterance.rate = this.currentRate;

    this.utterance.onend = () => {
      this.currentChunkIndex++;
      this.elapsedTime = Date.now() - this.startTime;
      
      if (this.onProgressCallback) {
        const totalDuration = this.estimateDuration(this.text, this.currentRate);
        const progress = (this.currentChunkIndex / this.chunks.length) * totalDuration;
        this.onProgressCallback({
          currentTime: progress,
          totalTime: totalDuration,
        });
      }

      this.speakNextChunk();
    };

    this.synthesis.speak(this.utterance);
  }

  speak(options: {
    text: string;
    rate?: number;
    onProgress?: (progress: { currentTime: number; totalTime: number }) => void;
    onEnd?: () => void;
    startPosition?: number;
  }) {
    if (!this.synthesis) return;

    this.text = options.text;
    this.currentRate = options.rate || 1.0;
    this.onProgressCallback = options.onProgress || null;
    this.onEndCallback = options.onEnd || null;
    this.isPaused = false;

    this.chunks = this.splitIntoChunks(this.text);
    
    const totalDuration = this.estimateDuration(this.text, this.currentRate);
    const startPosition = options.startPosition || 0;
    this.currentChunkIndex = Math.floor((startPosition / totalDuration) * this.chunks.length);

    this.startTime = Date.now();
    this.speakNextChunk();
  }

  pause() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isPaused = true;
    }
  }

  stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.currentChunkIndex = 0;
      this.isPaused = false;
    }
  }

  setRate(rate: number) {
    this.currentRate = rate;
    if (this.utterance && this.synthesis) {
      this.utterance.rate = rate;
    }
  }
}

export const ttsService = new TTSService();
