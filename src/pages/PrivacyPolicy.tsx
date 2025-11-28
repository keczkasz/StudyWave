import Navigation from "@/components/Navigation";
import { Shield } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent mb-4">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: November 2024</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section className="bg-card rounded-lg p-6 border">
            <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide directly to us, such as when you create an account, 
              upload documents, or contact us for support. This may include your email address, 
              uploaded PDF documents, and usage preferences.
            </p>
          </section>

          <section className="bg-card rounded-lg p-6 border">
            <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground">
              We use the information we collect to provide, maintain, and improve our services, 
              including converting your PDF documents to audio format. We do not sell your personal 
              information to third parties.
            </p>
          </section>

          <section className="bg-card rounded-lg p-6 border">
            <h2 className="text-xl font-semibold mb-4">3. Data Storage and Security</h2>
            <p className="text-muted-foreground">
              Your documents and audio files are stored securely using industry-standard encryption. 
              We implement appropriate technical and organizational measures to protect your personal 
              data against unauthorized access, alteration, or destruction.
            </p>
          </section>

          <section className="bg-card rounded-lg p-6 border">
            <h2 className="text-xl font-semibold mb-4">4. Your Rights</h2>
            <p className="text-muted-foreground">
              You have the right to access, correct, or delete your personal information at any time. 
              You can manage your data through your account settings or by contacting our support team.
            </p>
          </section>

          <section className="bg-card rounded-lg p-6 border">
            <h2 className="text-xl font-semibold mb-4">5. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us through our 
              support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
