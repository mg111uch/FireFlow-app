'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IndianRupee, Loader2, CheckCircle2, AlertTriangle, CreditCard } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import GooglePayButton from "@google-pay/button-react";
import { Button } from "@/components/ui/button";

interface GPayPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onPaymentSuccess: (details: any) => void;
  onPaymentFailure: (error?: any) => void;
}

export function GPayPaymentModal({ isOpen, onClose, amount, onPaymentSuccess, onPaymentFailure }: GPayPaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const paymentRequest = useMemo(() => ({
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: [
      {
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA'],
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            gateway: 'example',
            gatewayMerchantId: 'exampleGatewayMerchantId',
          },
        },
      },
    ],
    merchantInfo: {
      merchantId: '12345678901234567890',
      merchantName: 'PostShare Demo',
    },
    transactionInfo: {
      totalPriceStatus: 'FINAL',
      totalPriceLabel: 'Total',
      totalPrice: (amount || 0).toFixed(2),
      currencyCode: 'INR',
      countryCode: 'IN',
    },
  }), [amount]);

  const handlePaymentDataLoad = (paymentData: any) => {
    setIsProcessing(true);
    setPaymentError(null);
    setTimeout(() => {
      setIsSuccess(true);
      setIsProcessing(false);
      
      setTimeout(() => {
        onPaymentSuccess({ 
          transactionId: `gpay_${Date.now()}`, 
          status: 'success',
          paymentData 
        });
      }, 1500);
    }, 1000);
  };

  const handleMockPayment = () => {
    setIsProcessing(true);
    setPaymentError(null);
    setTimeout(() => {
      setIsSuccess(true);
      setIsProcessing(false);
      
      setTimeout(() => {
        onPaymentSuccess({ 
          transactionId: `mock_upi_${Date.now()}`, 
          status: 'success',
          method: 'Mock UPI'
        });
      }, 1500);
    }, 1000);
  };

  if (!isOpen || !mounted) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-headline text-center">
            {isSuccess ? 'Payment Successful' : (paymentError ? 'Payment Restricted' : 'Complete Payment')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {isSuccess ? (
              'Your transaction has been completed successfully.'
            ) : paymentError ? (
              'Google Pay is restricted in this preview environment. Please use the simulator below.'
            ) : (
              <>
                Complete your payment of 
                <strong className="text-foreground"> <IndianRupee className="inline h-4 w-4" />{(amount || 0).toFixed(2)}</strong>.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="my-6 flex flex-col items-center justify-center space-y-6">
          {isSuccess ? (
             <div className="flex flex-col items-center animate-in zoom-in duration-300">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-2" />
                <p className="text-sm font-medium">Finalizing your request...</p>
             </div>
          ) : (
            <div className="p-4 border border-dashed rounded-md bg-muted/50 w-full text-center space-y-4">
                {!isProcessing ? (
                  <>
                    <div className="flex flex-col items-center justify-center gap-4">
                      {/* Attempt to render GPay, but provide a fallback UI for SecurityErrors */}
                      <GooglePayButton
                        environment="TEST"
                        paymentRequest={paymentRequest}
                        onLoadPaymentData={handlePaymentDataLoad}
                        onError={error => {
                          console.error('GPay error', error);
                          // Handle SecurityError specifically for iframe contexts
                          if (error?.message?.includes('SecurityError') || error?.message?.includes('browsing context')) {
                            setPaymentError('The Google Pay API is blocked in this environment (e.g. within an iframe).');
                          } else {
                            onPaymentFailure(error);
                          }
                        }}
                        existingPaymentMethodRequired={false}
                        buttonColor="black"
                        buttonType="pay"
                        className="w-full max-w-[240px]"
                      />

                      <div className="relative w-full py-2">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-muted px-2 text-muted-foreground">Or simulate</span>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        onClick={handleMockPayment} 
                        className="w-full max-w-[240px] border-primary text-primary hover:bg-primary/10"
                      >
                        <CreditCard className="mr-2 h-4 w-4" /> Mock UPI / Pay Later
                      </Button>
                    </div>

                    {paymentError && (
                      <div className="mt-4 flex items-start gap-2 text-left p-3 bg-destructive/10 text-destructive rounded-md text-xs">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <p>{paymentError}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center text-sm text-primary animate-pulse py-8">
                    <Loader2 className="mb-2 h-10 w-10 animate-spin" />
                    <p className="font-medium">Processing transaction...</p>
                  </div>
                )}
            </div>
          )}
        </div>

        <div className="flex justify-center">
            <AlertDialogCancel onClick={onClose} disabled={isProcessing || isSuccess} className="w-full sm:w-auto">
                Cancel
            </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
