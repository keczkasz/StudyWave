import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Headphones, Clock, Upload, Crown } from "lucide-react";
import Navigation from "@/components/Navigation";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalPDFs: 0,
    totalAudiobooks: 0,
    totalListeningTime: 0,
  });
  const [recentUploads, setRecentUploads] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadStats(session.user.id);
        loadRecentUploads(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadStats = async (userId: string) => {
    const { data: pdfs } = await supabase
      .from("pdf_documents")
      .select("*")
      .eq("user_id", userId);

    const { data: audiobooks } = await supabase
      .from("audio_files")
      .select("duration_seconds")
      .eq("user_id", userId);

    const totalTime = audiobooks?.reduce((sum, a) => sum + (a.duration_seconds || 0), 0) || 0;

    setStats({
      totalPDFs: pdfs?.length || 0,
      totalAudiobooks: audiobooks?.length || 0,
      totalListeningTime: Math.floor(totalTime / 60),
    });
  };

  const loadRecentUploads = async (userId: string) => {
    const { data } = await supabase
      .from("pdf_documents")
      .select("*")
      .eq("user_id", userId)
      .order("upload_date", { ascending: false })
      .limit(5);

    setRecentUploads(data || []);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-6xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Welcome back!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Transform your PDFs into audiobooks with ease
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total PDFs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalPDFs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Audiobooks</CardTitle>
              <Headphones className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalAudiobooks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Listening Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalListeningTime}</div>
              <p className="text-xs text-muted-foreground mt-1">minutes</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center mb-8">
          <Button
            size="lg"
            onClick={() => navigate("/upload")}
            className="gap-2"
          >
            <Upload className="h-5 w-5" />
            Upload New PDF
          </Button>
        </div>

        {recentUploads.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Recent Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {recentUploads.map((pdf) => (
                  <div
                    key={pdf.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary cursor-pointer"
                    onClick={() => navigate(`/library`)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{pdf.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(pdf.upload_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        pdf.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : pdf.status === "processing"
                          ? "bg-yellow-100 text-yellow-800"
                          : pdf.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {pdf.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Choose Your Plan Card */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Upgrade to Premium</CardTitle>
                <CardDescription>
                  Unlock unlimited audiobooks, faster processing, and premium features
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full sm:w-auto" 
              onClick={() => navigate("/pricing")}
            >
              Choose Your Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
