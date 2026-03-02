import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { processDeviceReport } from "@/lib/order";

const deviceReportSchema = z.object({
  deviceKey: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["wechat", "alipay"]),
});

export async function POST(req: NextRequest) {
  let logStatus = "success";
  let logError = null;
  let foundOrder = false;
  let deviceId = "unknown";

  try {
    const body = await req.json();
    const validation = deviceReportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "参数验证失败", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { deviceKey, amount, type } = validation.data;

    // Authenticate device by deviceKey
    const device = await prisma.device.findUnique({
      where: { deviceKey },
    });

    if (!device) {
      return NextResponse.json({ error: "设备鉴权失败" }, { status: 401 });
    }

    if (!device.enabled) {
      return NextResponse.json({ error: "设备已禁用" }, { status: 403 });
    }

    deviceId = device.id;

    // 查找匹配的订单（通过金额、类型、设备）
    const result = await processDeviceReport(amount, deviceId, type, undefined);

    if (!result.success) {
      logStatus = result.error?.includes("已过期") ? "expired" : "not_found";
      logError = result.error;
      foundOrder = false;

      // Log the failed report
      await prisma.reportLog.create({
        data: {
          deviceId,
          type,
          amount,
          orderNo: null,
          found: false,
          status: logStatus,
          errorMsg: result.error,
        },
      });

      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    foundOrder = true;

    // Log the successful report
    await prisma.reportLog.create({
      data: {
        deviceId,
        type,
        amount,
        orderNo: result.order?.orderNo || null,
        found: true,
        status: "success",
      },
    });

    return NextResponse.json({
      success: true,
      orderNo: result.order?.orderNo,
      status: result.order?.status,
    });
  } catch (error) {
    console.error("Device report error:", error);

    // Log the error
    try {
      const { deviceKey, type, amount } = await req.json().catch(() => ({}));
      // Get deviceId from deviceKey if available
      let loggedDeviceId = deviceId;
      if (!loggedDeviceId || loggedDeviceId === "unknown") {
        const dev = await prisma.device.findUnique({ where: { deviceKey } });
        loggedDeviceId = dev?.id || "unknown";
      }
      await prisma.reportLog.create({
        data: {
          deviceId: loggedDeviceId,
          type: type || "unknown",
          amount: amount || 0,
          orderNo: null,
          found: false,
          status: "error",
          errorMsg: String(error),
        },
      });
    } catch {}

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
