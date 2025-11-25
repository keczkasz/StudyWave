import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert mx-auto">
          <h1 className="text-4xl sm:text-5xl font-playfair text-foreground mb-6 tracking-tight">Privacy Policy</h1>
          
          <p className="text-muted-foreground mb-6">
            <strong>Last Updated:</strong> January 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-muted-foreground">
              Welcome to StudyWave ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our PDF to audiobook conversion service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">2.1 Personal Information</h3>
            <p className="text-muted-foreground mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="text-muted-foreground mb-4 space-y-2">
              <li>Account information (email address, full name)</li>
              <li>Payment information (processed securely through third-party payment processors)</li>
              <li>Profile preferences and settings</li>
              <li>Waitlist signup information</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">2.2 Content Data</h3>
            <p className="text-muted-foreground mb-4">
              When you use our service, we collect and process:
            </p>
            <ul className="text-muted-foreground mb-4 space-y-2">
              <li>PDF documents you upload for conversion</li>
              <li>Text extracted from your PDFs</li>
              <li>Generated audio files</li>
              <li>Playback preferences (speed, position)</li>
              <li>Usage statistics (listening time, library size)</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">2.3 Technical Information</h3>
            <p className="text-muted-foreground mb-4">
              We automatically collect certain technical information, including:
            </p>
            <ul className="text-muted-foreground mb-4 space-y-2">
              <li>Device information and browser type</li>
              <li>IP address and location data</li>
              <li>Usage patterns and interactions with our service</li>
              <li>Error logs and performance data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">
              We use the collected information for the following purposes:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li><strong>Service Delivery:</strong> To process your PDFs, generate audiobooks, and provide core functionality</li>
              <li><strong>Account Management:</strong> To create and maintain your account, authenticate you, and manage your preferences</li>
              <li><strong>Improvement:</strong> To analyze usage patterns, improve our algorithms, and enhance user experience</li>
              <li><strong>Communication:</strong> To send service updates, respond to inquiries, and provide customer support</li>
              <li><strong>Security:</strong> To protect against fraud, unauthorized access, and ensure platform security</li>
              <li><strong>Legal Compliance:</strong> To comply with legal obligations and enforce our terms of service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Data Storage and Security</h2>
            <p className="text-muted-foreground mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="text-muted-foreground mb-4 space-y-2">
              <li>Encrypted data transmission (SSL/TLS)</li>
              <li>Secure cloud storage with access controls</li>
              <li>Regular security audits and updates</li>
              <li>Password protection with leaked password detection</li>
              <li>Row-level security policies on database tables</li>
            </ul>
            <p className="text-muted-foreground">
              Your files are stored securely in our cloud infrastructure. We retain your content for as long as your account is active or as needed to provide our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Third-Party Services</h2>
            <p className="text-muted-foreground mb-4">
              We use trusted third-party services to operate our platform:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li><strong>Authentication:</strong> Secure user authentication and session management</li>
              <li><strong>Cloud Storage:</strong> File storage and database services</li>
              <li><strong>Payment Processing:</strong> Secure payment processing (we do not store credit card information)</li>
              <li><strong>AI Services:</strong> Text-to-speech conversion and OCR processing</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              These third parties have access to your information only to perform specific tasks on our behalf and are obligated to protect your data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Your Privacy Rights</h2>
            <p className="text-muted-foreground mb-4">
              You have the following rights regarding your personal data:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
              <li><strong>Export:</strong> Download your content and data in a portable format</li>
              <li><strong>Objection:</strong> Object to certain processing of your data</li>
              <li><strong>Restriction:</strong> Request limitation of data processing</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To exercise these rights, please contact us through the settings page or via email.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your information for as long as necessary to provide our services and comply with legal obligations. When you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal, tax, or regulatory purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Cookies and Tracking</h2>
            <p className="text-muted-foreground mb-4">
              We use essential cookies and similar technologies to:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>Maintain your session and authentication state</li>
              <li>Remember your preferences and settings</li>
              <li>Analyze usage patterns and improve our service</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You can control cookies through your browser settings, though some features may not function properly without them.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. International Data Transfers</h2>
            <p className="text-muted-foreground">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last Updated" date. Your continued use of our service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us through your account settings.
            </p>
          </section>

          <section className="mb-8 p-6 bg-muted/50 rounded-lg border border-border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Copyright Notice</h2>
            <p className="text-muted-foreground lowercase">
              copyright © 2025 dawid konopka. all rights reserved.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;