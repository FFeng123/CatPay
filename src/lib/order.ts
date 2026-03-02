import prisma from "./prisma";
import { generateOrderNo } from "./utils";
import { getSettings } from "./settings";
import { CreateOrderOutput, OrderType } from "@/types";
import { callWebhook } from "./webhook";

export interface DeviceInfo {
  id: string;
  name: string;
  wechatPaymentLink: string | null;
  alipayPaymentLink: string | null;
  enabled: boolean;
}

// Calculate the final amount considering conflict resolution
// Returns { actualAmount, serviceFee }
async function calculateFinalAmount(
  baseAmount: number,
  type: OrderType,
  deviceId: string,
  baseServiceFee: number
): Promise<{ actualAmount: number; serviceFee: number }> {
  let currentAmount = baseAmount + baseServiceFee;
  let serviceFee = baseServiceFee;
  const maxAttempts = 1000;

  for (let i = 0; i < maxAttempts; i++) {
    const existingOrder = await prisma.order.findFirst({
      where: {
        deviceId,
        type,
        actualAmount: currentAmount,
        status: "pending",
        expiredAt: { gt: new Date() },
      },
    });

    if (!existingOrder) {
      return {
        actualAmount: Math.round(currentAmount * 100) / 100,
        serviceFee: Math.round(serviceFee * 100) / 100,
      };
    }

    // Conflict found, increase service fee by 0.01
    serviceFee += 0.01;
    currentAmount = baseAmount + serviceFee;
  }

  return {
    actualAmount: Math.round(currentAmount * 100) / 100,
    serviceFee: Math.round(serviceFee * 100) / 100,
  };
}

// Find the best device - the one that gives lowest final amount after conflict resolution
async function findBestDevice(
  amount: number,
  type: OrderType,
  penaltyServiceFee: number
): Promise<{ device: DeviceInfo; actualAmount: number; serviceFee: number } | null> {
  const devices = await prisma.device.findMany({
    where: { enabled: true },
  });

  if (devices.length === 0) {
    return null;
  }

  // Filter devices that support the requested payment type
  const supportedDevices = devices.filter((device) => {
    if (type === "wechat") {
      return device.wechatPaymentLink && device.wechatPaymentLink.length > 0;
    } else {
      return device.alipayPaymentLink && device.alipayPaymentLink.length > 0;
    }
  });

  if (supportedDevices.length === 0) {
    return null;
  }

  let bestResult: { device: DeviceInfo; actualAmount: number; serviceFee: number } | null = null;
  let lowestActualAmount = Infinity;

  for (const device of supportedDevices) {
    const result = await calculateFinalAmount(amount, type, device.id, penaltyServiceFee);

    if (result.actualAmount < lowestActualAmount) {
      lowestActualAmount = result.actualAmount;
      bestResult = {
        device: device as DeviceInfo,
        actualAmount: result.actualAmount,
        serviceFee: result.serviceFee,
      };
    }
  }

  return bestResult;
}

export async function createOrder(
  amount: number,
  userId: string,
  type: OrderType = "wechat",
  webhookUrl?: string,
  metadata?: Record<string, any>
): Promise<CreateOrderOutput | { error: string }> {
  const settings = await getSettings();

  // 先标记所有已过期的订单
  await prisma.order.updateMany({
    where: {
      userId,
      status: "pending",
      expiredAt: { lte: new Date() },
    },
    data: {
      status: "expired",
    },
  });

  // Check current pending orders for user
  const pendingOrders = await prisma.order.findMany({
    where: {
      userId,
      status: "pending",
      expiredAt: { gt: new Date() },
    },
  });

  if (pendingOrders.length >= settings.maxOrdersPerUser) {
    return { error: `用户已有 ${pendingOrders.length} 个进行中的订单，最大允许 ${settings.maxOrdersPerUser} 个` };
  }

  // Base service fee: penalty if there are pending orders, else 0
  const baseServiceFee = pendingOrders.length > 0 ? settings.penaltyServiceFee : 0;

  // Find best device (lowest final amount after conflict resolution)
  const result = await findBestDevice(amount, type, baseServiceFee);

  if (!result) {
    return { error: "暂无可用设备" };
  }

  // Generate order
  const orderNo = generateOrderNo();
  const expiredAt = new Date(Date.now() + settings.orderExpireMinutes * 60 * 1000);

  // Create order
  await prisma.order.create({
    data: {
      orderNo,
      deviceId: result.device.id,
      userId,
      type,
      expectedAmount: amount,
      actualAmount: result.actualAmount,
      serviceFee: result.serviceFee,
      webhookUrl: webhookUrl || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      expiredAt,
      status: "pending",
    },
  });

  // 根据订单类型选择对应的支付链接
  const paymentLink = type === "wechat"
    ? result.device.wechatPaymentLink
    : result.device.alipayPaymentLink;

  if (!paymentLink) {
    return { error: `该设备不支持${type === "wechat" ? "微信" : "支付宝"}支付` };
  }

  return {
    orderNo,
    paymentLink,
    actualAmount: result.actualAmount,
    expiredAt,
    expectedAmount: amount,
    serviceFee: result.serviceFee,
  };
}

export async function getOrder(orderNo: string) {
  return prisma.order.findUnique({
    where: { orderNo },
    include: { device: true },
  });
}

export async function processDeviceReport(
  amount: number,
  deviceId: string,
  type: OrderType,
  orderNo?: string
): Promise<{ success: boolean; order?: any; error?: string }> {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
  });

  if (!device) {
    return { success: false, error: "设备不存在" };
  }

  // Try to find by orderNo first
  let order = null;
  if (orderNo) {
    order = await prisma.order.findFirst({
      where: {
        orderNo,
        deviceId,
        status: "pending",
        expiredAt: { gt: new Date() },
      },
    });
  }

  // Try to find by amount AND type
  if (!order) {
    order = await prisma.order.findFirst({
      where: {
        deviceId,
        type,
        actualAmount: amount,
        status: "pending",
        expiredAt: { gt: new Date() },
      },
    });
  }

  if (!order) {
    return { success: false, error: "未找到对应订单" };
  }

  const now = new Date();

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "success",
      paidAt: now,
    },
  });

  if (order.webhookUrl) {
    callWebhook(
      order.webhookUrl,
      order.orderNo,
      order.actualAmount,
      order.expectedAmount,
      order.serviceFee,
      order.type,
      now,
      order.metadata || undefined
    );
  }

  return { success: true, order: updatedOrder };
}
