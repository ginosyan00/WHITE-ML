# 🔔 Payment Gateway Webhook Setup Instructions

## Overview

Webhooks allow payment gateways to notify your system about payment status changes. This guide explains how to configure webhooks for each payment gateway.

---

## 🌐 General Webhook Requirements

### URL Format

All webhooks use the same base URL pattern:
```
https://yourdomain.com/api/v1/payments/webhooks/[gateway]
```

Where `[gateway]` is one of:
- `idram`
- `ameriabank`
- `inecobank`
- `arca`

### Requirements

1. **HTTPS Required (Production):**
   - Webhooks must use HTTPS in production
   - SSL certificate must be valid
   - No self-signed certificates

2. **Publicly Accessible:**
   - URLs must be accessible from the internet
   - No IP whitelisting (gateway IPs may change)
   - No authentication in URL (handled internally)

3. **Response Time:**
   - Respond within 5 seconds
   - Idram requires immediate "OK" response

4. **Idempotency:**
   - Webhooks may be called multiple times
   - System handles duplicates automatically

---

## 💳 Idram Webhook Setup

### Webhook URLs

Configure in Idram merchant dashboard:

1. **Result URL (RESULT_URL):**
   ```
   https://yourdomain.com/api/v1/payments/webhooks/idram
   ```
   - Used for precheck and payment confirmation
   - Must return "OK" for successful processing

2. **Success URL (SUCCESS_URL):**
   ```
   https://yourdomain.com/api/v1/payments/callback/success
   ```
   - Customer redirect after successful payment

3. **Fail URL (FAIL_URL):**
   ```
   https://yourdomain.com/api/v1/payments/callback/fail
   ```
   - Customer redirect after failed payment

### Webhook Flow

1. **Precheck Request:**
   - Sent before payment execution
   - Verifies order exists and amount matches
   - Must return "OK" (200 status)

2. **Payment Confirmation:**
   - Sent after payment completion
   - Contains payment details and checksum
   - Checksum verified using MD5
   - Must return "OK" (200 status)

### Request Format

**Precheck:**
```
POST /api/v1/payments/webhooks/idram
Content-Type: application/x-www-form-urlencoded

EDP_PRECHECK=YES
EDP_BILL_NO=250113-12345
EDP_REC_ACCOUNT=100000114
EDP_AMOUNT=1000.00
```

**Payment Confirmation:**
```
POST /api/v1/payments/webhooks/idram
Content-Type: application/x-www-form-urlencoded

EDP_BILL_NO=250113-12345
EDP_REC_ACCOUNT=100000114
EDP_PAYER_ACCOUNT=123456789
EDP_AMOUNT=1000.00
EDP_TRANS_ID=12345678901234
EDP_TRANS_DATE=13/01/2025
EDP_CHECKSUM=ABC123...
```

### Response Format

**Success:**
```
HTTP/1.1 200 OK
Content-Type: text/plain

OK
```

**Error:**
```
HTTP/1.1 500 Internal Server Error
Content-Type: text/plain

ERROR
```

### Checksum Verification

Checksum is calculated as:
```
MD5(EDP_REC_ACCOUNT:EDP_AMOUNT:SECRET_KEY:EDP_BILL_NO:EDP_PAYER_ACCOUNT:EDP_TRANS_ID:EDP_TRANS_DATE)
```

---

## 🏦 Ameriabank Webhook Setup

### Webhook URL

Configure in Ameriabank merchant dashboard:

```
https://yourdomain.com/api/v1/payments/webhooks/ameriabank
```

### Request Format

```
POST /api/v1/payments/webhooks/ameriabank
Content-Type: application/json

{
  "OrderID": "250113-12345",
  "PaymentID": "payment-id",
  "ResponseCode": "00",
  "Status": "Completed",
  ...
}
```

### Response Format

