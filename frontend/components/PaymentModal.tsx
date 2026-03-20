'use client';

import { RupeeIcon, LoadIcon, CheckCircleIcon, AlertIcon, CreditCardIcon } from "../lib/icons";
import { useState, useEffect, useMemo } from "react";
import GooglePayButton from "@google-pay/button-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setIsProcessing(false);
      setPaymentError(null);
    }
  }, [isOpen]);

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
        // Reset state after successful callback
        setIsSuccess(false);
        setIsProcessing(false);
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
        // Reset state after successful callback
        setIsSuccess(false);
        setIsProcessing(false);
      }, 1500);
    }, 1000);
  };

  const handleClose = () => {
    if (!isProcessing && !isSuccess) {
      onClose();
    }
  };

  if (!mounted) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-semibold text-center">
            {isSuccess ? 'Payment Successful' : (paymentError ? 'Payment Restricted' : 'Complete Payment')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {isSuccess ? (
              'Your transaction has been completed successfully.'
            ) : paymentError ? (
              'Google Pay is restricted in this preview environment. Please use the simulator below.'
            ) : (
              <>
                <span className="flex items-center justify-center gap-1">
                  Amount
                  <RupeeIcon/>
                  {(amount || 0).toFixed(2)}
                </span>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="my-6 flex flex-col items-center justify-center space-y-6">
          {isSuccess ? (
             <div className="flex flex-col items-center">
                <CheckCircleIcon />
                <p className="text-sm font-medium">Finalizing your request...</p>
             </div>
          ) : (
            <div className="p-4 border rounded-md bg-gray-600 w-full text-center space-y-4">
                {!isProcessing ? (
                  <>
                    <div className="flex flex-col items-center justify-center gap-4">
                      {/* Attempt to render GPay, but provide a fallback UI for SecurityErrors */}
                      <GooglePayButton
                        environment="TEST"
                        paymentRequest={paymentRequest}
                        onLoadPaymentData={handlePaymentDataLoad}
                        onError={(error: any) => {
                          console.error('GPay error', error);
                          // Handle SecurityError specifically for iframe contexts
                          if (error?.message?.includes('SecurityError') || error?.message?.includes('browsing context')) {
                            setPaymentError('The Google Pay API is blocked in this environment (e.g. within an iframe).');
                          } else {
                            setPaymentError(error?.message || 'Payment failed');
                            onPaymentFailure(error);
                          }
                        }}
                        existingPaymentMethodRequired={false}
                        buttonColor="white"
                        buttonType="pay"
                        className="w-full max-w-[240px]"
                      />

                      <div className="relative w-full py-2">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-gray-50 px-2 text-gray-500">Or simulate</span>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        onClick={handleMockPayment} 
                        className="w-full max-w-[240px] text-gray-800"
                      >
                        <span className="flex items-center gap-2">
                          <CreditCardIcon /> Mock UPI / Pay Later
                        </span>
                      </Button>
                    </div>

                    {paymentError && (
                      <div className="mt-4 flex items-start gap-2 text-left p-3 bg-red-50 text-red-600 rounded-md text-xs">
                        <AlertIcon/>
                        <p>{paymentError}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center text-sm text-blue-600 py-8">
                    <LoadIcon />
                    <p className="font-medium">Processing transaction...</p>
                  </div>
                )}
            </div>
          )}
        </div>

        <div className="flex justify-center">
            <AlertDialogCancel disabled={isProcessing || isSuccess} onClick={() => onClose()} className="w-full sm:w-auto">
                Cancel
            </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
