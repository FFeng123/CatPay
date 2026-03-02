import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-check";
import { generateApiKey } from "@/lib/utils";

const deviceSchema = z.object({
  name: z.string().min(1),
  wechatPaymentLink: z.string().url().nullable(),
  alipayPaymentLink: z.string().url().nullable(),
  enabled: z.boolean().default(true),
});

// GET all devices
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const devices = await prisma.device.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(devices);
  } catch (error) {
    console.error("Get devices error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// POST create device
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const validation = deviceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "参数验证失败", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, wechatPaymentLink, alipayPaymentLink, enabled } = validation.data;

    // Validate that at least one payment link is provided
    if (!wechatPaymentLink && !alipayPaymentLink) {
      return NextResponse.json({ error: "至少需要填写微信或支付宝支付链接之一" }, { status: 400 });
    }

    // Generate device key automatically
    const finalDeviceKey = generateApiKey();

    // Check if deviceKey already exists
    const existingDevice = await prisma.device.findUnique({
      where: { deviceKey: finalDeviceKey },
    });

    if (existingDevice) {
      return NextResponse.json({ error: "设备Key已存在" }, { status: 400 });
    }

    const device = await prisma.device.create({
      data: {
        name,
        deviceKey: finalDeviceKey,
        wechatPaymentLink,
        alipayPaymentLink,
        enabled,
      },
    });

    return NextResponse.json(device);
  } catch (error) {
    console.error("Create device error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// PUT update device
export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "设备 ID 不能为空" }, { status: 400 });
    }

    // If updating payment links, validate at least one exists
    if (data.wechatPaymentLink !== undefined || data.alipayPaymentLink !== undefined) {
      const currentDevice = await prisma.device.findUnique({ where: { id } });
      const wechat = data.wechatPaymentLink !== undefined ? data.wechatPaymentLink : currentDevice?.wechatPaymentLink;
      const alipay = data.alipayPaymentLink !== undefined ? data.alipayPaymentLink : currentDevice?.alipayPaymentLink;

      if (!wechat && !alipay) {
        return NextResponse.json({ error: "至少需要填写微信或支付宝支付链接之一" }, { status: 400 });
      }
    }

    const device = await prisma.device.update({
      where: { id },
      data,
    });

    return NextResponse.json(device);
  } catch (error) {
    console.error("Update device error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// DELETE device
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "设备 ID 不能为空" }, { status: 400 });
    }

    await prisma.device.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete device error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
