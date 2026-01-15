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
 * - orderId: string (optional)
 * - paymentId: string (optional)
 * - transactionId: string (optional)
 */
export async function GET(req: NextRequest) {
  try {
    console.log("💳 [PAYMENT CALLBACK SUCCESS] GET request received");

    const searchParams = req.nextUrl.searchParams;
    const orderId = searchParams.get("orderId");
    const paymentId = searchParams.get("paymentId");
    const transactionId = searchParams.get("transactionId");

    console.log("💳 [PAYMENT CALLBACK SUCCESS] Parameters:", {
      orderId,
      paymentId,
      transactionId,
    });

    // If paymentId is provided, verify payment status
    if (paymentId) {
      const payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: true,
        },
      });

      if (payment) {
        // Redirect to order success page
        const orderNumber = payment.order.number;
        redirect(`/orders/${orderNumber}?payment=success`);
      }
    }

    // If orderId is provided, redirect to order page
    if (orderId) {
      const order = await db.order.findUnique({
        where: { id: orderId },
      });

      if (order) {
        redirect(`/orders/${order.number}?payment=success`);
      }
    }

    // Default redirect to orders page
    redirect("/orders?payment=success");
  } catch (error: any) {
    console.error("❌ [PAYMENT CALLBACK SUCCESS] Error:", error);
    // Redirect to orders page with error
    redirect("/orders?payment=error");
  }
}





