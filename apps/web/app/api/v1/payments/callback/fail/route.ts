/**
 * Payment Fail Callback
 * 
 * GET /api/v1/payments/callback/fail
 * Handle failed payment redirect
 */

import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { db } from "@white-shop/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/payments/callback/fail
 * Handle failed payment redirect
 * 
 * Query parameters:
 * - orderId: string (optional) - Internal order ID
 * - paymentId: string (optional) - Internal payment ID
 * - error: string (optional) - Error message
 * - OrderID: string (optional) - Order number from gateway (Ameria Bank)
 * - PaymentID: string (optional) - Payment ID from gateway (Ameria Bank)
 * - ResponseCode: string (optional) - Response code from gateway
 */
export async function GET(req: NextRequest) {
  try {
    console.log("💳 [PAYMENT CALLBACK FAIL] GET request received");

    const searchParams = req.nextUrl.searchParams;
    const orderId = searchParams.get("orderId");
    const paymentId = searchParams.get("paymentId");
    const error = searchParams.get("error");
    // Ameria Bank parameters
    const orderID = searchParams.get("OrderID"); // Order number from gateway
    const paymentID = searchParams.get("PaymentID"); // Payment ID from gateway
    const responseCode = searchParams.get("ResponseCode"); // Response code from gateway

    // Build error message from available parameters
    let errorMessage = error || "Payment failed";
    if (responseCode && responseCode !== "00") {
      errorMessage = `Payment failed (ResponseCode: ${responseCode})`;
    }

    console.log("💳 [PAYMENT CALLBACK FAIL] Parameters:", {
      orderId,
      paymentId,
      error,
      OrderID: orderID,
      PaymentID: paymentID,
      ResponseCode: responseCode,
    });

    // Priority 1: If paymentId (internal) is provided, update payment status
    if (paymentId) {
      const payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: true,
        },
      });

      if (payment && payment.status !== "failed") {
        await db.payment.update({
          where: { id: paymentId },
          data: {
            status: "failed",
            failedAt: new Date(),
            errorMessage: errorMessage,
            errorCode: responseCode || undefined,
          },
        });

        // Update order payment status
        await db.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: "failed",
          },
        });

        console.log("✅ [PAYMENT CALLBACK FAIL] Updated payment status by paymentId:", paymentId);
        const orderNumber = payment.order.number;
        redirect(`/orders/${orderNumber}?payment=failed&error=${encodeURIComponent(errorMessage)}`);
      } else if (payment) {
        // Payment already marked as failed, just redirect
        console.log("ℹ️ [PAYMENT CALLBACK FAIL] Payment already marked as failed:", paymentId);
        const orderNumber = payment.order.number;
        redirect(`/orders/${orderNumber}?payment=failed&error=${encodeURIComponent(errorMessage)}`);
      }
    }

    // Priority 2: If PaymentID (from gateway) is provided, find and update payment
    if (paymentID) {
      const payment = await db.payment.findFirst({
        where: {
          providerTransactionId: paymentID,
        },
        include: {
          order: true,
        },
      });

      if (payment && payment.status !== "failed") {
        await db.payment.update({
          where: { id: payment.id },
          data: {
            status: "failed",
            failedAt: new Date(),
            errorMessage: errorMessage,
            errorCode: responseCode || undefined,
          },
        });

        // Update order payment status
        await db.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: "failed",
          },
        });

        console.log("✅ [PAYMENT CALLBACK FAIL] Updated payment status by PaymentID:", paymentID);
        const orderNumber = payment.order.number;
        redirect(`/orders/${orderNumber}?payment=failed&error=${encodeURIComponent(errorMessage)}`);
      } else if (payment) {
        // Payment already marked as failed, just redirect
        console.log("ℹ️ [PAYMENT CALLBACK FAIL] Payment already marked as failed by PaymentID:", paymentID);
        const orderNumber = payment.order.number;
        redirect(`/orders/${orderNumber}?payment=failed&error=${encodeURIComponent(errorMessage)}`);
      }
    }

    // Priority 3: If OrderID (order number from gateway) is provided, find order
    if (orderID) {
      const order = await db.order.findFirst({
        where: {
          number: orderID,
        },
      });

      if (order) {
        console.log("✅ [PAYMENT CALLBACK FAIL] Found order by OrderID:", orderID);
        redirect(`/orders/${order.number}?payment=failed&error=${encodeURIComponent(errorMessage)}`);
      }
    }

    // Priority 4: If orderId (internal) is provided, redirect to order page
    if (orderId) {
      const order = await db.order.findUnique({
        where: { id: orderId },
      });

      if (order) {
        console.log("✅ [PAYMENT CALLBACK FAIL] Found order by orderId:", orderId);
        redirect(`/orders/${order.number}?payment=failed&error=${encodeURIComponent(errorMessage)}`);
      }
    }

    // Default redirect to checkout page with error
    console.log("⚠️ [PAYMENT CALLBACK FAIL] No matching order/payment found, redirecting to checkout");
    redirect(`/checkout?error=${encodeURIComponent(errorMessage)}`);
  } catch (error: any) {
    console.error("❌ [PAYMENT CALLBACK FAIL] Error:", error);
    // Redirect to checkout page with error
    redirect(`/checkout?error=${encodeURIComponent(error.message || "An error occurred")}`);
  }
}







