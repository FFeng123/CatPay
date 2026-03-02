// Order type definitions and display utilities

export type OrderType = "wechat" | "alipay";

export const ORDER_TYPES: Record<OrderType, { label: string; color: string }> = {
  wechat: {
    label: "微信",
    color: "bg-green-100 text-green-800",
  },
  alipay: {
    label: "支付宝",
    color: "bg-blue-100 text-blue-800",
  },
};

export function getTypeLabel(type: OrderType): string {
  return ORDER_TYPES[type]?.label ?? type;
}

export function getTypeColor(type: OrderType): string {
  return ORDER_TYPES[type]?.color ?? "bg-gray-100 text-gray-800";
}

// Get all supported order types
export function getOrderTypes(): OrderType[] {
  return Object.keys(ORDER_TYPES) as OrderType[];
}

// Status definitions and display utilities

export type OrderStatus = "pending" | "success" | "expired" | "cancelled";

export const ORDER_STATUSES: Record<OrderStatus, { label: string; color: string }> = {
  pending: {
    label: "进行中",
    color: "bg-yellow-100 text-yellow-800",
  },
  success: {
    label: "成功",
    color: "bg-green-100 text-green-800",
  },
  expired: {
    label: "已过期",
    color: "bg-gray-100 text-gray-800",
  },
  cancelled: {
    label: "已取消",
    color: "bg-red-100 text-red-800",
  },
};

export function getStatusLabel(status: OrderStatus): string {
  return ORDER_STATUSES[status]?.label ?? status;
}

export function getStatusColor(status: OrderStatus): string {
  return ORDER_STATUSES[status]?.color ?? "bg-gray-100 text-gray-800";
}
