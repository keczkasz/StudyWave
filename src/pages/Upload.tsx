import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import PDFUploader from "@/components/PDFUploader";

const Upload = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Upload PDF</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Upload your PDF files to convert them into audiobooks
          </p>
        </div>
        <PDFUploader />
      </div>
    </div>
  );
};

export default Upload;
