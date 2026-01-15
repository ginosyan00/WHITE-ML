/**
 * Payment Webhook Endpoints
 * 
 * POST /api/v1/payments/webhooks/[gateway]
 * Handle webhook notifications from payment gateways
 */

import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/services/payments/payment.service";
import { PaymentGatewayType, PaymentWebhookData } from "@/lib/types/payments";
import { db } from "@white-shop/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/payments/webhooks/[gateway]
 * Handle webhook notification from payment gateway
 * 
 * Supported gateways: idram, ameriabank, inecobank, arca
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { gateway: string } }
) {
  try {
    const gateway = params.gateway.toLowerCase() as PaymentGatewayType;
    console.log(`💳 [WEBHOOK ${gateway.toUpperCase()}] POST request received`);

    // Validate gateway type
    const validGateways: PaymentGatewayType[] = [
      "idram",
      "ameriabank",
      "inecobank",
      "arca",
    ];

    if (!validGateways.includes(gateway)) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Invalid Gateway",
          status: 400,
          detail: `Invalid gateway type: ${gateway}`,
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Parse request body
    let payload: Record<string, any>;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      // Parse form data
      const formData = await req.formData();
      payload = Object.fromEntries(formData.entries());
    } else {
      // Try to parse as text
      const text = await req.text();
      try {
        payload = JSON.parse(text);
      } catch {
        // Parse as URL-encoded
        const params = new URLSearchParams(text);
        payload = Object.fromEntries(params.entries());
      }
    }

    // Get headers
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Get IP address
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Get user agent
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Prepare webhook data
    const webhookData: PaymentWebhookData = {
      eventType: "payment.completed", // Will be determined by gateway
      payload,
      headers,
      ipAddress,
      userAgent,
    };

    // Log webhook (before processing)
    const gatewayRecord = await db.paymentGateway.findFirst({
      where: {
        type: gateway,
        enabled: true,
      },
    });

    if (!gatewayRecord) {
      console.error(`❌ [WEBHOOK ${gateway.toUpperCase()}] Gateway not found or disabled`);
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/not-found",
          title: "Gateway Not Found",
          status: 404,
          detail: `Payment gateway ${gateway} not found or disabled`,
          instance: req.url,
        },
        { status: 404 }
      );
    }

    const webhookLog = await db.paymentWebhookLog.create({
      data: {
        paymentGatewayId: gatewayRecord.id,
        eventType: webhookData.eventType,
        payload: payload as any,
        headers: headers as any,
        ipAddress,
        userAgent,
        processed: false,
      },
    });

    console.log(`💳 [WEBHOOK ${gateway.toUpperCase()}] Webhook logged: ${webhookLog.id}`);

    // Process webhook
    try {
      const status = await paymentService.processWebhook(gateway, webhookData);

      // Update webhook log
      await db.paymentWebhookLog.update({
        where: { id: webhookLog.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      console.log(`✅ [WEBHOOK ${gateway.toUpperCase()}] Webhook processed: ${status}`);

      // Return appropriate response based on gateway
      if (gateway === "idram") {
        // Idram requires "OK" response
        return new NextResponse("OK", { status: 200 });
      } else {
        // Other gateways return JSON
        return NextResponse.json(
          {
            success: true,
            status,
            message: "Webhook processed successfully",
          },
          { status: 200 }
        );
      }
    } catch (error: any) {
      console.error(`❌ [WEBHOOK ${gateway.toUpperCase()}] Processing error:`, error);

      // Update webhook log with error
      await db.paymentWebhookLog.update({
        where: { id: webhookLog.id },
        data: {
          processed: true,
          processedAt: new Date(),
          processingError: error.message || "Unknown error",
        },
      });

      // Return error response
      if (gateway === "idram") {
        // Idram: return non-200 status to indicate error
        return new NextResponse("ERROR", { status: 500 });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: error.message || "Webhook processing failed",
          },
          { status: 500 }
        );
      }
    }
  } catch (error: any) {
    console.error(`❌ [WEBHOOK] Error:`, {
      gateway: params.gateway,
      message: error.message,
      stack: error.stack,
      url: req.url,
    });

    return NextResponse.json(
      {
        type: "https://api.shop.am/problems/internal-error",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "An error occurred",
        instance: req.url,
      },
      { status: 500 }
    );
  }
}





