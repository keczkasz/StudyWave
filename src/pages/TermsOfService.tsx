import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="prose prose-sm sm:prose dark:prose-invert max-w-none">
          <h1 className="text-4xl sm:text-5xl font-playfair text-foreground mb-6 tracking-tight">Terms of Service</h1>
          
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using StudyWave (PDF2Audio), you accept and agree to be bound by the terms and 
                provisions of this agreement. If you do not agree to these terms, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. License and Copyright</h2>
              <div className="bg-muted p-6 rounded-lg border border-border">
                <p className="text-muted-foreground lowercase">
                  copyright © 2025 dawid konopka. all rights reserved.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
              <p className="text-muted-foreground mb-4">
                You are responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Ensuring that uploaded content does not violate any copyright or intellectual property rights</li>
                <li>Using the service in compliance with all applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Prohibited Use</h2>
              <p className="text-muted-foreground mb-4">
                You may not:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Attempt to reverse engineer, decompile, or disassemble the service</li>
                <li>Use the service for any illegal or unauthorized purpose</li>
                <li>Transmit any viruses, malware, or other malicious code</li>
                <li>Interfere with or disrupt the service or servers</li>
                <li>Collect or harvest any personally identifiable information from other users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Content Ownership</h2>
              <p className="text-muted-foreground">
                You retain all rights to the content you upload to StudyWave. However, by uploading content, 
                you grant us a limited license to process, store, and convert your files for the sole purpose 
                of providing the text-to-speech service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Service Modifications</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify, suspend, or discontinue any part of the service at any time 
                without prior notice. We will not be liable to you or any third party for any modification, 
                suspension, or discontinuation of the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground">
                The service is provided "as is" and "as available" without any warranties of any kind, either 
                express or implied, including but not limited to warranties of merchantability, fitness for a 
                particular purpose, or non-infringement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                In no event shall Dawid Konopka or StudyWave be liable for any indirect, incidental, special, 
                consequential, or punitive damages, including without limitation, loss of profits, data, use, 
                or other intangible losses resulting from your use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to update or modify these Terms of Service at any time. Your continued 
                use of the service after any such changes constitutes your acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms of Service, please contact us through the 
                application's support channels.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Last updated: January 2025
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
