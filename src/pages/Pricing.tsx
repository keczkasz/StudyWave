import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address").max(255, "Email must be less than 255 characters"),
});

const Pricing = () => {
  const navigate = useNavigate();
  const [waitlistEmail, setWaitlistEmail] = useState("");

  const plans = [
    {
      name: "Free",
      price: "€0",
      period: "forever",
      description: "Perfect for getting started",
      features: [
        "5 PDFs per month",
        "Standard processing speed",
        "Basic audio quality",
        "Web Speech API voices",
      ],
      cta: "Current Plan",
      disabled: true,
    },
    {
      name: "Premium",
      price: "€10",
      period: "per month",
      description: "Unlock all features",
      features: [
        "Unlimited PDFs",
        "Priority processing",
        "High-quality audio",
        "ElevenLabs premium voices",
        "Faster text extraction",
        "Advanced OCR processing",
      ],
      cta: "Sign up for the waiting list",
      disabled: false,
      popular: true,
    },
  ];

  const handleWaitlistSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const validation = waitlistSchema.safeParse({ email: waitlistEmail });
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      return;
    }
    
    // Save to database
    const { error } = await supabase
      .from("waitlist")
      .insert({ email: validation.data.email });
    
    if (error) {
      if (error.code === "23505") { // Unique constraint violation
        toast.error("This email is already on the waiting list");
      } else {
        toast.error("Failed to join waiting list. Please try again.");
      }
      return;
    }
    
    toast.success("Thank you! You've been added to the waiting list.");
    setWaitlistEmail("");
  };

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Select the plan that best fits your needs. Upgrade or downgrade at any time.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? "border-primary shadow-lg scale-105"
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <div className="mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">
                    {plan.period}
                  </span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan.popular ? (
                  <form onSubmit={handleWaitlistSignup} className="space-y-3">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      required
                    />
                    <Button type="submit" className="w-full" variant="default">
                      {plan.cta}
                    </Button>
                  </form>
                ) : (
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={plan.disabled}
                  >
                    {plan.cta}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Need more information? Check out our{" "}
            <Button
              variant="link"
              className="p-0 h-auto font-normal"
              onClick={() => navigate("/settings")}
            >
              settings
            </Button>{" "}
            or contact support.
          </p>
        </div>
      </div>
    </>
  );
};

export default Pricing;
