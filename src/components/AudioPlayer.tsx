import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Mic,
  Waves,
  Sparkles,
  Globe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  studyWaveVoice, 
  VOICE_PERSONALITIES, 
  VoicePersonality,
  PlaybackState 
} from "@/services/studyWaveVoice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AudioPlayerProps {
  audioData: {
    id: string;
    extracted_text: string | null;
    last_position_seconds: number | null;
    duration_seconds: number | null;
    playback_speed: number | null;
    total_listened_seconds?: number | null;
  };
}

const AudioPlayer = ({ audioData }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(audioData.last_position_seconds || 0);
  const [duration, setDuration] = useState(audioData.duration_seconds || 0);
  const [playbackSpeed, setPlaybackSpeed] = useState(audioData.playback_speed || 1.0);
  const [selectedPersonality, setSelectedPersonality] = useState<VoicePersonality>(VOICE_PERSONALITIES[0]);
  const [currentText, setCurrentText] = useState<string>("");
  const [isVoiceReady, setIsVoiceReady] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<'en' | 'pl'>('en');
  const [showWaveform, setShowWaveform] = useState(false);
  
  const playbackStartTimeRef = useRef<number>(0);
  const actualPlaybackTimeRef = useRef<number>(0);
  
  const { toast } = useToast();
  const saveIntervalRef = useRef<NodeJS.Timeout>();
  const currentTimeRef = useRef(currentTime);
  const playbackSpeedRef = useRef(playbackSpeed);
  const waveformBarsRef = useRef<number[]>(Array(32).fill(20));
  
  // Keep refs in sync
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // Animate waveform
  useEffect(() => {
    let animationFrame: number;
    
    const animate = () => {
      if (showWaveform) {
        waveformBarsRef.current = waveformBarsRef.current.map(() => 
          Math.random() * 60 + 20
        );
      }
      animationFrame = requestAnimationFrame(animate);
    };
    
    if (showWaveform) {
      animate();
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [showWaveform]);

  // Save progress function using actual playback time
  const saveProgress = useCallback(async () => {
    const currentTotalListened = audioData.total_listened_seconds || 0;
    
    await supabase
      .from("audio_files")
      .update({
        last_position_seconds: currentTimeRef.current,
        playback_speed: playbackSpeedRef.current,
        total_listened_seconds: currentTotalListened + Math.floor(actualPlaybackTimeRef.current),
      })
      .eq("id", audioData.id);
    
    audioData.total_listened_seconds = currentTotalListened + Math.floor(actualPlaybackTimeRef.current);
    actualPlaybackTimeRef.current = 0;
  }, [audioData]);

  // Initialize StudyWaveVoice
  useEffect(() => {
    const checkVoiceSupport = () => {
      if (studyWaveVoice.isSupported()) {
        setIsVoiceReady(true);
        const savedPersonality = localStorage.getItem('studywave-voice-personality');
        if (savedPersonality) {
          const personality = VOICE_PERSONALITIES.find(p => p.id === savedPersonality);
          if (personality) {
            setSelectedPersonality(personality);
            studyWaveVoice.setPersonality(personality.id);
          }
        }
      } else {
        setTimeout(checkVoiceSupport, 500);
      }
    };

    checkVoiceSupport();

    studyWaveVoice.setCallbacks({
      onStateChange: (state: PlaybackState) => {
        setIsPlaying(state.isPlaying);
        setIsPaused(state.isPaused);
        setCurrentTime(state.currentTime);
        setDuration(state.totalTime);
        setCurrentText(state.currentText);
        setShowWaveform(state.isPlaying && !state.isPaused);
        if (state.detectedLanguage) {
          setDetectedLanguage(state.detectedLanguage);
        }
      },
      onComplete: () => {
        setIsPlaying(false);
        setIsPaused(false);
        setShowWaveform(false);
        if (playbackStartTimeRef.current > 0) {
          actualPlaybackTimeRef.current += (Date.now() - playbackStartTimeRef.current) / 1000;
          playbackStartTimeRef.current = 0;
        }
        saveProgress();
      },
      onError: (error) => {
        console.error("Playback error:", error.message);
        toast({
          title: "Playback error",
          description: error.message,
          variant: "destructive",
        });
      },
      onVoicesLoaded: () => {
        setIsVoiceReady(true);
        setAvailableVoices(studyWaveVoice.getAvailableVoices());
      },
      onLanguageDetected: (language, confidence) => {
        setDetectedLanguage(language);
        if (confidence > 0.7) {
          toast({
            title: `Language detected: ${language === 'pl' ? 'Polish' : 'English'}`,
            description: `Confidence: ${Math.round(confidence * 100)}%`,
          });
        }
      },
    });

    if (studyWaveVoice.isSupported()) {
      setAvailableVoices(studyWaveVoice.getAvailableVoices());
    }

    return () => {
      studyWaveVoice.stop();
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [saveProgress, toast]);

  // Track actual playback time
  useEffect(() => {
    if (isPlaying && !isPaused) {
      playbackStartTimeRef.current = Date.now();
      
      saveIntervalRef.current = setInterval(() => {
        if (playbackStartTimeRef.current > 0) {
          actualPlaybackTimeRef.current += (Date.now() - playbackStartTimeRef.current) / 1000;
          playbackStartTimeRef.current = Date.now();
        }
        saveProgress();
      }, 10000);
    } else {
      if (playbackStartTimeRef.current > 0) {
        actualPlaybackTimeRef.current += (Date.now() - playbackStartTimeRef.current) / 1000;
        playbackStartTimeRef.current = 0;
      }
      
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    }

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [isPlaying, isPaused, saveProgress]);

  const togglePlayPause = useCallback(() => {
    if (!audioData.extracted_text) {
      toast({
        title: "No text available",
        description: "This PDF hasn't been processed yet.",
        variant: "destructive",
      });
      return;
    }

    if (!isVoiceReady) {
      toast({
        title: "Voice not ready",
        description: "Please wait for the voice engine to initialize.",
        variant: "destructive",
      });
      return;
    }

    if (isPlaying) {
      if (isPaused) {
        studyWaveVoice.resume();
      } else {
        studyWaveVoice.pause();
      }
    } else {
      actualPlaybackTimeRef.current = 0;
      playbackStartTimeRef.current = Date.now();
      const startPosition = duration > 0 ? currentTime / duration : 0;
      studyWaveVoice.setRate(playbackSpeed);
      studyWaveVoice.speak({
        text: audioData.extracted_text,
        startPosition,
        autoDetectLanguage: true,
      });
    }
  }, [audioData.extracted_text, isPlaying, isPaused, isVoiceReady, currentTime, duration, playbackSpeed, toast]);

  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    studyWaveVoice.setRate(newSpeed);
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (duration > 0) {
      studyWaveVoice.seekTo(newTime / duration);
    }
  };

  const skipTime = (seconds: number) => {
    if (seconds > 0) {
      studyWaveVoice.skipForward(seconds);
    } else {
      studyWaveVoice.skipBackward(Math.abs(seconds));
    }
  };

  const handlePersonalityChange = (personality: VoicePersonality) => {
    setSelectedPersonality(personality);
    setSelectedVoice(null);
    studyWaveVoice.setPersonality(personality.id);
    localStorage.setItem('studywave-voice-personality', personality.id);
    
    toast({
      title: `Voice: ${personality.name}`,
      description: personality.description,
    });
    
    if (isPlaying) {
      const currentPosition = duration > 0 ? currentTime / duration : 0;
      studyWaveVoice.stop();
      setTimeout(() => {
        if (audioData.extracted_text) {
          studyWaveVoice.speak({
            text: audioData.extracted_text,
            startPosition: currentPosition,
            autoDetectLanguage: false,
          });
        }
      }, 100);
    }
  };

  const handleVoiceChange = (voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
    studyWaveVoice.setVoiceDirectly(voice);
    
    toast({
      title: `Voice: ${voice.name}`,
      description: `Language: ${voice.lang}`,
    });
    
    if (isPlaying) {
      const currentPosition = duration > 0 ? currentTime / duration : 0;
      studyWaveVoice.stop();
      setTimeout(() => {
        if (audioData.extracted_text) {
          studyWaveVoice.speak({
            text: audioData.extracted_text,
            startPosition: currentPosition,
            autoDetectLanguage: false,
          });
        }
      }, 100);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get voices grouped by language
  const englishPersonalities = VOICE_PERSONALITIES.filter(p => p.language === 'en');
  const polishPersonalities = VOICE_PERSONALITIES.filter(p => p.language === 'pl');

  // Waveform visualization component
  const WaveformVisualization = () => (
    <div className="flex items-center justify-center gap-[2px] h-12 overflow-hidden">
      {Array.from({ length: 32 }).map((_, i) => (
        <div
          key={i}
          className="w-1 bg-gradient-to-t from-primary to-primary/50 rounded-full transition-all duration-100"
          style={{
            height: showWaveform ? `${waveformBarsRef.current[i]}%` : '20%',
            opacity: showWaveform ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-2xl" />
      
      <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-border p-6 sm:p-8">
        {/* Voice Status & Settings */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isVoiceReady ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
              <Sparkles className={`h-5 w-5 ${isVoiceReady ? 'text-green-500' : 'text-yellow-500'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">StudyWave Voice</p>
              <p className="text-xs text-muted-foreground">
                {isVoiceReady 
                  ? (selectedVoice ? selectedVoice.name : `${selectedPersonality.name} • ${selectedPersonality.style}`) 
                  : 'Initializing...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Language indicator */}
            {isPlaying && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                    detectedLanguage === 'pl' 
                      ? 'bg-red-500/20 text-red-500' 
                      : 'bg-blue-500/20 text-blue-500'
                  }`}>
                    <Globe className="h-3 w-3" />
                    {detectedLanguage === 'pl' ? 'PL' : 'EN'}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {detectedLanguage === 'pl' ? 'Polish detected' : 'English detected'}
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Voice Selector */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent">
                      <Mic className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Choose Voice</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto bg-popover">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Waves className="h-4 w-4" />
                  Voice Selection
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* English Voices */}
                <div className="px-2 py-1">
                  <p className="text-xs font-semibold text-blue-500 mb-1">🇬🇧 English Voices</p>
                </div>
                {englishPersonalities.map((personality) => (
                  <DropdownMenuItem
                    key={personality.id}
                    onClick={() => handlePersonalityChange(personality)}
                    className={`flex flex-col items-start gap-1 py-3 cursor-pointer ${
                      !selectedVoice && selectedPersonality.id === personality.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex flex-col flex-1">
                        <span className="font-medium">{personality.name}</span>
                        <span className="text-xs text-primary/70">{personality.style}</span>
                      </div>
                      {!selectedVoice && selectedPersonality.id === personality.id && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{personality.description}</span>
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator />
                
                {/* Polish Voices */}
                <div className="px-2 py-1">
                  <p className="text-xs font-semibold text-red-500 mb-1">🇵🇱 Polish Voices</p>
                </div>
                {polishPersonalities.map((personality) => (
                  <DropdownMenuItem
                    key={personality.id}
                    onClick={() => handlePersonalityChange(personality)}
                    className={`flex flex-col items-start gap-1 py-3 cursor-pointer ${
                      !selectedVoice && selectedPersonality.id === personality.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex flex-col flex-1">
                        <span className="font-medium">{personality.name}</span>
                        <span className="text-xs text-primary/70">{personality.style}</span>
                      </div>
                      {!selectedVoice && selectedPersonality.id === personality.id && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{personality.description}</span>
                  </DropdownMenuItem>
                ))}
                
                {/* All Available Browser Voices */}
                {availableVoices.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">All System Voices</p>
                    </div>
                    {availableVoices.map((voice, idx) => (
                      <DropdownMenuItem
                        key={`${voice.name}-${idx}`}
                        onClick={() => handleVoiceChange(voice)}
                        className={`flex items-center justify-between py-2 cursor-pointer ${
                          selectedVoice?.name === voice.name ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-medium">{voice.name}</span>
                          <span className="text-xs text-muted-foreground">{voice.lang}</span>
                        </div>
                        {selectedVoice?.name === voice.name && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Waveform Visualization */}
        <div className="h-16 mb-6 bg-black/10 dark:bg-white/5 rounded-xl flex items-center justify-center overflow-hidden">
          <WaveformVisualization />
        </div>

        {/* Current Text Display */}
        {currentText && showWaveform && (
          <div className="mb-6 p-4 bg-black/5 dark:bg-white/5 rounded-xl">
            <p className="text-sm text-muted-foreground italic line-clamp-2 text-center">
              "{currentText}"
            </p>
          </div>
        )}

        {/* Progress Slider */}
        <div className="space-y-3 mb-6">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="w-full cursor-pointer"
          />
          <div className="flex justify-between text-sm text-muted-foreground font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipTime(-15)}
                className="h-12 w-12 rounded-xl hover:bg-accent transition-all"
              >
                <SkipBack className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back 15s</TooltipContent>
          </Tooltip>

          <Button
            size="icon"
            onClick={togglePlayPause}
            disabled={!isVoiceReady}
            className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            {isPlaying && !isPaused ? (
              <Pause className="h-7 w-7" />
            ) : (
              <Play className="h-7 w-7 ml-1" />
            )}
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipTime(15)}
                className="h-12 w-12 rounded-xl hover:bg-accent transition-all"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Forward 15s</TooltipContent>
          </Tooltip>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground mr-2">Speed:</span>
          {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
            <Button
              key={speed}
              variant={playbackSpeed === speed ? "default" : "ghost"}
              size="sm"
              onClick={() => handleSpeedChange(speed)}
              className={`rounded-lg min-w-[3rem] transition-all ${
                playbackSpeed === speed 
                  ? 'shadow-md' 
                  : 'hover:bg-accent'
              }`}
            >
              {speed}×
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
