import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planType: 'monthly' | 'annual', priceId: string) => void;
}

export default function SubscriptionModal({ isOpen, onClose, onSelectPlan }: SubscriptionModalProps) {
  const monthlyPriceId = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || "price_monthly";
  const annualPriceId = import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID || "price_annual";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Choose your subscription</DialogTitle>
          <DialogDescription>Unlock our entire collection of beautiful poetry with a premium subscription.</DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
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
                onClick={() => onSelectPlan('monthly', monthlyPriceId)}
              >
                Subscribe Monthly
              </Button>
            </div>
          </div>
          
          {/* Annual plan */}
          <div className="border-2 border-primary rounded-lg overflow-hidden relative hover:shadow-medium transition-shadow">
            <Badge className="absolute top-0 right-0 bg-primary font-medium">
              Best Value
            </Badge>
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
                onClick={() => onSelectPlan('annual', annualPriceId)}
              >
                Subscribe Annually
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex-col">
          <div className="text-sm text-neutral-600 text-center">
            <p>Secure payment processed by Stripe.</p>
            <p className="mt-2">Need help? <a href="#" className="text-primary hover:text-primary-dark">Contact our support team</a>.</p>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
