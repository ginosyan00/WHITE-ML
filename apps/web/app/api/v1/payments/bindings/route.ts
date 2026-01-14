/**
 * Payment Bindings API
 * 
 * GET /api/v1/payments/bindings - Get bindings for a client
 * POST /api/v1/payments/bindings - Payment using binding
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";
import { paymentService } from "@/lib/services/payments/payment.service";
import { db } from "@white-shop/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/payments/bindings
 * Get card bindings for a client
 * 
 * Query parameters:
 * - clientId: string (required)
 */
export async function GET(req: NextRequest) {
  try {
    console.log("💳 [PAYMENT BINDINGS] GET request received");

    // Authenticate user
    const user = await authenticateToken(req);
    if (!user) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Authentication required",
          instance: req.url,
        },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "clientId query parameter is required",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Check if user owns the clientId (clientId should match user ID or be accessible by user)
    if (clientId !== user.id && !requireAdmin(user)) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "You don't have access to this client's bindings",
          instance: req.url,
        },
        { status: 403 }
      );
    }

    // Find ArCa gateway
    const gateway = await db.paymentGateway.findFirst({
      where: {
        type: "arca",
        enabled: true,
      },
    });

    if (!gateway) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "ArCa payment gateway not found",
          instance: req.url,
        },
        { status: 404 }
      );
    }

    // Get gateway service
    const gatewayService = await paymentService.getGatewayById(gateway.id);

    // Check if gateway service has getBindings method
    if (typeof (gatewayService as any).getBindings !== "function") {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Unsupported Operation",
          status: 400,
          detail: "Bindings are not supported for this payment gateway",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Get bindings
    console.log(`💳 [PAYMENT BINDINGS] Getting bindings for clientId: ${clientId}`);
    const result = await (gatewayService as any).getBindings(clientId);

    if (result.errorCode) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Failed to Get Bindings",
          status: 400,
          detail: result.errorMessage || "Failed to get bindings",
          errorCode: result.errorCode,
          instance: req.url,
        },
        { status: 400 }
      );
    }

    console.log(`✅ [PAYMENT BINDINGS] Retrieved ${result.bindings.length} bindings`);

    return NextResponse.json({
      success: true,
      bindings: result.bindings,
    });
  } catch (error: any) {
    console.error("❌ [PAYMENT BINDINGS] GET Error:", {
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

/**
 * POST /api/v1/payments/bindings
 * Payment using binding (saved card)
 * 
 * Request body:
 * {
 *   paymentId: string,
 *   bindingId: string,
 *   cvc?: string, // Optional CVC code
 * }
 */
export async function POST(req: NextRequest) {
  try {
    console.log("💳 [PAYMENT BINDINGS] POST request received");

    // Authenticate user
    const user = await authenticateToken(req);
    if (!user) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Authentication required",
          instance: req.url,
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    console.log("💳 [PAYMENT BINDINGS] Request body:", {
      paymentId: body.paymentId,
      bindingId: body.bindingId ? body.bindingId.substring(0, 8) + "..." : undefined,
    });

    // Validate required fields
    if (!body.paymentId || !body.bindingId) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "paymentId and bindingId are required",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Get payment from database
    const payment = await db.payment.findUnique({
      where: { id: body.paymentId },
      include: {
        paymentGateway: true,
        order: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Payment not found",
          instance: req.url,
        },
        { status: 404 }
      );
    }

    // Check if user owns the order
    if (payment.order.userId !== user.id && !requireAdmin(user)) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "You don't have access to this payment",
          instance: req.url,
        },
        { status: 403 }
      );
    }

    // Check if payment gateway is ArCa
    if (!payment.paymentGateway || payment.paymentGateway.type !== "arca") {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Unsupported Gateway",
          status: 400,
          detail: "Bindings are only supported for ArCa payments",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Get gateway service
    const gatewayService = await paymentService.getGatewayById(payment.paymentGateway.id);

    // Check if gateway service has paymentOrderBinding method
    if (typeof (gatewayService as any).paymentOrderBinding !== "function") {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Unsupported Operation",
          status: 400,
          detail: "Binding payments are not supported for this payment gateway",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Get provider transaction ID (mdOrder)
    if (!payment.providerTransactionId) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Invalid Payment",
          status: 400,
          detail: "Payment does not have a provider transaction ID",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Process payment with binding
    console.log(`💳 [PAYMENT BINDINGS] Processing payment with binding via ArCa API`);
    const bindingResponse = await (gatewayService as any).paymentOrderBinding(
      payment.providerTransactionId,
      body.bindingId,
      body.cvc
    );

    if (!bindingResponse.success) {
      console.error(`❌ [PAYMENT BINDINGS] Binding payment failed:`, {
        errorCode: bindingResponse.errorCode,
        errorMessage: bindingResponse.errorMessage,
      });

      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Binding Payment Failed",
          status: 400,
          detail: bindingResponse.errorMessage || "Failed to process binding payment",
          errorCode: bindingResponse.errorCode,
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Update payment status if payment was completed
    if (bindingResponse.redirect && !bindingResponse.metadata?.is3DS) {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "completed",
          providerResponse: {
            ...(payment.providerResponse as any || {}),
            bindingId: body.bindingId,
            bindingPaymentTimestamp: new Date().toISOString(),
          },
        },
      });

      await db.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: "completed",
          paidAt: new Date(),
        },
      });
    }

    console.log(`✅ [PAYMENT BINDINGS] Binding payment processed successfully: ${payment.id}`);

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      redirectUrl: bindingResponse.redirectUrl,
      formAction: bindingResponse.formAction,
      formMethod: bindingResponse.formMethod,
      metadata: bindingResponse.metadata,
    });
  } catch (error: any) {
    console.error("❌ [PAYMENT BINDINGS] POST Error:", {
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

