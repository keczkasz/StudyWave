import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Home, Upload, Library, LogOut, Settings, CreditCard } from "lucide-react";

// Utility function moved outside to prevent recreation
const getInitials = (email: string) => email.substring(0, 2).toUpperCase();

const Navigation = memo(() => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || "");
    };
    getUserEmail();
  }, []);

  // Memoize navigation handlers
  const navigateToDashboard = useCallback(() => navigate("/dashboard"), [navigate]);
  const navigateToUpload = useCallback(() => navigate("/upload"), [navigate]);
  const navigateToLibrary = useCallback(() => navigate("/library"), [navigate]);
  
  const navigateToSettings = useCallback(() => {
    setOpen(false);
    navigate("/settings");
  }, [navigate]);
  
  const navigateToPricing = useCallback(() => {
    setOpen(false);
    navigate("/pricing");
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setOpen(false);
    navigate("/");
  }, [navigate]);

  // Memoize initials
  const initials = useMemo(() => getInitials(userEmail), [userEmail]);

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-4 sm:gap-8">
            <h1
              className="text-lg sm:text-xl font-bold text-primary cursor-pointer"
              onClick={navigateToDashboard}
            >
              PDF2Audio
            </h1>
            <div className="hidden md:flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                className="gap-2"
                onClick={navigateToDashboard}
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className="gap-2"
                onClick={navigateToUpload}
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
              <Button
                variant="ghost"
                className="gap-2"
                onClick={navigateToLibrary}
              >
                <Library className="h-4 w-4" />
                Library
              </Button>
            </div>
          </div>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt={userEmail} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end">
              <div className="flex flex-col space-y-1 mb-3">
                <p className="text-sm font-medium">{userEmail}</p>
              </div>
              <Separator className="mb-2" />
              <div className="flex flex-col space-y-1">
                <Button
                  variant="ghost"
                  className="justify-start gap-2 w-full"
                  onClick={navigateToSettings}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-2 w-full"
                  onClick={navigateToPricing}
                >
                  <CreditCard className="h-4 w-4" />
                  Choose Your Plan
                </Button>
              </div>
              <Separator className="my-2" />
              <Button
                variant="ghost"
                className="justify-start gap-2 w-full text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </nav>
  );
});

Navigation.displayName = "Navigation";

export default Navigation;
