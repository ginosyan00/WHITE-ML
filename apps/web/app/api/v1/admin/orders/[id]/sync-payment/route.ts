import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";
import { adminService } from "@/lib/services/admin.service";
import { paymentService } from "@/lib/services/payments/payment.service";
import { db } from "@white-shop/db";

/**
 * POST /api/v1/admin/orders/[id]/sync-payment
 * Sync payment status from bank
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
    console.log("🔄 [ADMIN ORDERS] Sync payment request:", id);

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

    // Sync payment status from bank
    const newStatus = await paymentService.syncPaymentStatus(payment.id);

    // Get updated order
    const updatedOrder = await adminService.getOrderById(id);

    console.log("✅ [ADMIN ORDERS] Payment status synced:", {
      orderId: id,
      paymentId: payment.id,
      newStatus,
    });

    return NextResponse.json({
      success: true,
      message: "Payment status synced successfully",
      paymentStatus: updatedOrder.paymentStatus,
      payment: {
        id: payment.id,
        status: newStatus,
        providerTransactionId: payment.providerTransactionId,
      },
    });
  } catch (error: any) {
    console.error("❌ [ADMIN ORDERS] Sync payment error:", {
      message: error?.message,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        type: "https://api.shop.am/problems/internal-error",
        title: "Internal Server Error",
        status: 500,
        detail: error?.message || "Failed to sync payment status",
        instance: req.url,
      },
      { status: 500 }
    );
  }
}

