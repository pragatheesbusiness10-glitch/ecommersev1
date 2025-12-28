import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  CreditCard, 
  Truck, 
  Shield, 
  ChevronLeft, 
  Loader2,
  CheckCircle,
  Lock,
  Smartphone,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface ShopifyCheckoutProps {
  cart: CartItem[];
  total: number;
  storeName: string;
  onSubmit: (data: CheckoutData) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

export interface CheckoutData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: 'cod' | 'upi' | 'bank';
}

export const ShopifyCheckout: React.FC<ShopifyCheckoutProps> = ({
  cart,
  total,
  storeName,
  onSubmit,
  onBack,
  isSubmitting,
}) => {
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');
  const [formData, setFormData] = useState<CheckoutData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    paymentMethod: 'cod',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateInfo = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.customerName.trim()) newErrors.customerName = 'Name is required';
    if (!formData.customerEmail.trim()) newErrors.customerEmail = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) 
      newErrors.customerEmail = 'Invalid email';
    if (!formData.customerPhone.trim()) newErrors.customerPhone = 'Phone is required';
    else if (!/^\d{10}$/.test(formData.customerPhone.replace(/\D/g, '')))
      newErrors.customerPhone = 'Invalid phone (10 digits)';
    if (!formData.customerAddress.trim()) newErrors.customerAddress = 'Address is required';
    else if (formData.customerAddress.length < 10) newErrors.customerAddress = 'Address too short';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueToPayment = () => {
    if (validateInfo()) {
      setStep('payment');
    }
  };

  const handleSubmitOrder = async () => {
    try {
      await onSubmit(formData);
      setStep('success');
    } catch (error) {
      // Error handled by parent
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6 animate-scale-in">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Order Confirmed!</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Thank you for your order. You will receive payment instructions via email shortly.
        </p>
        <Button onClick={onBack} size="lg" className="rounded-full px-8">
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-0 min-h-[600px]">
      {/* Left - Form */}
      <div className="p-6 lg:p-8 bg-background order-2 lg:order-1">
        <div className="max-w-md mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6">
            <button onClick={onBack} className="text-primary hover:underline">Cart</button>
            <span className="text-muted-foreground">/</span>
            <span className={step === 'info' ? 'text-foreground font-medium' : 'text-muted-foreground'}>
              Information
            </span>
            <span className="text-muted-foreground">/</span>
            <span className={step === 'payment' ? 'text-foreground font-medium' : 'text-muted-foreground'}>
              Payment
            </span>
          </div>

          {step === 'info' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold mb-1">Contact Information</h2>
                <p className="text-sm text-muted-foreground">We'll use this to send order updates</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className={cn("mt-1", errors.customerEmail && "border-destructive")}
                  />
                  {errors.customerEmail && <p className="text-xs text-destructive mt-1">{errors.customerEmail}</p>}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className={cn("mt-1", errors.customerPhone && "border-destructive")}
                  />
                  {errors.customerPhone && <p className="text-xs text-destructive mt-1">{errors.customerPhone}</p>}
                </div>
              </div>

              <Separator />

              <div>
                <h2 className="text-xl font-semibold mb-1">Shipping Address</h2>
                <p className="text-sm text-muted-foreground">Where should we deliver?</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className={cn("mt-1", errors.customerName && "border-destructive")}
                  />
                  {errors.customerName && <p className="text-xs text-destructive mt-1">{errors.customerName}</p>}
                </div>

                <div>
                  <Label htmlFor="address">Complete Address</Label>
                  <textarea
                    id="address"
                    placeholder="House/Flat No., Street, Landmark, City, State, PIN Code"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                    rows={3}
                    className={cn(
                      "w-full mt-1 px-3 py-2 rounded-md border bg-background text-sm resize-none",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                      errors.customerAddress && "border-destructive"
                    )}
                  />
                  {errors.customerAddress && <p className="text-xs text-destructive mt-1">{errors.customerAddress}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary hover:underline">
                  <ChevronLeft className="w-4 h-4" />
                  Return to cart
                </button>
                <Button onClick={handleContinueToPayment} size="lg" className="rounded-lg px-8">
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold mb-1">Payment Method</h2>
                <p className="text-sm text-muted-foreground">Choose how you'd like to pay</p>
              </div>

              <RadioGroup 
                value={formData.paymentMethod} 
                onValueChange={(v) => setFormData({ ...formData, paymentMethod: v as CheckoutData['paymentMethod'] })}
                className="space-y-3"
              >
                <label className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  formData.paymentMethod === 'cod' ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                )}>
                  <RadioGroupItem value="cod" id="cod" />
                  <Truck className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-xs text-muted-foreground">Pay when your order arrives</p>
                  </div>
                </label>

                <label className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  formData.paymentMethod === 'upi' ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                )}>
                  <RadioGroupItem value="upi" id="upi" />
                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">UPI Payment</p>
                    <p className="text-xs text-muted-foreground">GPay, PhonePe, Paytm</p>
                  </div>
                </label>

                <label className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  formData.paymentMethod === 'bank' ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                )}>
                  <RadioGroupItem value="bank" id="bank" />
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Bank Transfer</p>
                    <p className="text-xs text-muted-foreground">Direct bank transfer</p>
                  </div>
                </label>
              </RadioGroup>

              <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Secure Checkout</p>
                  <p className="text-xs text-muted-foreground">Your payment information is protected</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button onClick={() => setStep('info')} className="flex items-center gap-1 text-sm text-primary hover:underline">
                  <ChevronLeft className="w-4 h-4" />
                  Return to information
                </button>
                <Button onClick={handleSubmitOrder} size="lg" className="rounded-lg px-8" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ₹${total.toFixed(2)}`
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right - Order Summary */}
      <div className="bg-muted/30 border-l p-6 lg:p-8 order-1 lg:order-2">
        <div className="max-w-sm mx-auto lg:sticky lg:top-8">
          <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
          
          <div className="space-y-4 mb-6">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="relative">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover border" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border">
                      <span className="text-xs text-muted-foreground">N/A</span>
                    </div>
                  )}
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-muted-foreground text-white text-xs rounded-full flex items-center justify-center">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium text-sm">₹{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-emerald-600">Free</span>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Secure checkout by {storeName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
