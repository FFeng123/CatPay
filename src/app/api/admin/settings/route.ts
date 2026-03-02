import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-check";
import { getSettings, updateSetting } from "@/lib/settings";

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

// GET all settings
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// POST update setting
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const validation = settingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "参数验证失败", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { key, value } = validation.data;

    const validKeys = [
      "maxOrdersPerUser",
      "orderExpireMinutes",
      "penaltyServiceFee",
    ];

    if (!validKeys.includes(key)) {
      return NextResponse.json({ error: "无效的设置键" }, { status: 400 });
    }

    await updateSetting(key, value);

    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Update setting error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
