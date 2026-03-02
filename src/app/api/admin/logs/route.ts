import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-check";

// GET report logs
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // success, not_found, expired, error
    const deviceId = searchParams.get("deviceId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (deviceId) {
      where.deviceId = deviceId;
    }

    const [logs, total] = await Promise.all([
      prisma.reportLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.reportLog.count({ where }),
    ]);

    // Join with device names
    const deviceIds = Array.from(new Set(logs.map(l => l.deviceId)));
    const devices = await prisma.device.findMany({
      where: { id: { in: deviceIds } },
      select: { id: true, name: true },
    });
    const deviceMap = new Map(devices.map(d => [d.id, d.name]));

    const logsWithDeviceName = logs.map(log => ({
      ...log,
      deviceName: deviceMap.get(log.deviceId) || log.deviceId,
    }));

    return NextResponse.json({
      logs: logsWithDeviceName,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get logs error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
