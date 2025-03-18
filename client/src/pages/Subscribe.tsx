import { useState, useEffect } from "react";
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import SubscriptionModal from "@/components/subscription/SubscriptionModal";
import StripePaymentForm from "@/components/subscription/StripePaymentForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckIcon, ArrowLeft, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Try to load Stripe outside of component render for better performance
let stripePromise: ReturnType<typeof loadStripe> | null = null;

try {
  if (import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
    console.log("Stripe initialized with public key");
  } else {
    console.warn('Missing Stripe public key. Stripe functionality will not work.');
  }
} catch (error) {
  console.error('Error initializing Stripe:', error);
}

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<{ type: string, price: string, priceId: string, duration: string } | null>(null);
  const { toast } = useToast();
  const { isAuthenticated, isLoading, refreshSubscription } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Check for successful subscription return from Stripe
  useEffect(() => {
    // Check for subscription status in URL
    if (location.includes('subscription=success')) {
      toast({
        title: "Subscription Active",
        description: "Thank you for subscribing to PoesisVerse!",
      });
      
      // Refresh subscription status
      refreshSubscription();
      
      // Clear URL parameter by navigating to the base path without the query
      setLocation(location.split('?')[0]);
    }
  }, [toast, refreshSubscription, location, setLocation]);
  
  const handleSelectPlan = async (planType: 'monthly' | 'annual') => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in or sign up to subscribe",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedPlan({
      type: planType === 'monthly' ? 'Monthly' : 'Annual',
      price: planType === 'monthly' ? '$5.99/month' : '$49.99/year',
      priceId: planType,
      duration: planType === 'monthly' ? '1 month' : '1 year'
    });
    
    setShowPlanModal(false);
    
    try {
      // Create subscription intent
      const response = await apiRequest("POST", "/api/create-subscription", {
        planType
      });
      
      const data = await response.json();
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        throw new Error("No client secret returned");
      }
    } catch (error: any) {
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to initialize subscription",
        variant: "destructive",
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Header />
      
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/" className="text-neutral-600 hover:text-primary flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to poems
            </Link>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Subscribe to PoesisVerse</CardTitle>
              <CardDescription>Unlock our complete collection of beautiful poetry</CardDescription>
            </CardHeader>
            
            <CardContent>
              {!stripePromise ? (
                <div className="py-4">
                  <Alert variant="destructive" className="mb-8">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Subscription Service Unavailable</AlertTitle>
                    <AlertDescription>
                      Our payment system is currently unavailable. Please try again later or contact support.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="text-center">
                    <p className="mb-4">Unable to load subscription options due to configuration issues.</p>
                    <Button 
                      variant="outline" 
                      onClick={() => setLocation('/')}
                      className="mx-auto"
                    >
                      Return to Home
                    </Button>
                  </div>
                </div>
              ) : !selectedPlan ? (
                <>
                  <div className="mb-8">
                    <h3 className="font-heading text-xl mb-2">Choose Your Subscription Plan</h3>
                    <p className="text-neutral-600">Get unlimited access to all our premium poetry content.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Monthly plan */}
                    <div className="border border-neutral-200 rounded-lg overflow-hidden hover:shadow-medium transition-shadow">
                      <div className="p-6 bg-secondary/10">
                        <h3 className="font-heading font-semibold text-lg mb-1">Monthly</h3>
                        <div className="flex items-end mb-3">
                          <span className="text-3xl font-bold">$5.99</span>
                          <span className="text-neutral-600 ml-1">/month</span>
                        </div>
                        <p className="text-sm text-neutral-600">Billed monthly, cancel anytime.</p>
                      </div>
                      <div className="p-6">
                        <ul className="space-y-3">
                          <li className="flex items-start">
                            <CheckIcon className="text-accent h-5 w-5 mt-0.5 mr-3" />
                            <span>Full access to all poems</span>
                          </li>
                          <li className="flex items-start">
                            <CheckIcon className="text-accent h-5 w-5 mt-0.5 mr-3" />
                            <span>High-resolution images</span>
                          </li>
                          <li className="flex items-start">
                            <CheckIcon className="text-accent h-5 w-5 mt-0.5 mr-3" />
                            <span>No advertisements</span>
                          </li>
                        </ul>
                        <Button 
                          className="w-full mt-6 bg-primary hover:bg-primary-dark text-white"
                          onClick={() => handleSelectPlan('monthly')}
                        >
                          Subscribe Monthly
                        </Button>
                      </div>
                    </div>
                    
                    {/* Annual plan */}
                    <div className="border-2 border-primary rounded-lg overflow-hidden relative hover:shadow-medium transition-shadow">
                      <div className="absolute top-0 right-0 bg-primary text-white text-xs py-1 px-3 rounded-bl-lg font-medium">
                        Best Value
                      </div>
                      <div className="p-6 bg-secondary/10">
                        <h3 className="font-heading font-semibold text-lg mb-1">Annual</h3>
                        <div className="flex items-end mb-3">
                          <span className="text-3xl font-bold">$49.99</span>
                          <span className="text-neutral-600 ml-1">/year</span>
                        </div>
                        <p className="text-sm text-neutral-600">Save $21.89 compared to monthly plan.</p>
                      </div>
                      <div className="p-6">
                        <ul className="space-y-3">
                          <li className="flex items-start">
                            <CheckIcon className="text-accent h-5 w-5 mt-0.5 mr-3" />
                            <span>Full access to all poems</span>
                          </li>
                          <li className="flex items-start">
                            <CheckIcon className="text-accent h-5 w-5 mt-0.5 mr-3" />
                            <span>High-resolution images</span>
                          </li>
                          <li className="flex items-start">
                            <CheckIcon className="text-accent h-5 w-5 mt-0.5 mr-3" />
                            <span>No advertisements</span>
                          </li>
                          <li className="flex items-start">
                            <CheckIcon className="text-accent h-5 w-5 mt-0.5 mr-3" />
                            <span>Download poems as PDF</span>
                          </li>
                          <li className="flex items-start">
                            <CheckIcon className="text-accent h-5 w-5 mt-0.5 mr-3" />
                            <span>Early access to new content</span>
                          </li>
                        </ul>
                        <Button 
                          className="w-full mt-6 bg-primary hover:bg-primary-dark text-white"
                          onClick={() => handleSelectPlan('annual')}
                        >
                          Subscribe Annually
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {selectedPlan && clientSecret ? (
                    <StripePaymentForm 
                      clientSecret={clientSecret} 
                      plan={selectedPlan} 
                      stripePromise={stripePromise} 
                      refreshSubscription={refreshSubscription}
                      onCancel={() => setSelectedPlan(null)}
                    />
                  ) : selectedPlan && !clientSecret ? (
                    <div className="py-6">
                      <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Payment System Error</AlertTitle>
                        <AlertDescription>
                          We're having trouble connecting to our payment system. This may be due to configuration issues.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="flex justify-between mt-6">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setSelectedPlan(null); 
                            setShowPlanModal(true);
                          }}
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back to Plans
                        </Button>
                        
                        <Button 
                          variant="default" 
                          onClick={() => setLocation('/')}
                        >
                          Return to Home
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <SubscriptionModal 
        isOpen={showPlanModal && !selectedPlan} 
        onClose={() => setShowPlanModal(false)}
        onSelectPlan={handleSelectPlan}
      />
    </div>
  );
}