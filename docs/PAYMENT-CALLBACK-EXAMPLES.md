# 💳 Payment Gateway Callback Examples

Այս փաստաթուղթը ցույց է տալիս, թե ինչպես են աշխատում callback-ները բոլոր payment gateway-ների համար:

---

## 📋 Ընդհանուր տեղեկություն

### Callback տեսակներ

1. **Webhook Callbacks (RESULT_URL)** - Server-to-server հաղորդագրություններ
   - Օգտագործվում են payment status-ը թարմացնելու համար
   - Գալիս են payment gateway-ից ձեր server-ին

2. **User Redirects (SUCCESS_URL/FAIL_URL)** - Browser redirects
   - Օգտագործվում են օգտատիրոջը redirect անելու համար
   - Գալիս են browser-ից ձեր site-ին

---

## 🔵 Idram Callbacks

### 1. Webhook Callback (RESULT_URL)

**URL:** `https://yoursite.com/api/v1/payments/webhooks/idram`

#### A) Precheck Request (Նախնական ստուգում)

Idram-ը ուղարկում է precheck request payment-ից առաջ, որպեսզի ստուգի, որ order-ը գոյություն ունի:

**Request:**
```http
POST /api/v1/payments/webhooks/idram HTTP/1.1
Host: yoursite.com
Content-Type: application/x-www-form-urlencoded

EDP_PRECHECK=YES
EDP_BILL_NO=250113-12345
EDP_REC_ACCOUNT=100000114
EDP_AMOUNT=1000.00
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: text/plain

OK
```

**Response (Error):**
```http
HTTP/1.1 200 OK
Content-Type: text/plain

ERROR
```

#### B) Payment Confirmation (Վճարման հաստատում)

Idram-ը ուղարկում է payment confirmation request payment-ից հետո:

**Request:**
```http
POST /api/v1/payments/webhooks/idram HTTP/1.1
Host: yoursite.com
Content-Type: application/x-www-form-urlencoded

EDP_BILL_NO=250113-12345
EDP_REC_ACCOUNT=100000114
EDP_PAYER_ACCOUNT=123456789
EDP_AMOUNT=1000.00
EDP_TRANS_ID=12345678901234
EDP_TRANS_DATE=13/01/2025
EDP_CHECKSUM=abc123def456ghi789jkl012mno345pq
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: text/plain

OK
```

**Response (Error):**
```http
HTTP/1.1 500 Internal Server Error
Content-Type: text/plain

ERROR
```

**Checksum Verification:**
```
MD5(EDP_REC_ACCOUNT:EDP_AMOUNT:SECRET_KEY:EDP_BILL_NO:EDP_PAYER_ACCOUNT:EDP_TRANS_ID:EDP_TRANS_DATE)
```

### 2. User Redirect - Success (SUCCESS_URL)

**URL:** `https://yoursite.com/api/v1/payments/callback/success`

**Request (Browser Redirect):**
```http
GET /api/v1/payments/callback/success?orderId=ord_123&paymentId=pay_456&transactionId=12345678901234 HTTP/1.1
Host: yoursite.com
```

**Response:**
```http
HTTP/1.1 302 Found
Location: /orders/250113-12345?payment=success
```

### 3. User Redirect - Fail (FAIL_URL)

**URL:** `https://yoursite.com/api/v1/payments/callback/fail`

**Request (Browser Redirect):**
```http
GET /api/v1/payments/callback/fail?orderId=ord_123&paymentId=pay_456&error=Payment%20cancelled HTTP/1.1
Host: yoursite.com
```

**Response:**
```http
HTTP/1.1 302 Found
Location: /orders/250113-12345?payment=failed&error=Payment%20cancelled
```

---

## 🏦 Ameriabank Callbacks

### 1. Webhook Callback

**URL:** `https://yoursite.com/api/v1/payments/webhooks/ameriabank`

**Request (Payment Completed):**
```http
POST /api/v1/payments/webhooks/ameriabank HTTP/1.1
Host: yoursite.com
Content-Type: application/json

{
  "OrderID": "250113-12345",
  "PaymentID": "payment-abc123",
  "ResponseCode": "00",
  "Status": "Completed",
  "Amount": 1000.00,
  "Currency": "AMD",
  "TransactionID": "txn_123456789",
  "Timestamp": "2025-01-13T10:30:00Z"
}
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "status": "completed",
  "message": "Webhook processed successfully"
}
```

**Request (Payment Failed):**
```http
POST /api/v1/payments/webhooks/ameriabank HTTP/1.1
Host: yoursite.com
Content-Type: application/json

{
  "OrderID": "250113-12345",
  "PaymentID": "payment-abc123",
  "ResponseCode": "05",
  "Status": "Failed",
  "Amount": 1000.00,
  "Currency": "AMD",
  "ErrorMessage": "Insufficient funds"
}
```

