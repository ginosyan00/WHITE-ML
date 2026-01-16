import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";
import { adminService } from "@/lib/services/admin.service";
import { paymentService } from "@/lib/services/payments/payment.service";
import { db } from "@white-shop/db";

/**
 * POST /api/v1/admin/orders/[id]/refund
 * Refund payment
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
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

    const { id } = await params;
    const body = await req.json();
    const { amount } = body; // Optional: if not provided, full refund

    console.log("💳 [ADMIN ORDERS] Refund request:", { orderId: id, amount });

    // Get order with payments
    const order = await adminService.getOrderById(id);
    if (!order) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/not-found",
          title: "Order Not Found",
          status: 404,
          detail: `Order with id ${id} not found`,
          instance: req.url,
        },
        { status: 404 }
      );
    }

    // Find the latest payment for this order
    const payment = await db.payment.findFirst({
      where: {
        orderId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!payment) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/not-found",
          title: "Payment Not Found",
          status: 404,
          detail: `No payment found for order ${id}`,
          instance: req.url,
        },
        { status: 404 }
      );
    }

    if (!payment.providerTransactionId) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/bad-request",
          title: "Invalid Payment",
          status: 400,
          detail: "Payment does not have a provider transaction ID",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Process refund
    const refundResponse = await paymentService.refundPayment(
      payment.id,
      amount ? parseFloat(amount) : undefined
    );

    if (!refundResponse.success) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Refund Failed",
          status: 400,
          detail: refundResponse.message || "Failed to process refund",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Get updated order
    const updatedOrder = await adminService.getOrderById(id);

    console.log("✅ [ADMIN ORDERS] Payment refunded:", {
      orderId: id,
      paymentId: payment.id,
      refundAmount: amount || payment.amount,
    });

    return NextResponse.json({
      success: true,
      message: "Refund processed successfully",
      paymentStatus: updatedOrder.paymentStatus,
      payment: {
        id: payment.id,
        status: refundResponse.status,
        refundAmount: amount || payment.amount,
      },
    });
  } catch (error: any) {
    console.error("❌ [ADMIN ORDERS] Refund error:", {
      message: error?.message,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        type: "https://api.shop.am/problems/internal-error",
        title: "Internal Server Error",
        status: 500,
        detail: error?.message || "Failed to process refund",
        instance: req.url,
      },
      { status: 500 }
    );
  }
}

