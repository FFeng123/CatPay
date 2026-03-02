import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-check";
import { callWebhook } from "@/lib/webhook";
import { createOrder } from "@/lib/order";

// GET all orders
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const userId = searchParams.get("deviceId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (userId) {
      where.deviceId = userId;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { device: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// POST complete order manually (simulates device report)
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "订单 ID 不能为空" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { device: true },
    });

    if (!order) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }

    if (order.status !== "pending") {
      return NextResponse.json({ error: "订单状态不是进行中" }, { status: 400 });
    }

    const now = new Date();

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
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

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Complete order error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// PUT update order status
export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "订单 ID 和状态不能为空" }, { status: 400 });
    }

    const validStatuses = ["pending", "success", "expired", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "无效的订单状态" }, { status: 400 });
    }

    const updateData: any = { status };
    if (status === "success") {
      updateData.paidAt = new Date();
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    if (status === "success") {
      const fullOrder = await prisma.order.findUnique({ where: { id } });
      if (fullOrder?.webhookUrl) {
        callWebhook(
          fullOrder.webhookUrl,
          fullOrder.orderNo,
          fullOrder.actualAmount,
          fullOrder.expectedAmount,
          fullOrder.serviceFee,
          fullOrder.type,
          new Date(),
          fullOrder.metadata || undefined
        );
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// PATCH - Create new order manually
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();

    const { amount, userId, type, webhookUrl, metadata } = body;

    if (!amount || !userId) {
      return NextResponse.json({ error: "金额、用户ID不能为空" }, { status: 400 });
    }

    const result = await createOrder(amount, userId, type, webhookUrl || undefined, metadata);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Fetch the created order to return full info
    const order = await prisma.order.findUnique({
      where: { orderNo: result.orderNo },
      include: { device: true },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
