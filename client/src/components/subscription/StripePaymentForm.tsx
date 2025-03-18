import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";

interface StripePaymentFormProps {
  clientSecret: string;
  plan: { type: string; price: string; priceId: string };
  stripePromise: ReturnType<typeof loadStripe>;
  refreshSubscription: () => void;
  onCancel: () => void;
}

export default function StripePaymentForm({
  clientSecret,
  plan,
  stripePromise,
  refreshSubscription,
  onCancel,
}: StripePaymentFormProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripePromise) {
      toast({
        title: "Payment Error",
        description: "Payment service is not available",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Failed to load Stripe");
      }
      
      // Use redirect confirmation instead of Elements
      const { error } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/?subscription=success`,
          payment_method_data: {
            billing_details: {
              name: "PoesisVerse User", 
            },
          },
        },
        redirect: 'if_required',
      });
      
      if (error) {
        console.error("Payment error:", error);
        setError(error.message || "Payment failed");
        toast({
          title: "Payment Error",
          description: error.message || "There was a problem with your payment",
          variant: "destructive",
        });
      } else {
        // Success handling
        refreshSubscription();
        toast({
          title: "Payment Successful",
          description: "Thank you for subscribing!",
        });
        setTimeout(() => {
          setLocation('/?subscription=success');
        }, 1000);
      }
    } catch (err: any) {
      console.error("Exception during payment:", err);
      setError(err.message || "An unexpected error occurred");
      toast({
        title: "Payment Failed",
        description: err.message || "There was a problem processing your payment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // If we have an error, show it instead of the form
  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={onCancel}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plans
          </Button>
          
          <Button 
            variant="default"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <form onSubmit={handlePaymentSubmit} className="space-y-6">
        <div className="bg-secondary/10 p-6 rounded-lg">
          <h3 className="font-heading text-lg font-semibold mb-2">Subscription Summary</h3>
          <div className="flex justify-between mb-2">
            <span className="text-neutral-600">Plan:</span>
            <span className="font-medium">{plan.type} Subscription</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-neutral-600">Price:</span>
            <span className="font-medium">{plan.price}</span>
          </div>
          <div className="border-t border-neutral-200 pt-3 mt-3 flex justify-between">
            <span className="text-neutral-800 font-medium">Total:</span>
            <span className="text-primary font-bold">{plan.price}</span>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-heading text-lg font-semibold">Payment Information</h3>
          <p className="text-neutral-600">
            You'll be redirected to Stripe's secure payment page to complete your subscription.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary-dark text-white"
            disabled={isLoading}
          >
            {isLoading ? (
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
          
          <Button 
            type="button"
            variant="outline"
            className="w-full"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
        
        <div className="text-xs text-neutral-500 mt-4 text-center">
          <p>Your payment will be securely processed by Stripe.</p>
          <p>We do not store your payment details.</p>
        </div>
      </form>
    </div>
  );
}