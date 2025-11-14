import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ttsService } from "@/services/ttsService";

interface AudioPlayerProps {
  audioData: any;
}

const AudioPlayer = ({ audioData }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(audioData.last_position_seconds || 0);
  const [duration, setDuration] = useState(audioData.duration_seconds || 0);
  const [playbackSpeed, setPlaybackSpeed] = useState(audioData.playback_speed || 1.0);
  const { toast } = useToast();
  const saveIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!ttsService.isSupported()) {
      toast({
        title: "Browser not supported",
        description: "Your browser doesn't support text-to-speech. Please use Chrome, Edge, or Safari.",
        variant: "destructive",
      });
    }

    return () => {
      ttsService.stop();
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      saveIntervalRef.current = setInterval(() => {
        saveProgress();
      }, 10000);
    } else {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    }

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [isPlaying]);

  const saveProgress = async () => {
    await supabase
      .from("audio_files")
      .update({
        last_position_seconds: currentTime,
        playback_speed: playbackSpeed,
      })
      .eq("id", audioData.id);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      ttsService.pause();
      setIsPlaying(false);
    } else {
      if (!audioData.extracted_text) {
        toast({
          title: "No text available",
          description: "This PDF hasn't been processed yet.",
          variant: "destructive",
        });
        return;
      }

      ttsService.speak({
        text: audioData.extracted_text,
        rate: playbackSpeed,
        onProgress: (progress) => {
          setCurrentTime(progress.currentTime);
          setDuration(progress.totalTime);
        },
        onEnd: () => {
          setIsPlaying(false);
          saveProgress();
        },
        startPosition: currentTime,
      });

      setIsPlaying(true);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    if (isPlaying) {
      ttsService.setRate(newSpeed);
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (isPlaying) {
      ttsService.stop();
      setIsPlaying(false);
    }
  };

  const skipTime = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(newTime);
    if (isPlaying) {
      ttsService.stop();
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-card rounded-lg shadow-lg p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => skipTime(-15)}
            className="h-12 w-12"
          >
            <SkipBack className="h-5 w-5" />
          </Button>

          <Button
            size="icon"
            onClick={togglePlayPause}
            className="h-16 w-16 rounded-full"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 ml-1" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => skipTime(15)}
            className="h-12 w-12"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Speed:</span>
          {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
            <Button
              key={speed}
              variant={playbackSpeed === speed ? "default" : "outline"}
              size="sm"
              onClick={() => handleSpeedChange(speed)}
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
