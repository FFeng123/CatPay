import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/order";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;

    if (!orderNo) {
      return NextResponse.json({ error: "订单号不能为空" }, { status: 400 });
    }

    const order = await getOrder(orderNo);

    if (!order) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }

    // Get payment link based on order type
    const paymentLink = order.type === 'wechat'
      ? order.device.wechatPaymentLink
      : order.device.alipayPaymentLink;

    return NextResponse.json({
      orderNo: order.orderNo,
      expectedAmount: order.expectedAmount,
      actualAmount: order.actualAmount,
      status: order.status,
      serviceFee: order.serviceFee,
      type: order.type,
      webhookUrl: order.webhookUrl,
      metadata: order.metadata ? JSON.parse(order.metadata) : null,
      createdAt: order.createdAt,
      expiredAt: order.expiredAt,
      paidAt: order.paidAt,
      deviceName: order.device.name,
      paymentLink: paymentLink,
    });
  } catch (error) {
    console.error("Get order error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
