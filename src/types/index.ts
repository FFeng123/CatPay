export interface OrderStatus {
  pending: "pending";
  success: "success";
  expired: "expired";
  cancelled: "cancelled";
}

export type OrderStatusType = OrderStatus[keyof OrderStatus];

export type OrderType = "wechat" | "alipay";

export interface CreateOrderInput {
  amount: number;
  userId: string;
  type: OrderType;
  apiKey?: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
}

export interface CreateOrderOutput {
  orderNo: string;
  paymentLink: string;
  actualAmount: number;
  expiredAt: Date;
  expectedAmount: number;
  serviceFee: number;
}

export interface DeviceReportInput {
  amount: number;
  deviceId: string;
  type: OrderType;
  orderNo?: string;
}

export interface GlobalSettings {
  maxOrdersPerUser: number;
  orderExpireMinutes: number;
  penaltyServiceFee: number;
}
