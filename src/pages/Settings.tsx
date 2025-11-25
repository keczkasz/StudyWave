import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { z } from "zod";
import { 
  studyWaveVoice, 
  VOICE_PERSONALITIES, 
  VoicePersonality 
} from "@/services/studyWaveVoice";
import { 
  Mic, 
  Volume2, 
  Gauge, 
  Waves, 
  Play, 
  Check,
  Sparkles,
  AudioLines
} from "lucide-react";

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Name cannot be empty").max(100, "Name must be less than 100 characters"),
});

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [fullName, setFullName] = useState("");
  
  // Voice settings
  const [selectedVoice, setSelectedVoice] = useState<VoicePersonality>(VOICE_PERSONALITIES[0]);
  const [defaultSpeed, setDefaultSpeed] = useState(1.0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [isVoiceReady, setIsVoiceReady] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setUserEmail(user.email || "");
      
      // Load profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        setFullName(profile.full_name || "");
      }
    };
    checkUser();
    
    // Load saved voice settings
    const savedPersonality = localStorage.getItem('studywave-voice-personality');
    const savedSpeed = localStorage.getItem('studywave-default-speed');
    
    if (savedPersonality) {
      const personality = VOICE_PERSONALITIES.find(p => p.id === savedPersonality);
      if (personality) {
        setSelectedVoice(personality);
        studyWaveVoice.setPersonality(personality.id);
      }
    }
    
    if (savedSpeed) {
      const speed = parseFloat(savedSpeed);
      if (!isNaN(speed)) {
        setDefaultSpeed(speed);
        studyWaveVoice.setRate(speed);
      }
    }
    
    // Check if voice engine is ready
    const checkVoice = () => {
      if (studyWaveVoice.isSupported()) {
        setIsVoiceReady(true);
      } else {
        setTimeout(checkVoice, 500);
      }
    };
    checkVoice();
    
    // Cleanup
    return () => {
      studyWaveVoice.stop();
    };
  }, [navigate]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;
    
    // Validate input
    const validation = profileSchema.safeParse({ fullName });
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: validation.data.fullName })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
    }
    setLoading(false);
  };
  
  const handleVoiceSelect = (personality: VoicePersonality) => {
    setSelectedVoice(personality);
    studyWaveVoice.setPersonality(personality.id);
    localStorage.setItem('studywave-voice-personality', personality.id);
    toast.success(`Voice changed to ${personality.name}`);
  };
  
  const handleSpeedChange = (value: number[]) => {
    const speed = value[0];
    setDefaultSpeed(speed);
    studyWaveVoice.setRate(speed);
    localStorage.setItem('studywave-default-speed', speed.toString());
  };
  
  const previewVoice = (personality: VoicePersonality) => {
    if (previewPlaying) {
      studyWaveVoice.stop();
      setPreviewPlaying(false);
      return;
    }
    
    studyWaveVoice.setPersonality(personality.id);
    studyWaveVoice.setRate(defaultSpeed);
    
    const previewText = `Hello! I'm ${personality.name}. ${personality.description}. I'll be reading your documents in this voice.`;
    
    setPreviewPlaying(true);
    
    studyWaveVoice.setCallbacks({
      onComplete: () => {
        setPreviewPlaying(false);
        // Restore selected voice
        studyWaveVoice.setPersonality(selectedVoice.id);
      },
      onError: () => {
        setPreviewPlaying(false);
        toast.error("Failed to preview voice");
      },
    });
    
    studyWaveVoice.speak({ text: previewText });
  };

  const getStyleColor = (style: string) => {
    switch (style) {
      case 'narrative': return 'from-purple-500 to-pink-500';
      case 'professional': return 'from-blue-500 to-cyan-500';
      case 'conversational': return 'from-green-500 to-emerald-500';
      case 'neutral': return 'from-gray-500 to-slate-500';
      default: return 'from-primary to-primary/80';
    }
  };

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Settings</h1>

        <Tabs defaultValue="profile" className="max-w-4xl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <AudioLines className="h-4 w-4" />
              Voice
            </TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and email preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userEmail}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <Button onClick={handleUpdateProfile} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="voice" className="mt-6 space-y-6">
            {/* Voice Engine Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  StudyWave Voice Engine
                </CardTitle>
                <CardDescription>
                  Our natural language TTS engine reads your PDFs with human-like clarity and expression
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`flex items-center gap-3 p-4 rounded-lg ${isVoiceReady ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                  <div className={`h-3 w-3 rounded-full ${isVoiceReady ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                  <span className={`font-medium ${isVoiceReady ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                    {isVoiceReady ? 'Voice Engine Ready' : 'Initializing Voice Engine...'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Voice Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Voice Personality
                </CardTitle>
                <CardDescription>
                  Choose a voice that matches your listening preference
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {VOICE_PERSONALITIES.map((personality) => (
                    <div
                      key={personality.id}
                      onClick={() => handleVoiceSelect(personality)}
                      className={`relative overflow-hidden rounded-xl border-2 p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                        selectedVoice.id === personality.id
                          ? 'border-primary bg-primary/5 shadow-lg'
                          : 'border-border hover:border-primary/50 bg-card'
                      }`}
                    >
                      {/* Gradient accent */}
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getStyleColor(personality.style)}`} />
                      
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{personality.name}</h3>
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            {personality.style}
                          </span>
                        </div>
                        {selectedVoice.id === personality.id && (
                          <div className="bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {personality.description}
                      </p>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          previewVoice(personality);
                        }}
                        disabled={!isVoiceReady}
                        className="w-full"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {previewPlaying ? 'Stop Preview' : 'Preview Voice'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Playback Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Default Playback Speed
                </CardTitle>
                <CardDescription>
                  Set your preferred reading speed for all documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Speed</span>
                    <span className="font-mono font-bold text-lg">{defaultSpeed.toFixed(2)}×</span>
                  </div>
                  <Slider
                    value={[defaultSpeed]}
                    min={0.5}
                    max={2}
                    step={0.05}
                    onValueChange={handleSpeedChange}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0.5× Slower</span>
                    <span>1× Normal</span>
                    <span>2× Faster</span>
                  </div>
                </div>
                
                {/* Quick speed buttons */}
                <div className="flex flex-wrap gap-2">
                  {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((speed) => (
                    <Button
                      key={speed}
                      variant={defaultSpeed === speed ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSpeedChange([speed])}
                      className="flex-1 min-w-[4rem]"
                    >
                      {speed}×
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Voice Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Waves className="h-5 w-5" />
                  Voice Features
                </CardTitle>
                <CardDescription>
                  Advanced features powered by StudyWave Voice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <h4 className="font-semibold mb-1">Natural Prosody</h4>
                    <p className="text-sm text-muted-foreground">
                      Intelligent pitch and rhythm variations for lifelike reading
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                    <h4 className="font-semibold mb-1">PDF Optimization</h4>
                    <p className="text-sm text-muted-foreground">
                      Automatic cleanup of PDF artifacts for smooth playback
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <h4 className="font-semibold mb-1">Smart Abbreviations</h4>
                    <p className="text-sm text-muted-foreground">
                      Expands abbreviations and numbers for natural speech
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20">
                    <h4 className="font-semibold mb-1">Sentence Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      Detects questions, exclamations, and emphasis points
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>
                  Manage your subscription and billing information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Current Plan</span>
                    <span className="text-primary font-bold">Free</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    You are currently on the Free plan. Upgrade to Premium to unlock unlimited features.
                  </p>
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => navigate("/pricing")}
                  >
                    Upgrade to Premium
                  </Button>
                </div>
                
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">Billing History</h3>
                  <p className="text-sm text-muted-foreground">
                    No billing history available. Subscribe to Premium to see your billing information.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Settings;
