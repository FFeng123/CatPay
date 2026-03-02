import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder } from "@/lib/order";
import prisma from "@/lib/prisma";

const createOrderSchema = z.object({
  amount: z.number().positive(),
  userId: z.string().min(1),
  type: z.enum(["wechat", "alipay"]).default("wechat"),
  apiKey: z.string().optional(),
  webhookUrl: z.string().url().optional().or(z.literal("")),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = createOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "参数验证失败", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { amount, userId, type, apiKey, webhookUrl, metadata } = validation.data;

    // Validate API key if provided
    if (apiKey) {
      const keyRecord = await prisma.apiKey.findUnique({
        where: { key: apiKey },
      });

      if (!keyRecord) {
        return NextResponse.json({ error: "无效的 API Key" }, { status: 401 });
      }

      if (!keyRecord.enabled) {
        return NextResponse.json({ error: "API Key 已禁用" }, { status: 401 });
      }
    }

    const result = await createOrder(amount, userId, type, webhookUrl || undefined, metadata);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
