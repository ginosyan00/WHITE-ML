/**
 * Payment Success Callback
 * 
 * GET /api/v1/payments/callback/success
 * Handle successful payment redirect
 */

import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { db } from "@white-shop/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/payments/callback/success
 * Handle successful payment redirect
 * 
 * Query parameters:
 * - orderId: string (optional) - Internal order ID
 * - paymentId: string (optional) - Internal payment ID
 * - transactionId: string (optional) - Transaction ID from gateway
 * - OrderID: string (optional) - Order number from gateway (Ameria Bank)
 * - PaymentID: string (optional) - Payment ID from gateway (Ameria Bank)
 */
export async function GET(req: NextRequest) {
  try {
    console.log("💳 [PAYMENT CALLBACK SUCCESS] GET request received");

    const searchParams = req.nextUrl.searchParams;
    const orderId = searchParams.get("orderId");
    const paymentId = searchParams.get("paymentId");
    const transactionId = searchParams.get("transactionId");
    // Ameria Bank parameters
    const orderID = searchParams.get("OrderID"); // Order number from gateway
    const paymentID = searchParams.get("PaymentID"); // Payment ID from gateway

    console.log("💳 [PAYMENT CALLBACK SUCCESS] Parameters:", {
      orderId,
      paymentId,
      transactionId,
      OrderID: orderID,
      PaymentID: paymentID,
    });

    // Priority 1: If paymentId (internal) is provided, use it
    if (paymentId) {
      const payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: true,
        },
      });

      if (payment) {
        console.log("✅ [PAYMENT CALLBACK SUCCESS] Found payment by paymentId:", paymentId);
        const orderNumber = payment.order.number;
        redirect(`/orders/${orderNumber}?payment=success`);
      }
    }

    // Priority 2: If PaymentID (from gateway) is provided, find payment by providerTransactionId
    if (paymentID) {
      const payment = await db.payment.findFirst({
        where: {
          providerTransactionId: paymentID,
        },
        include: {
          order: true,
        },
      });

      if (payment) {
        console.log("✅ [PAYMENT CALLBACK SUCCESS] Found payment by PaymentID:", paymentID);
        const orderNumber = payment.order.number;
        redirect(`/orders/${orderNumber}?payment=success`);
      }
    }

    // Priority 3: If OrderID (order number from gateway) is provided, find order by number
    if (orderID) {
      const order = await db.order.findFirst({
        where: {
          number: orderID,
        },
      });

      if (order) {
        console.log("✅ [PAYMENT CALLBACK SUCCESS] Found order by OrderID:", orderID);
        redirect(`/orders/${order.number}?payment=success`);
      }
    }

    // Priority 4: If orderId (internal) is provided, redirect to order page
    if (orderId) {
      const order = await db.order.findUnique({
        where: { id: orderId },
      });

      if (order) {
        console.log("✅ [PAYMENT CALLBACK SUCCESS] Found order by orderId:", orderId);
        redirect(`/orders/${order.number}?payment=success`);
      }
    }

    // Priority 5: If transactionId is provided, find payment by providerTransactionId
    if (transactionId) {
      const payment = await db.payment.findFirst({
        where: {
          providerTransactionId: transactionId,
        },
        include: {
          order: true,
        },
      });

      if (payment) {
        console.log("✅ [PAYMENT CALLBACK SUCCESS] Found payment by transactionId:", transactionId);
        const orderNumber = payment.order.number;
        redirect(`/orders/${orderNumber}?payment=success`);
      }
    }

    // Default redirect to orders page
    console.log("⚠️ [PAYMENT CALLBACK SUCCESS] No matching order/payment found, redirecting to orders page");
    redirect("/orders?payment=success");
  } catch (error: any) {
    console.error("❌ [PAYMENT CALLBACK SUCCESS] Error:", error);
    // Redirect to orders page with error
    redirect("/orders?payment=error");
  }
}







