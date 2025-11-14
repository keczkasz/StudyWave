import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      toast({
        title: "Error signing up",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created!",
        description: "You can now sign in.",
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-[hsl(var(--auth-bg-start))] via-[hsl(var(--auth-bg-mid))] to-[hsl(var(--auth-bg-end))]">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-glow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-white via-accent to-primary bg-clip-text text-transparent animate-scale-in">
            StudyWave
          </h1>
          <p className="text-lg text-white/60 font-medium">PDF2Audio</p>
          <p className="text-white/80 mt-2">Transform your PDFs into audiobooks</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/5 backdrop-blur-sm border border-white/10">
            <TabsTrigger 
              value="signin"
              className="data-[state=active]:bg-accent/80 data-[state=active]:text-white transition-all duration-300"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger 
              value="signup"
              className="data-[state=active]:bg-accent/80 data-[state=active]:text-white transition-all duration-300"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="animate-fade-in">
            <div className="bg-[hsl(var(--auth-card-bg))]/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/90 font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="bg-white/5 border-[hsl(var(--auth-input-border))] text-white placeholder:text-white/40 
                             focus:border-[hsl(var(--auth-input-focus))] focus:ring-2 focus:ring-[hsl(var(--auth-input-focus))]/50
                             transition-all duration-300 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/90 font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="bg-white/5 border-[hsl(var(--auth-input-border))] text-white placeholder:text-white/40 
                             focus:border-[hsl(var(--auth-input-focus))] focus:ring-2 focus:ring-[hsl(var(--auth-input-focus))]/50
                             transition-all duration-300 backdrop-blur-sm"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-6 
                           transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                           shadow-lg hover:shadow-accent/50"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="animate-fade-in">
            <div className="bg-[hsl(var(--auth-card-bg))]/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fullname" className="text-white/90 font-medium">Full Name</Label>
                  <Input
                    id="fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="John Doe"
                    className="bg-white/5 border-[hsl(var(--auth-input-border))] text-white placeholder:text-white/40 
                             focus:border-[hsl(var(--auth-input-focus))] focus:ring-2 focus:ring-[hsl(var(--auth-input-focus))]/50
                             transition-all duration-300 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-white/90 font-medium">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="bg-white/5 border-[hsl(var(--auth-input-border))] text-white placeholder:text-white/40 
                             focus:border-[hsl(var(--auth-input-focus))] focus:ring-2 focus:ring-[hsl(var(--auth-input-focus))]/50
                             transition-all duration-300 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-white/90 font-medium">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    minLength={6}
                    className="bg-white/5 border-[hsl(var(--auth-input-border))] text-white placeholder:text-white/40 
                             focus:border-[hsl(var(--auth-input-focus))] focus:ring-2 focus:ring-[hsl(var(--auth-input-focus))]/50
                             transition-all duration-300 backdrop-blur-sm"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-6 
                           transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                           shadow-lg hover:shadow-accent/50"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
