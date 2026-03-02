interface WebhookPayload {
  event: "order.paid";
  orderNo: string;
  actualAmount: number;
  expectedAmount: number;
  serviceFee: number;
  type: string;
  status: string;
  paidAt: string;
  metadata?: Record<string, any>;
}

export async function callWebhook(
  webhookUrl: string,
  orderNo: string,
  actualAmount: number,
  expectedAmount: number,
  serviceFee: number,
  type: string,
  paidAt: Date,
  metadata?: string
): Promise<boolean> {
  try {
    const payload: WebhookPayload = {
      event: "order.paid",
      orderNo,
      actualAmount,
      expectedAmount,
      serviceFee,
      type,
      status: "success",
      paidAt: paidAt.toISOString(),
    };

    if (metadata) {
      try {
        payload.metadata = JSON.parse(metadata);
      } catch {
        // Ignore parse errors
      }
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    return response.ok;
  } catch (error) {
    console.error("Webhook call failed:", error);
    return false;
  }
}