**Success:**
```json
{
  "success": true,
  "status": "completed"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## 🏦 Inecobank Webhook Setup

### Webhook URL

Configure in Inecobank merchant dashboard:

```
https://yourdomain.com/api/v1/payments/webhooks/inecobank
```

### Request Format

```
POST /api/v1/payments/webhooks/inecobank
Content-Type: application/json

{
  "orderNumber": "250113-12345",
  "status": "1",
  "action": "payment",
  ...
}
```

### Status Codes

- `0` or `"0"` - Pending
- `1` or `"1"` - Completed
- `2` or `"2"` - Failed

---

## 🏦 ArCa Webhook Setup

### Webhook URL

Configure in ArCa merchant dashboard:

```
https://yourdomain.com/api/v1/payments/webhooks/arca
```

### Request Format

```
POST /api/v1/payments/webhooks/arca
Content-Type: application/json

{
  "orderNumber": "250113-12345",
  "status": "1",
  "action": "payment",
  ...
}
```

### Status Codes

- `0` or `"0"` - Pending
- `1` or `"1"` - Completed
- `2` or `"2"` - Failed

---

## 🧪 Testing Webhooks

### Local Development

For local testing, use a tunneling service:

1. **ngrok:**
   ```bash
   ngrok http 3000
   ```
   Use ngrok URL: `https://abc123.ngrok.io/api/v1/payments/webhooks/idram`

2. **localtunnel:**
   ```bash
   npx localtunnel --port 3000
   ```

### Test Mode

1. Enable test mode in gateway configuration
2. Use test credentials
3. Configure test webhook URLs
4. Test payment flow
5. Verify webhook processing

### Webhook Logs

View webhook logs in admin panel:
- All webhook requests are logged
- Check processing status
- Review error messages
- Verify signature validation

---

## 🔒 Security

### Signature Verification

All webhooks are verified:
- **Idram:** MD5 checksum verification
- **Other gateways:** Signature verification (if supported)

### IP Whitelisting

**Not Recommended:**
- Gateway IPs may change
- Multiple IPs may be used
- Use signature verification instead

### HTTPS

**Required for Production:**
- All webhook URLs must use HTTPS
- Valid SSL certificate required
- No self-signed certificates

---

## 📊 Monitoring

### Webhook Logs

All webhooks are logged in `PaymentWebhookLog` table:
- Request payload
- Headers
- Signature
- Processing status
- Error messages
- IP address
- User agent

### Admin Panel

View webhook logs:
- Navigate to admin panel
- Check payment gateway details
- Review webhook history

---

## 🐛 Troubleshooting

### Webhook Not Received

1. **Check URL:**
   - Verify URL is correct
   - Check for typos
   - Ensure HTTPS in production

2. **Check Accessibility:**
   - Test URL in browser (should return error, not 404)
   - Verify firewall settings
   - Check DNS resolution

3. **Check Gateway Configuration:**
   - Verify URL in gateway dashboard
   - Check gateway logs
   - Contact gateway support

### Webhook Processing Errors

1. **Check Logs:**
   - Review webhook logs in admin panel
   - Check console logs
   - Review error messages

2. **Verify Signature:**
   - Check signature verification
   - Verify secret key is correct
   - Review signature calculation

3. **Check Order:**
   - Verify order exists
   - Check order amount matches
   - Review order status

---

## 📝 Best Practices

1. **Always Test First:**
   - Use test mode
   - Test all scenarios
   - Verify webhook processing

2. **Monitor Logs:**
   - Regularly check webhook logs
   - Review error patterns
   - Monitor processing times

3. **Handle Retries:**
   - Webhooks may be retried
   - Ensure idempotency
   - Handle duplicate requests

4. **Error Handling:**
   - Return appropriate status codes
   - Log all errors
   - Notify admins of critical errors

---

## 🔗 Related Documentation

- [API Documentation](PAYMENT-API-DOCUMENTATION.md)
- [Configuration Guide](PAYMENT-CONFIGURATION-GUIDE.md)
- [Troubleshooting Guide](PAYMENT-TROUBLESHOOTING.md)


