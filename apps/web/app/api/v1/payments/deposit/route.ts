/**
 * Payment Deposit API
 * 
 * POST /api/v1/payments/deposit
 * Complete a pre-authorized (two-stage) payment
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";
import { paymentService } from "@/lib/services/payments/payment.service";
import { db } from "@white-shop/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/payments/deposit
 * Complete a pre-authorized (two-stage) payment
 * 
 * Request body:
 * {
 *   paymentId: string,
 *   amount?: number, // Optional - if not provided, deposits full pre-authorized amount
 *   currency?: string, // Optional - defaults to payment currency
 * }
 */
export async function POST(req: NextRequest) {
  try {
    console.log("💳 [PAYMENT DEPOSIT] POST request received");

    // Authenticate user and require admin
    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
      console.log("❌ [PAYMENT DEPOSIT] Unauthorized or not admin");
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin access required",
          instance: req.url,
        },
        { status: 403 }
      );
    }

    console.log(`✅ [PAYMENT DEPOSIT] User authenticated: ${user.id}`);

    const body = await req.json();
    console.log("💳 [PAYMENT DEPOSIT] Request body:", {
      paymentId: body.paymentId,
      amount: body.amount,
      currency: body.currency,
    });

    // Validate required fields
    if (!body.paymentId) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "paymentId is required",
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

    // Check if payment gateway is ArCa (only ArCa supports deposit for now)
    if (!payment.paymentGateway || payment.paymentGateway.type !== "arca") {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Unsupported Gateway",
          status: 400,
          detail: "Deposit is only supported for ArCa payments",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Determine deposit amount
    const depositAmount = body.amount;
    const depositCurrency = body.currency || payment.currency || "AMD";

    // Validate deposit amount if provided
    if (depositAmount !== undefined && depositAmount !== null) {
      if (depositAmount <= 0) {
        return NextResponse.json(
          {
            type: "https://api.shop.am/problems/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "Deposit amount must be greater than 0",
            instance: req.url,
          },
          { status: 400 }
        );
      }

      if (depositAmount > payment.amount) {
        return NextResponse.json(
          {
            type: "https://api.shop.am/problems/validation-error",
            title: "Validation Error",
            status: 400,
            detail: `Deposit amount (${depositAmount}) cannot exceed payment amount (${payment.amount})`,
            instance: req.url,
          },
          { status: 400 }
        );
      }
    }

    // Get gateway service
    const gatewayService = await paymentService.getGatewayById(payment.paymentGateway.id);

    // Check if gateway service has deposit method
    if (typeof (gatewayService as any).deposit !== "function") {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Unsupported Operation",
          status: 400,
          detail: "Deposit is not supported for this payment gateway",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Get provider transaction ID
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

    // Process deposit
    console.log(`💳 [PAYMENT DEPOSIT] Processing deposit via ArCa API`);
    const depositResponse = await (gatewayService as any).deposit(
      payment.providerTransactionId,
      depositAmount,
      depositCurrency
    );

    if (!depositResponse.success) {
      console.error(`❌ [PAYMENT DEPOSIT] Deposit failed:`, {
        errorCode: depositResponse.errorCode,
        errorMessage: depositResponse.errorMessage,
      });

      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Deposit Failed",
          status: 400,
          detail: depositResponse.errorMessage || "Failed to process deposit",
          errorCode: depositResponse.errorCode,
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Update payment status
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "completed",
        providerResponse: {
          ...(payment.providerResponse as any || {}),
          deposited: true,
          depositAmount: depositAmount || payment.amount,
          depositCurrency: depositCurrency,
          depositTimestamp: new Date().toISOString(),
          depositId: depositResponse.transactionId || depositResponse.paymentId,
        },
      },
    });

    // Update order payment status
    await db.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: "completed",
        paidAt: new Date(),
      },
    });

    console.log(`✅ [PAYMENT DEPOSIT] Deposit processed successfully: ${payment.id}`);

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      depositAmount: depositAmount || payment.amount,
      depositCurrency: depositCurrency,
      depositId: depositResponse.transactionId || depositResponse.paymentId,
    });
  } catch (error: any) {
    console.error("❌ [PAYMENT DEPOSIT] Error:", {
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