**Response (Error):**
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "success": false,
  "error": "Webhook processing failed"
}
```

### 2. User Redirect - Success

**URL:** `https://yoursite.com/api/v1/payments/callback/success`

**Request:**
```http
GET /api/v1/payments/callback/success?orderId=ord_123&paymentId=pay_456 HTTP/1.1
Host: yoursite.com
```

**Response:**
```http
HTTP/1.1 302 Found
Location: /orders/250113-12345?payment=success
```

### 3. User Redirect - Fail

**URL:** `https://yoursite.com/api/v1/payments/callback/fail`

**Request:**
```http
GET /api/v1/payments/callback/fail?orderId=ord_123&paymentId=pay_456&error=Insufficient%20funds HTTP/1.1
Host: yoursite.com
```

**Response:**
```http
HTTP/1.1 302 Found
Location: /orders/250113-12345?payment=failed&error=Insufficient%20funds
```

---

## 🏦 Inecobank Callbacks

### 1. Webhook Callback

**URL:** `https://yoursite.com/api/v1/payments/webhooks/inecobank`

**Request (Payment Completed):**
```http
POST /api/v1/payments/webhooks/inecobank HTTP/1.1
Host: yoursite.com
Content-Type: application/json

{
  "orderNumber": "250113-12345",
  "paymentID": "payment-xyz789",
  "status": "1",
  "action": "payment",
  "amount": 1000.00,
  "currency": "AMD",
  "transactionID": "txn_987654321",
  "timestamp": "2025-01-13T10:30:00Z"
}
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "status": "completed",
  "message": "Webhook processed successfully"
}
```

**Request (Payment Failed):**
```http
POST /api/v1/payments/webhooks/inecobank HTTP/1.1
Host: yoursite.com
Content-Type: application/json

{
  "orderNumber": "250113-12345",
  "paymentID": "payment-xyz789",
  "status": "2",
  "action": "payment",
  "amount": 1000.00,
  "currency": "AMD",
  "errorCode": "E001",
  "errorMessage": "Card declined"
}
```

**Status Codes:**
- `0` or `"0"` - Pending
- `1` or `"1"` - Completed
- `2` or `"2"` - Failed

**Response (Error):**
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "success": false,
  "error": "Webhook processing failed"
}
```

### 2. User Redirect - Success

**URL:** `https://yoursite.com/api/v1/payments/callback/success`

**Request:**
```http
GET /api/v1/payments/callback/success?orderId=ord_123&paymentId=pay_456 HTTP/1.1
Host: yoursite.com
```

**Response:**
```http
HTTP/1.1 302 Found
Location: /orders/250113-12345?payment=success
```

### 3. User Redirect - Fail

**URL:** `https://yoursite.com/api/v1/payments/callback/fail`

**Request:**
```http
GET /api/v1/payments/callback/fail?orderId=ord_123&paymentId=pay_456&error=Card%20declined HTTP/1.1
Host: yoursite.com
```

**Response:**
```http
HTTP/1.1 302 Found
Location: /orders/250113-12345?payment=failed&error=Card%20declined
```

---

## 🏦 ArCa Callbacks

### 1. Webhook Callback

**URL:** `https://yoursite.com/api/v1/payments/webhooks/arca`

**Request (Payment Completed):**
```http
POST /api/v1/payments/webhooks/arca HTTP/1.1
Host: yoursite.com
Content-Type: application/json

{
  "orderNumber": "250113-12345",
  "orderId": "order-abc123",
  "status": "1",
  "action": "payment",
  "amount": 1000.00,
  "currency": "AMD",
  "transactionID": "txn_111222333",
  "bankId": "1",
  "timestamp": "2025-01-13T10:30:00Z"
}
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "status": "completed",
  "message": "Webhook processed successfully"
}
```

**Request (Payment Failed):**
```http
POST /api/v1/payments/webhooks/arca HTTP/1.1
Host: yoursite.com
Content-Type: application/json

{
  "orderNumber": "250113-12345",
  "orderId": "order-abc123",
  "status": "2",
  "action": "payment",
  "amount": 1000.00,
  "currency": "AMD",
  "bankId": "1",
  "errorCode": "E002",
  "errorMessage": "Transaction timeout"
}
```

**Status Codes:**
- `0` or `"0"` - Pending
- `1` or `"1"` - Completed
- `2` or `"2"` - Failed

**Response (Error):**
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "success": false,
  "error": "Webhook processing failed"
}
```

### 2. User Redirect - Success

**URL:** `https://yoursite.com/api/v1/payments/callback/success`

**Request:**
```http
GET /api/v1/payments/callback/success?orderId=ord_123&paymentId=pay_456 HTTP/1.1
Host: yoursite.com
```

