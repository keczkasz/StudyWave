import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Headphones } from "lucide-react";
import authBg from "@/assets/auth-bg.png";

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
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${authBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      
      <div className="w-full max-w-md space-y-8 animate-fade-in relative z-10">
        {/* Logo and Title */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg">
              <Headphones className="h-12 w-12 text-white drop-shadow-lg" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg">
            StudyWave
          </h1>
          <p className="text-white/90 drop-shadow">
            Transform PDFs into Audio Books
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-white/85 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100/80">
              <TabsTrigger 
                value="signin"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600 transition-all"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600 transition-all"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

          <TabsContent value="signin" className="animate-fade-in">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/60">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 bg-white/90"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 bg-white/90"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="animate-fade-in">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/60">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium text-foreground">
                    Full Name
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 bg-white/90"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium text-foreground">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 bg-white/90"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 bg-white/90"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </div>
          </TabsContent>
        
        {/* Footer */}
        <p className="text-center text-sm text-white/80 drop-shadow">
          Start listening to your study materials today
        </p>
      </div>
    </div>
  );
};

export default Auth;
