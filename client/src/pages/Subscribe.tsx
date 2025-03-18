import { useState, useEffect } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import SubscriptionModal from "@/components/subscription/SubscriptionModal";
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
  } else {
    console.warn('Missing Stripe public key. Stripe functionality will not work.');
  }
} catch (error) {
  console.error('Error initializing Stripe:', error);
}

const SubscribeForm = ({ plan }: { plan: { type: string, price: string, priceId: string } }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { refreshSubscription } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isElementLoading, setIsElementLoading] = useState(true);
  const [elementsError, setElementsError] = useState<string | null>(null);
  
  // Monitor when Elements are fully loaded and enable button after a reasonable delay
  useEffect(() => {
    // Enable the button after a delay regardless of other events
    // This ensures users can try to complete the payment even if
    // Stripe's events don't fire properly
    const shortTimeoutId = setTimeout(() => {
      setIsElementLoading(false);
    }, 2000);
    
    return () => {
      clearTimeout(shortTimeoutId);
    };
  }, []);
  
  // Log when elements are ready
  useEffect(() => {
    if (!elements) {
      return;
    }
    
    console.log("Elements ready:", elements);
    
    // Try to get the payment element to check if it's ready
    try {
      const paymentElement = elements.getElement('payment');
      if (paymentElement) {
        console.log("Payment element found, enabling button");
        setIsElementLoading(false);
      }
    } catch (error) {
      console.log("Error getting payment element:", error);
    }
  }, [elements]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      toast({
        title: "Payment Service Unavailable",
        description: "The payment service is not initialized properly. Please try again later.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // We need to keep window.location.origin here as it's needed for Stripe redirect
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Can't use router directly in redirect URL for Stripe
          return_url: `${window.location.origin}/?subscription=success`,
        },
      });
      
      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "An error occurred during payment",
          variant: "destructive",
        });
      } else {
        // If the payment is successful on the client side, refresh the subscription status immediately
        // This helps in cases where the webhook hasn't processed yet
        refreshSubscription();
        
        toast({
          title: "Payment Successful",
          description: "You are now subscribed!",
        });
        
        // Redirect to home page after successful payment
        setTimeout(() => {
          setLocation('/?subscription=success');
        }, 1500);
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (elementsError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment Form Error</AlertTitle>
          <AlertDescription>
            {elementsError}
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
          
          <Button 
            variant="default" 
            onClick={() => setLocation('/')}
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-secondary/10 p-6 rounded-lg mb-6">
        <h3 className="font-heading text-lg font-semibold mb-2">Subscription Summary</h3>
        <div className="flex justify-between mb-4">
          <span className="text-neutral-600">Plan:</span>
          <span className="font-medium">{plan.type} Subscription</span>
        </div>
        <div className="flex justify-between mb-4">
          <span className="text-neutral-600">Price:</span>
          <span className="font-medium">{plan.price}</span>
        </div>
        <div className="border-t border-neutral-200 pt-4 flex justify-between">
          <span className="text-neutral-800 font-medium">Total:</span>
          <span className="text-primary font-bold">{plan.price}</span>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="font-heading text-lg font-semibold">Payment Details</h3>
        {isElementLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full" aria-label="Loading payment form"/>
          </div>
        )}
        <div className={isElementLoading ? 'opacity-0 h-0' : 'opacity-100'}>
          <PaymentElement />
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-primary hover:bg-primary-dark text-white"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          "Complete Subscription"
        )}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<{ type: string, price: string, priceId: string } | null>(null);
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
  
  const handleSelectPlan = async (planType: 'monthly' | 'annual', priceId: string) => {
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
      priceId
    });
    
    setShowPlanModal(false);
    
    try {
      // Create subscription intent
      const response = await apiRequest("POST", "/api/create-subscription", {
        priceId
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
  
  // Default price IDs in case env vars are not set
  const monthlyPriceId = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || "price_monthly";
  const annualPriceId = import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID || "price_annual";
  
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
                          onClick={() => handleSelectPlan('monthly', monthlyPriceId)}
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
                          onClick={() => handleSelectPlan('annual', annualPriceId)}
                        >
                          Subscribe Annually
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {selectedPlan && clientSecret && stripePromise ? (
                    <Elements stripe={stripePromise} options={{ 
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#5c6ac4',
                        },
                      },
                      loader: 'auto'
                    }}>
                      <SubscribeForm plan={selectedPlan} />
                    </Elements>
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
