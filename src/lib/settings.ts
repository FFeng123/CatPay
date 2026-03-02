import prisma from "./prisma";
import { GlobalSettings } from "@/types";

const DEFAULT_SETTINGS: GlobalSettings = {
  maxOrdersPerUser: 3,
  orderExpireMinutes: 15,
  penaltyServiceFee: 0,
};

export async function getSettings(): Promise<GlobalSettings> {
  const settings = await prisma.globalSettings.findMany();

  const result: GlobalSettings = { ...DEFAULT_SETTINGS };

  for (const setting of settings) {
    if (setting.key === "maxOrdersPerUser") {
      result.maxOrdersPerUser = parseInt(setting.value);
    } else if (setting.key === "orderExpireMinutes") {
      result.orderExpireMinutes = parseInt(setting.value);
    } else if (setting.key === "penaltyServiceFee") {
      result.penaltyServiceFee = parseFloat(setting.value);
    }
  }

  return result;
}

export async function updateSetting(key: string, value: string): Promise<void> {
  await prisma.globalSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.globalSettings.findUnique({
    where: { key },
  });
  return setting?.value ?? null;
}
