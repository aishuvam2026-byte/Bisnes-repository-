// Backward-compatible wrapper re-exporting the reusable PaymentGateway component.
export {
  PaymentGateway as UpiPaymentBox,
  PaymentGateway,
  buildUpiParams,
  SUPPORTED_PAYMENT_APPS,
} from './PaymentGateway';
export type { PaymentGatewayProps as UpiPaymentBoxProps, SupportedPaymentApp } from './PaymentGateway';