**Response:**
```http
HTTP/1.1 302 Found
Location: /orders/250113-12345?payment=success
```

### 3. User Redirect - Fail

**URL:** `https://yoursite.com/api/v1/payments/callback/fail`

**Request:**
```http
GET /api/v1/payments/callback/fail?orderId=ord_123&paymentId=pay_456&error=Transaction%20timeout HTTP/1.1
Host: yoursite.com
```

**Response:**
```http
HTTP/1.1 302 Found
Location: /orders/250113-12345?payment=failed&error=Transaction%20timeout
```

---

## 🔍 Callback Flow Diagram

```
┌─────────────┐
│   User      │
│  Browser    │
└──────┬──────┘
       │
       │ 1. Initiate Payment
       ▼
┌─────────────┐
│   Your      │
│   Server    │
└──────┬──────┘
       │
       │ 2. Redirect to Gateway
       ▼
┌─────────────┐
│  Payment    │
│  Gateway    │
└──────┬──────┘
       │
       │ 3a. Webhook (Server-to-Server)
       │    POST /api/v1/payments/webhooks/[gateway]
       │
       │ 3b. User Redirect (Browser)
       │    GET /api/v1/payments/callback/success|fail
       │
       ▼
┌─────────────┐
│   Your      │
│   Server    │
└──────┬──────┘
       │
       │ 4. Redirect User
       ▼
┌─────────────┐
│   User      │
│  Browser    │
│  (Order     │
│   Page)     │
└─────────────┘
```

---

## 📝 Ծանոթագրություններ

### Idram Հատուկ Նշումներ

1. **Precheck Request:**
   - Idram-ը ուղարկում է precheck request payment-ից **առաջ**
   - Պետք է վերադարձնել `OK` (200 status), եթե order-ը գոյություն ունի
   - Եթե չվերադարձնեք `OK`, payment-ը չի կատարվի

2. **Payment Confirmation:**
   - Idram-ը ուղարկում է confirmation request payment-ից **հետո**
   - Պետք է verify անել checksum-ը
   - Պետք է վերադարձնել `OK` (200 status)

3. **Response Format:**
   - Idram-ը սպասում է **plain text** response
   - `OK` - success
   - `ERROR` - error
   - **Ոչ JSON!**

### Այլ Gateway-ների Նշումներ

1. **JSON Format:**
   - Ameriabank, Inecobank, ArCa օգտագործում են JSON format
   - Response-ը նույնպես JSON է

2. **Signature Verification:**
   - Բոլոր gateway-ները ունեն signature verification
   - Idram - MD5 checksum
   - Այլ gateway-ները - հատուկ signature algorithms

3. **Idempotency:**
   - Webhook-ները կարող են ուղարկվել մի քանի անգամ
   - System-ը ավտոմատ կերպով handle է անում duplicates-ը

---

## 🧪 Testing Callbacks

### Local Testing

1. **ngrok:**
   ```bash
   ngrok http 3000
   ```
   Use: `https://abc123.ngrok.io/api/v1/payments/webhooks/idram`

2. **localtunnel:**
   ```bash
   npx localtunnel --port 3000
   ```

### Test Webhook Payloads

**Idram Precheck:**
```bash
curl -X POST https://your-ngrok-url.ngrok.io/api/v1/payments/webhooks/idram \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "EDP_PRECHECK=YES&EDP_BILL_NO=250113-12345&EDP_REC_ACCOUNT=100000114&EDP_AMOUNT=1000.00"
```

**Idram Payment Confirmation:**
```bash
curl -X POST https://your-ngrok-url.ngrok.io/api/v1/payments/webhooks/idram \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "EDP_BILL_NO=250113-12345&EDP_REC_ACCOUNT=100000114&EDP_PAYER_ACCOUNT=123456789&EDP_AMOUNT=1000.00&EDP_TRANS_ID=12345678901234&EDP_TRANS_DATE=13/01/2025&EDP_CHECKSUM=abc123..."
```

**Ameriabank:**
```bash
curl -X POST https://your-ngrok-url.ngrok.io/api/v1/payments/webhooks/ameriabank \
  -H "Content-Type: application/json" \
  -d '{
    "OrderID": "250113-12345",
    "PaymentID": "payment-abc123",
    "ResponseCode": "00",
    "Status": "Completed",
    "Amount": 1000.00,
    "Currency": "AMD"
  }'
```

---

## 🔗 Related Documentation

- [Payment Webhook Setup](PAYMENT-WEBHOOK-SETUP.md)
- [Payment API Documentation](PAYMENT-API-DOCUMENTATION.md)
- [Payment Configuration Guide](PAYMENT-CONFIGURATION-GUIDE.md)
- [Payment Troubleshooting](PAYMENT-TROUBLESHOOTING.md)

