import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Headphones, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-primary/80">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            PDF2Audio
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Transform your academic PDFs into high-quality audiobooks. Study on the go, anywhere, anytime.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6"
          >
            Get Started Free
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 text-center">
            <FileText className="h-12 w-12 text-white mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Upload PDFs
            </h3>
            <p className="text-white/80">
              Simply upload your PDF documents and let us handle the rest
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 text-center">
            <Zap className="h-12 w-12 text-white mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Smart Processing
            </h3>
            <p className="text-white/80">
              Advanced OCR and text extraction for any PDF quality
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 text-center">
            <Headphones className="h-12 w-12 text-white mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Listen Anywhere
            </h3>
            <p className="text-white/80">
              Play your audiobooks with customizable speed controls
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
