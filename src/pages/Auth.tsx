import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Headphones } from "lucide-react";
import authBg from "@/assets/auth-bg.png";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email must be less than 255 characters"),
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email must be less than 255 characters"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be less than 72 characters"),
  fullName: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email must be less than 255 characters"),
});

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
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
    
    // Validate inputs
    const validation = signInSchema.safeParse({ email, password });
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(", ");
      toast({
        title: "Validation Error",
        description: errors,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: validation.data.email,
      password: validation.data.password,
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
    
    // Validate inputs
    const validation = signUpSchema.safeParse({ email, password, fullName });
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(", ");
      toast({
        title: "Validation Error",
        description: errors,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: validation.data.fullName,
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const validation = resetPasswordSchema.safeParse({ email: resetEmail });
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(", ");
      toast({
        title: "Validation Error",
        description: errors,
        variant: "destructive",
      });
      return;
    }
    
    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(validation.data.email, {
      redirectTo: `${window.location.origin}/`,
    });

    if (error) {
      toast({
        title: "Error sending reset email",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Reset email sent!",
        description: "Check your email for the password reset link.",
      });
      setIsResetDialogOpen(false);
      setResetEmail("");
    }
    setResetLoading(false);
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

            <TabsContent value="signin" className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-gray-700 font-medium">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/70 border-gray-300 focus:border-gray-500 focus:ring-gray-500 text-gray-900 transition-colors"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-gray-700 font-medium">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/70 border-gray-300 focus:border-gray-500 focus:ring-gray-500 text-gray-900 transition-colors"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full bg-[#475569] hover:bg-[#334155] text-white shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              
              <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" className="w-full text-gray-600 hover:text-gray-900 text-sm">
                    Forgot Password?
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                      Enter your email address and we'll send you a link to reset your password.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="name@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        disabled={resetLoading}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full"
                    >
                      {resetLoading ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="signup" className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-gray-700 font-medium">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-white/70 border-gray-300 focus:border-gray-500 focus:ring-gray-500 text-gray-900 transition-colors"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-gray-700 font-medium">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/70 border-gray-300 focus:border-gray-500 focus:ring-gray-500 text-gray-900 transition-colors"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-gray-700 font-medium">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/70 border-gray-300 focus:border-gray-500 focus:ring-gray-500 text-gray-900 transition-colors"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleSignUp}
                disabled={loading}
                className="w-full bg-[#475569] hover:bg-[#334155] text-white shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-sm text-white/80 drop-shadow">
            Start listening to your study materials today
          </p>
          <div className="text-xs text-white/70 space-x-2">
            <button
              onClick={() => navigate("/terms")}
              className="hover:text-white/90 drop-shadow transition-colors underline"
            >
              Terms of Service
            </button>
            <span>•</span>
            <button
              onClick={() => navigate("/privacy")}
              className="hover:text-white/90 drop-shadow transition-colors underline"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
