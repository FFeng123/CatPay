import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrder } from "@/lib/order";

const LONG_POLLING_TIMEOUT = 10000; // 10秒
const POLL_INTERVAL = 1000; // 1秒检查一次

// 检查并标记过期订单
async function checkAndMarkExpired(orderNo: string) {
  const order = await prisma.order.findUnique({
    where: { orderNo },
  });

  if (order && order.status === "pending" && new Date(order.expiredAt).getTime() <= Date.now()) {
    await prisma.order.update({
      where: { orderNo },
      data: { status: "expired" },
    });
    return true;
  }
  return false;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;

    if (!orderNo) {
      return NextResponse.json({ error: "订单号不能为空" }, { status: 400 });
    }

    const startTime = Date.now();

    while (Date.now() - startTime < LONG_POLLING_TIMEOUT) {
      // 检查订单是否过期并标记
      const wasExpired = await checkAndMarkExpired(orderNo);

      if (wasExpired) {
        return NextResponse.json({
          orderNo,
          status: "expired",
          changed: true,
        });
      }

      const order = await getOrder(orderNo);

      if (!order) {
        return NextResponse.json({ error: "订单不存在" }, { status: 404 });
      }

      // 如果订单状态不是 pending，立即返回
      if (order.status !== "pending") {
        return NextResponse.json({
          orderNo: order.orderNo,
          expectedAmount: order.expectedAmount,
          actualAmount: order.actualAmount,
          status: order.status,
          serviceFee: order.serviceFee,
          type: order.type,
          createdAt: order.createdAt,
          expiredAt: order.expiredAt,
          paidAt: order.paidAt,
          changed: true,
        });
      }

      // 等待一段时间后继续轮询
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }

    // 超时，返回当前状态
    // 先检查是否过期
    const wasExpired = await checkAndMarkExpired(orderNo);

    if (wasExpired) {
      return NextResponse.json({
        orderNo,
        status: "expired",
        changed: true,
      });
    }

    const order = await getOrder(orderNo);

    if (!order) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }

    return NextResponse.json({
      orderNo: order.orderNo,
      expectedAmount: order.expectedAmount,
      actualAmount: order.actualAmount,
      status: order.status,
      serviceFee: order.serviceFee,
      type: order.type,
      createdAt: order.createdAt,
      expiredAt: order.expiredAt,
      paidAt: order.paidAt,
      changed: false,
    });
  } catch (error) {
    console.error("Get order status error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
