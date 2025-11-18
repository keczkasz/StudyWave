import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Home, Upload, Library, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const Navigation = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <h1
              className="text-xl font-bold text-primary cursor-pointer"
              onClick={() => navigate("/dashboard")}
            >
              PDF2Audio
            </h1>
            <div className="hidden md:flex items-center gap-4">
              <Button
                variant="ghost"
                className="gap-2 hover:bg-auth-card-bg/10 transition-colors"
                onClick={() => navigate("/dashboard")}
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className="gap-2 hover:bg-auth-card-bg/10 transition-colors"
                onClick={() => navigate("/upload")}
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
              <Button
                variant="ghost"
                className="gap-2 hover:bg-auth-card-bg/10 transition-colors"
                onClick={() => navigate("/library")}
              >
                <Library className="h-4 w-4" />
                Library
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
