# 💳 Payment Gateway API Documentation

## Overview

This document describes the Payment Gateway API endpoints for managing payment gateways and processing payments.

**Base URL:**
- Development: `http://localhost:3000/api/v1`
- Production: `https://your-domain.com/api/v1`

---

## 🔐 Authentication

Most endpoints require authentication. Include JWT token in Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Admin endpoints require admin role.

---

## 📋 Admin API - Payment Gateways

### GET /api/v1/admin/payments

Get all payment gateways (admin only).

**Query Parameters:**
- `type` (optional): Filter by gateway type (`idram`, `ameriabank`, `inecobank`, `arca`)
- `enabled` (optional): Filter by enabled status (`true`, `false`)
- `testMode` (optional): Filter by test mode (`true`, `false`)

**Response:**
```json
{
  "data": [
    {
      "id": "clx...",
      "type": "idram",
      "bankId": null,
      "name": "Idram Production",
      "enabled": true,
      "testMode": false,
      "position": 0,
      "healthStatus": "healthy",
      "createdAt": "2025-01-13T...",
      "updatedAt": "2025-01-13T...",
      "config": {
        "idramID": "100000114",
        "idramKey": "***",
        "defaultLanguage": "en"
      }
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `403` - Forbidden (not admin)
- `500` - Internal server error

---

### GET /api/v1/admin/payments/[id]

Get payment gateway by ID (admin only).

**Response:**
```json
{
  "id": "clx...",
  "type": "idram",
  "name": "Idram Production",
  "enabled": true,
  "testMode": false,
  "config": {
    "idramID": "100000114",
    "idramKey": "***"
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Gateway not found
- `403` - Forbidden

---

### POST /api/v1/admin/payments

Create new payment gateway (admin only).

**Request Body:**
```json
{
  "type": "idram",
  "name": "Idram Production",
  "enabled": true,
  "testMode": false,
  "position": 0,
  "config": {
    "idramID": "100000114",
    "idramKey": "your-secret-key",
    "idramTestID": "test-id",
    "idramTestKey": "test-key",
    "rocketLine": false,
    "defaultLanguage": "en"
  }
}
```

**Response:**
```json
{
  "id": "clx...",
  "type": "idram",
  "name": "Idram Production",
  "enabled": true,
  "testMode": false,
  "config": {
    "idramID": "100000114",
    "idramKey": "***"
  }
}
```

**Status Codes:**
- `201` - Created
- `400` - Validation error
- `409` - Gateway already exists
- `403` - Forbidden

---

### PUT /api/v1/admin/payments/[id]

Update payment gateway (admin only).

**Request Body:**
```json
{
  "name": "Updated Name",
  "enabled": false,
  "config": {
    "idramID": "new-id"
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Gateway not found
- `400` - Validation error

---

### DELETE /api/v1/admin/payments/[id]

Delete payment gateway (admin only).

**Status Codes:**
- `200` - Success
- `404` - Gateway not found
- `409` - Gateway in use (has payments)

---

## 💰 Payment API

### GET /api/v1/payments/gateways

Get enabled payment gateways (public).

**Response:**
```json
{
  "data": [
    {
      "id": "clx...",
      "type": "idram",
      "name": "Idram",
      "testMode": true,
      "position": 0
    }
  ]
}
```

**Status Codes:**
- `200` - Success

---

### POST /api/v1/payments/init

Initiate payment for an order.

**Request Body:**
```json
{
  "orderId": "clx...",
  "gatewayId": "clx...",
  "gatewayType": "idram",
  "bankId": "1",
  "returnUrl": "https://...",
  "cancelUrl": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "clx...",
  "redirectUrl": "https://banking.idram.am/...",
  "formData": {
    "EDP_REC_ACCOUNT": "100000114",
    "EDP_AMOUNT": "1000.00",
    "EDP_BILL_NO": "250113-12345"
  },
  "formAction": "https://banking.idram.am/Payment/GetPayment",
  "formMethod": "POST"
}
```

**Status Codes:**
- `200` - Success
- `400` - Validation error
- `404` - Order or gateway not found
- `500` - Internal server error

---

## 🔔 Webhook Endpoints

### POST /api/v1/payments/webhooks/[gateway]

Handle webhook notification from payment gateway.

**Supported gateways:** `idram`, `ameriabank`, `inecobank`, `arca`

**Request:**
- Content-Type: `application/json` or `application/x-www-form-urlencoded`
- Body: Gateway-specific payload

**Response (Idram):**
- `200 OK` with body "OK" - Success
- `500` - Error

**Response (Other gateways):**
```json
{
  "success": true,
  "status": "completed"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid gateway type
- `404` - Gateway not found
- `500` - Processing error

---

## 🔄 Callback Endpoints

### GET /api/v1/payments/callback/success

Handle successful payment redirect.

**Query Parameters:**
- `orderId` (optional): Order ID
- `paymentId` (optional): Payment ID
- `transactionId` (optional): Transaction ID

**Response:**
- Redirects to `/orders/[orderNumber]?payment=success`

---

### GET /api/v1/payments/callback/fail

Handle failed payment redirect.

**Query Parameters:**
- `orderId` (optional): Order ID
- `paymentId` (optional): Payment ID
- `error` (optional): Error message

**Response:**
- Redirects to `/orders/[orderNumber]?payment=failed` or `/checkout?error=...`

---

## 📝 Gateway Configuration Types

### Idram Config
```typescript
{
  idramID?: string;
  idramKey?: string;
  idramTestID?: string;
  idramTestKey?: string;
  rocketLine?: boolean;
  defaultLanguage?: "en" | "hy" | "ru";
  successUrl?: string;
  failUrl?: string;
  resultUrl?: string;
}
```

### Ameriabank Config
```typescript
{
  clientID: string;
  accounts: {
    AMD?: { username: string; password: string };
    USD?: { username: string; password: string };
    EUR?: { username: string; password: string };
    RUB?: { username: string; password: string };
  };
  minTestOrderId?: number;
  maxTestOrderId?: number;
  successUrl?: string;
  failUrl?: string;
  resultUrl?: string;
}
```

### Inecobank Config
```typescript
{
  accounts: {
    AMD?: { username: string; password: string };
    USD?: { username: string; password: string };
    EUR?: { username: string; password: string };
    RUB?: { username: string; password: string };
  };
  successUrl?: string;
  failUrl?: string;
  resultUrl?: string;
}
```

### ArCa Config
```typescript
{
  bankId: "1" | "2" | "3" | "5" | "6" | "7" | "8" | "9" | "11";
  accounts: {
    AMD?: { username: string; password: string };
    USD?: { username: string; password: string };
    EUR?: { username: string; password: string };
    RUB?: { username: string; password: string };
  };
  testPort?: number;
  successUrl?: string;
  failUrl?: string;
  resultUrl?: string;
}
```

---

## 🔒 Security Notes

1. **Encryption:** All sensitive fields (passwords, keys) are encrypted using AES-256-GCM
2. **Sanitization:** Sensitive data is masked in API responses
3. **Webhook Verification:** All webhooks are verified using gateway-specific signatures
4. **Authentication:** Admin endpoints require admin role

---

## 📊 Error Responses

All errors follow Problem Details format:

```json
{
  "type": "https://api.shop.am/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Field 'name' is required",
  "instance": "/api/v1/admin/payments"
}
```

**Common Error Types:**
- `validation-error` - Invalid input data
- `not-found` - Resource not found
- `forbidden` - Access denied
- `conflict` - Resource conflict
- `internal-error` - Server error







