# 🧪 Payment Gateway Testing Guide

## Overview

This guide explains how to test payment gateway functionality, including unit tests, integration tests, and end-to-end testing.

---

## 📋 Test Structure

### Test Files Location

```
apps/web/__tests__/
├── services/
│   └── payments/
│       ├── idram.service.test.ts
│       └── payment.service.test.ts
└── api/
    └── payments/
        ├── gateways.test.ts
        ├── init.test.ts
        └── webhooks.test.ts
```

---

## 🧪 Unit Tests

### Payment Services

**File:** `__tests__/services/payments/idram.service.test.ts`

Tests for `IdramPaymentService`:
- Config validation
- Payment URL generation
- Form data generation
- Checksum verification
- Webhook processing

**File:** `__tests__/services/payments/payment.service.test.ts`

Tests for `PaymentService`:
- Gateway service retrieval
- Gateway lookup by ID
- Payment initiation
- Webhook processing

### Running Unit Tests

**Install Testing Framework:**

```bash
# Option 1: Jest
cd apps/web
npm install --save-dev jest @types/jest ts-jest @jest/types

# Option 2: Vitest (Recommended for Next.js)
npm install --save-dev vitest @vitest/ui
```

**Configure Jest** (`jest.config.js`):

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

**Configure Vitest** (`vitest.config.ts`):

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

**Run Tests:**

```bash
# Jest
npm test

# Vitest
npm run test
```

---

## 🔗 Integration Tests

### API Routes

**File:** `__tests__/api/payments/gateways.test.ts`

Tests for `GET /api/v1/payments/gateways`:
- Returns enabled gateways
- Sorts by position
- Doesn't expose sensitive data

**File:** `__tests__/api/payments/init.test.ts`

Tests for `POST /api/v1/payments/init`:
- Payment initiation
- Validation errors
- Response format

**File:** `__tests__/api/payments/webhooks.test.ts`

Tests for `POST /api/v1/payments/webhooks/[gateway]`:
- Idram webhook processing
- Checksum verification
- Precheck handling
- Other gateway webhooks

### Running Integration Tests

**Prerequisites:**
1. Development server running: `npm run dev`
2. Database accessible
3. Environment variables set

**Run Tests:**

```bash
# With Jest
npm test -- __tests__/api

# With Vitest
npm run test -- __tests__/api
```

---

## 🌐 Webhook Testing

### Local Development

**Using ngrok:**

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Start ngrok tunnel:**
   ```bash
   ngrok http 3000
   ```

4. **Configure webhook URL in gateway:**
   ```
   https://abc123.ngrok.io/api/v1/payments/webhooks/idram
   ```

5. **Test payment flow:**
   - Create test order
   - Initiate payment
   - Complete payment in gateway
   - Verify webhook received

### Test Mode

1. **Enable test mode in gateway configuration**
2. **Use test credentials**
3. **Test all scenarios:**
   - Successful payment
   - Failed payment
   - Cancelled payment
   - Invalid checksum

### Manual Webhook Testing

**Idram Precheck:**
```bash
curl -X POST http://localhost:3000/api/v1/payments/webhooks/idram \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "EDP_PRECHECK=YES&EDP_BILL_NO=250113-12345&EDP_REC_ACCOUNT=100000114&EDP_AMOUNT=1000.00"
```

**Idram Payment Confirmation:**
```bash
curl -X POST http://localhost:3000/api/v1/payments/webhooks/idram \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "EDP_BILL_NO=250113-12345&EDP_REC_ACCOUNT=100000114&EDP_PAYER_ACCOUNT=123456789&EDP_AMOUNT=1000.00&EDP_TRANS_ID=12345678901234&EDP_TRANS_DATE=13/01/2025&EDP_CHECKSUM=calculated-checksum"
```

**Expected Response:** `OK` (200 status)

---

## 🔄 End-to-End Testing

### Complete Payment Flow

1. **Create Test Order:**
   - Add items to cart
   - Go to checkout
   - Fill customer information
   - Select payment gateway

2. **Initiate Payment:**
   - Submit checkout form
   - Verify redirect to payment gateway
   - Or verify form submission

3. **Complete Payment:**
   - In test mode, use test credentials
   - Complete payment in gateway
   - Verify redirect back to site

4. **Verify Order Status:**
   - Check order status updated
   - Verify payment record created
   - Review webhook logs

### Test Scenarios

**Scenario 1: Successful Payment**
- ✅ Order created
- ✅ Payment initiated
- ✅ Redirect to gateway
- ✅ Payment completed
- ✅ Webhook received
- ✅ Order status updated
- ✅ Customer redirected

**Scenario 2: Failed Payment**
- ✅ Order created
- ✅ Payment initiated
- ✅ Payment failed in gateway
- ✅ Customer redirected to fail URL
- ✅ Order status remains pending

**Scenario 3: Cancelled Payment**
- ✅ Order created
- ✅ Payment initiated
- ✅ Customer cancels
- ✅ Customer redirected to cancel URL
- ✅ Order status remains pending

**Scenario 4: Webhook Retry**
- ✅ Payment completed
- ✅ Webhook received
- ✅ Process webhook
- ✅ Simulate retry
- ✅ Verify idempotency

---

## 🐛 Debugging Tests

### Enable Debug Logging

Add to test files:

```typescript
// Enable console logging
console.log = jest.fn();
console.error = jest.fn();
```

### Mock Database

```typescript
jest.mock('@white-shop/db', () => ({
  db: {
    paymentGateway: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));
```

### Mock External Services

```typescript
jest.mock('@/lib/services/payments/idram.service', () => ({
  IdramPaymentService: jest.fn().mockImplementation(() => ({
    initiatePayment: jest.fn(),
    verifyWebhook: jest.fn(),
    processWebhook: jest.fn(),
  })),
}));
```

---

## 📊 Test Coverage

### Target Coverage

- **Unit Tests:** 80%+ coverage
- **Integration Tests:** All critical paths
- **E2E Tests:** Complete payment flows

### Generate Coverage Report

**Jest:**
```bash
npm test -- --coverage
```

**Vitest:**
```bash
npm run test -- --coverage
```

---

## ✅ Test Checklist

Before deploying to production:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Webhook tests pass
- [ ] E2E payment flow tested
- [ ] Error scenarios tested
- [ ] Test mode verified
- [ ] Production mode verified
- [ ] Webhook retry tested
- [ ] Idempotency verified
- [ ] Security tests passed

---

## 🔗 Related Documentation

- [API Documentation](PAYMENT-API-DOCUMENTATION.md)
- [Configuration Guide](PAYMENT-CONFIGURATION-GUIDE.md)
- [Webhook Setup](PAYMENT-WEBHOOK-SETUP.md)
- [Troubleshooting Guide](PAYMENT-TROUBLESHOOTING.md)

---

## 📝 Notes

- Tests use test mode by default
- Mock external API calls in unit tests
- Use real gateway APIs in integration tests
- Test both test and production modes
- Verify encryption/decryption in tests







