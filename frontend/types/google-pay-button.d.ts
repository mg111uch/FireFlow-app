declare module '@google-pay/button-react' {
  import { ComponentType } from 'react';

  interface PaymentDataRequest {
    apiVersion: number;
    apiVersionMinor: number;
    allowedPaymentMethods: any[];
    merchantInfo: {
      merchantId: string;
      merchantName: string;
    };
    transactionInfo: {
      totalPriceStatus: string;
      totalPriceLabel: string;
      totalPrice: string;
      currencyCode: string;
      countryCode: string;
    };
  }

  interface GooglePayButtonProps {
    environment: 'TEST' | 'PRODUCTION';
    paymentRequest: PaymentDataRequest;
    onLoadPaymentData?: (paymentData: any) => void;
    onError?: (error: any) => void;
    existingPaymentMethodRequired?: boolean;
    buttonColor?: 'black' | 'white' | 'default';
    buttonType?: 'pay' | 'buy' | 'donate' | 'plain';
    buttonSizeMode?: 'static' | 'fill';
    className?: string;
    style?: any;
  }

  const GooglePayButton: ComponentType<GooglePayButtonProps>;
  export default GooglePayButton;
}
