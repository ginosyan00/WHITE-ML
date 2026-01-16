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
  { params }: { params: Promise<{ gateway: string }> | { gateway: string } }
) {
  try {
    // Handle both sync and async params (Next.js 13+ compatibility)
    const resolvedParams = await Promise.resolve(params);
    const gateway = resolvedParams.gateway.toLowerCase() as PaymentGatewayType;
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

    // Try to find payment record before processing webhook
    // This helps identify the payment for status updates
    let foundPaymentId: string | undefined = undefined;
    let foundTransactionId: string | undefined = undefined;

    // Extract gateway-specific identifiers from payload
    const orderID = payload.OrderID || payload.orderID || payload.orderNumber;
    const paymentID = payload.PaymentID || payload.paymentID || payload.transactionID;

    console.log(`💳 [WEBHOOK ${gateway.toUpperCase()}] Extracted identifiers:`, {
      orderID,
      paymentID,
      payloadKeys: Object.keys(payload),
    });

    // Try to find payment by providerTransactionId (PaymentID from gateway)
    if (paymentID) {
      const paymentByTransaction = await db.payment.findFirst({
        where: {
          providerTransactionId: paymentID,
        },
      });

      if (paymentByTransaction) {
        foundPaymentId = paymentByTransaction.id;
        foundTransactionId = paymentID;
        console.log(`✅ [WEBHOOK ${gateway.toUpperCase()}] Found payment by PaymentID:`, {
          paymentId: foundPaymentId,
          transactionId: foundTransactionId,
        });
      }
    }

    // Try to find payment by order number (OrderID from gateway)
    if (!foundPaymentId && orderID) {
      const order = await db.order.findFirst({
        where: {
          number: orderID,
        },
        include: {
          payments: {
            where: {
              paymentGatewayId: gatewayRecord.id,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });

      if (order && order.payments.length > 0) {
        foundPaymentId = order.payments[0].id;
        if (paymentID) {
          foundTransactionId = paymentID;
        }
        console.log(`✅ [WEBHOOK ${gateway.toUpperCase()}] Found payment by OrderID:`, {
          orderID,
          paymentId: foundPaymentId,
          transactionId: foundTransactionId,
        });
      }
    }

    // Prepare webhook data
    const webhookData: PaymentWebhookData = {
      eventType: "payment.completed", // Will be determined by gateway
      paymentId: foundPaymentId,
      transactionId: foundTransactionId,
      orderId: orderID,
      payload,
      headers,
      ipAddress,
      userAgent,
    };

    const webhookLog = await db.paymentWebhookLog.create({
      data: {
        paymentGatewayId: gatewayRecord.id,
        paymentId: foundPaymentId,
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





