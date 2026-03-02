export function generateOrderNo(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `ORD${timestamp}${random}`;
}

export function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function parseAmountRates(json: string): Record<string, string> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function serializeAmountRates(obj: Record<string, string>): string {
  return JSON.stringify(obj);
}

export function findClosestAmount(
  target: number,
  amounts: string[]
): { amount: number; key: string } | null {
  if (amounts.length === 0) return null;

  let closestKey = amounts[0];
  let closestDiff = Math.abs(parseFloat(closestKey) - target);

  for (const key of amounts) {
    const diff = Math.abs(parseFloat(key) - target);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestKey = key;
    }
  }

  return {
    amount: parseFloat(closestKey),
    key: closestKey,
  };
}
