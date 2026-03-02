import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-check";
import { generateApiKey } from "@/lib/utils";

const apiKeySchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean().default(true),
});

// GET all API keys
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(keys);
  } catch (error) {
    console.error("Get keys error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// POST create API key
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const validation = apiKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "参数验证失败", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, enabled } = validation.data;
    const key = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        key,
        name,
        enabled,
      },
    });

    // Return the full key only on creation
    return NextResponse.json({
      ...apiKey,
      key: `catpay_${key}`,
    });
  } catch (error) {
    console.error("Create key error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// PUT update API key
export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "API Key ID 不能为空" }, { status: 400 });
    }

    const apiKey = await prisma.apiKey.update({
      where: { id },
      data,
    });

    return NextResponse.json(apiKey);
  } catch (error) {
    console.error("Update key error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// DELETE API key
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "API Key ID 不能为空" }, { status: 400 });
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete key error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
