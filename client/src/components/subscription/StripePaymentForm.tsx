import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, RefreshCw, AlertTriangle, Lock } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  useStripe,
  useElements,
  PaymentElement,
  Elements,
} from "@stripe/react-stripe-js";

interface StripePaymentFormProps {
  clientSecret: string;
  plan: { type: string; price: string; priceId: string }; // Keeping priceId for backward compatibility but we don't use it
  stripePromise: ReturnType<typeof loadStripe>;
  refreshSubscription: () => void;
  onCancel: () => void;
}

// The actual form that uses the Elements context
function CheckoutForm({
  plan,
  refreshSubscription,
  onCancel
}: Omit<StripePaymentFormProps, "clientSecret" | "stripePromise">) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/?subscription=success`,
      },
      redirect: "if_required",
    });

    if (error) {
      console.error("Payment error:", error);
      setErrorMessage(error.message || "Payment failed");
      toast({
        title: "Payment Error",
        description: error.message || "There was a problem with your payment",
        variant: "destructive",
      });
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Payment success
      try {
        // Mark the subscription as successful and trigger the email with plan type
        const response = await fetch('/api/mark-subscription-success', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planType: plan.type // Send the plan type (monthly or annual)
          }),
          credentials: 'include'
        });
        
        const data = await response.json();
        if (!data.success) {
          console.error('Error marking subscription as successful:', data.error);
        } else {
          console.log(`${plan.type} subscription marked as successful:`, data.message);
        }
      } catch (apiError) {
        console.error('Error calling mark-subscription-success:', apiError);
      }
      
      refreshSubscription();
      toast({
        title: "Payment Successful",
        description: "Thank you for subscribing! You will receive a confirmation email shortly.",
      });
      setTimeout(() => {
        setLocation('/?subscription=success');
      }, 1000);
    }

    setIsLoading(false);
  };

  // If we have an error, show it alongside the form
  const errorDisplay = errorMessage && (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Payment Error</AlertTitle>
      <AlertDescription>{errorMessage}</AlertDescription>
    </Alert>
  );
  
  return (
    <div className="space-y-6">
      {errorDisplay}
      
      <form onSubmit={handleSubmit} className="space-y-6">
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
          <div className="p-4 border rounded-md">
            <PaymentElement />
          </div>
        </div>
        
        <div className="space-y-4">
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary-dark text-white"
            disabled={isLoading || !stripe || !elements}
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
              <span className="flex items-center">
                <Lock className="w-4 h-4 mr-2" />
                Complete Subscription
              </span>
            )}
          </Button>
          
          <Button 
            type="button"
            variant="outline"
            className="w-full"
            onClick={onCancel}
            disabled={isLoading}
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

// The wrapper component that sets up the Stripe Elements provider
export default function StripePaymentForm({
  clientSecret,
  plan,
  stripePromise,
  refreshSubscription,
  onCancel,
}: StripePaymentFormProps) {
  const [error, setError] = useState<string | null>(null);

  if (!stripePromise) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>Payment service is not available</AlertDescription>
      </Alert>
    );
  }

  // If we have a critical setup error, show it instead of the form
  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment Setup Error</AlertTitle>
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
  
  // Definim opțiunile cu tipurile corecte pentru Stripe Elements
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as 'stripe' | 'night' | 'flat',
      labels: 'floating' as 'floating' | 'above',
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm 
        plan={plan}
        refreshSubscription={refreshSubscription}
        onCancel={onCancel}
      />
    </Elements>
  );
}