# 💳 Payment Gateway Configuration Guide

## Overview

This guide explains how to configure payment gateways in the admin panel.

---

## 🚀 Quick Start

1. **Navigate to Admin Panel:**
   - Go to `/admin/payments`
   - Click "Add Gateway"

2. **Select Gateway Type:**
   - Choose from: Idram, Ameriabank, Inecobank, ArCa

3. **Fill Configuration:**
   - Enter gateway-specific credentials
   - Set test/production mode
   - Enable/disable gateway

4. **Save:**
   - Click "Create" to save

---

## 🔧 Gateway-Specific Configuration

### Idram

**Required Fields:**
- **Idram ID (Production)** - Your Idram merchant ID
- **Idram Key (Production)** - Your Idram secret key

**Optional Fields:**
- **Idram Test ID** - Test merchant ID (for test mode)
- **Idram Test Key** - Test secret key (for test mode)
- **Rocket Line** - Enable Rocket Line feature
- **Default Language** - Interface language (`en`, `hy`, `ru`)

**How to Get Credentials:**
1. Contact Idram support
2. Sign merchant agreement
3. Receive merchant ID and secret key
4. Configure webhook URLs in Idram dashboard

**Webhook URLs:**
- Result URL: `https://yourdomain.com/api/v1/payments/webhooks/idram`
- Success URL: `https://yourdomain.com/api/v1/payments/callback/success`
- Fail URL: `https://yourdomain.com/api/v1/payments/callback/fail`

---

### Ameriabank

**Required Fields:**
- **Client ID** - Your Ameriabank client ID
- **Currency Accounts** - At least one currency account:
  - Username
  - Password

**Optional Fields:**
- **Min Test Order ID** - Minimum order ID for test mode
- **Max Test Order ID** - Maximum order ID for test mode

**Supported Currencies:**
- AMD (Armenian Dram)
- USD (US Dollar)
- EUR (Euro)
- RUB (Russian Ruble)

**How to Get Credentials:**
1. Contact Ameriabank merchant services
2. Complete merchant registration
3. Receive client ID and account credentials
4. Configure webhook URLs

**Webhook URLs:**
- Result URL: `https://yourdomain.com/api/v1/payments/webhooks/ameriabank`

---

### Inecobank

**Required Fields:**
- **Currency Accounts** - At least one currency account:
  - Username
  - Password

**Supported Currencies:**
- AMD, USD, EUR, RUB

**How to Get Credentials:**
1. Contact Inecobank merchant services
2. Complete merchant registration
3. Receive account credentials
4. Configure webhook URLs

**Webhook URLs:**
- Result URL: `https://yourdomain.com/api/v1/payments/webhooks/inecobank`

---

### ArCa (iPay)

**Required Fields:**
- **Bank** - Select bank from dropdown:
  - ACBA Bank (ID: 1)
  - Ardshinbank (ID: 2)
  - Evoca Bank (ID: 3)
  - Armswissbank (ID: 5)
  - Byblos Bank (ID: 6)
  - Araratbank (ID: 7)
  - Armeconombank (ID: 8)
  - IDBank (ID: 9)
  - Convers Bank (ID: 11)
- **Currency Accounts** - At least one currency account:
  - Username
  - Password

**Optional Fields:**
- **Test Port** - Port for test mode (default: 8443)

**Supported Currencies:**
- AMD, USD, EUR, RUB

**How to Get Credentials:**
1. Contact your bank's merchant services
2. Complete merchant registration
3. Receive account credentials
4. Configure webhook URLs

**Webhook URLs:**
- Result URL: `https://yourdomain.com/api/v1/payments/webhooks/arca`

---

## 🔐 Security Best Practices

### 1. Encryption Key

Set `PAYMENT_ENCRYPTION_KEY` in environment variables:

```bash
PAYMENT_ENCRYPTION_KEY="your-32-character-minimum-encryption-key"
```

**Important:**
- Use a strong, random key (minimum 32 characters)
- Never commit to version control
- Use different keys for development and production
- Rotate keys periodically

### 2. Test Mode

- Always test in test mode first
- Use test credentials provided by payment gateway
- Verify webhook processing
- Test all payment scenarios

### 3. Production Checklist

Before enabling production mode:

- [ ] All credentials are correct
- [ ] Webhook URLs are publicly accessible
- [ ] SSL certificate is valid
- [ ] Encryption key is set
- [ ] Test mode verified
- [ ] Error handling tested
- [ ] Monitoring set up

---

## 🌐 Webhook Configuration

### Webhook URLs

Configure these URLs in your payment gateway admin panel:

**Idram:**
- Result URL: `https://yourdomain.com/api/v1/payments/webhooks/idram`
- Success URL: `https://yourdomain.com/api/v1/payments/callback/success`
- Fail URL: `https://yourdomain.com/api/v1/payments/callback/fail`

**Ameriabank:**
- Result URL: `https://yourdomain.com/api/v1/payments/webhooks/ameriabank`

**Inecobank:**
- Result URL: `https://yourdomain.com/api/v1/payments/webhooks/inecobank`

**ArCa:**
- Result URL: `https://yourdomain.com/api/v1/payments/webhooks/arca`

### Webhook Requirements

1. **Publicly Accessible:**
   - Webhook URLs must be accessible from the internet
   - No authentication required (handled internally)
   - HTTPS required for production

2. **Idempotency:**
   - Webhooks may be called multiple times
   - System handles duplicates automatically

3. **Response Format:**
   - Idram: Must return "OK" (200 status)
   - Other gateways: JSON response

---

## 🧪 Testing

### Test Mode Setup

1. **Enable Test Mode:**
   - Set `testMode: true` in gateway configuration
   - Use test credentials

2. **Test Payment Flow:**
   - Create test order
   - Initiate payment
   - Complete payment in test environment
   - Verify webhook processing
   - Check order status update

3. **Test Scenarios:**
   - Successful payment
   - Failed payment
   - Cancelled payment
   - Webhook retry
   - Invalid webhook signature

---

## 📊 Monitoring

### Health Status

Gateway health status is tracked:
- `healthy` - Gateway is operational
- `degraded` - Gateway has issues
- `down` - Gateway is unavailable

### Logs

Payment-related logs:
- Payment attempts (PaymentAttempt model)
- Webhook requests (PaymentWebhookLog model)
- Console logs with context

### Admin Panel

View gateway status in admin panel:
- Health status indicator
- Last health check time
- Error messages

---

## 🔧 Troubleshooting

### Common Issues

1. **Webhook Not Received:**
   - Check webhook URL is correct
   - Verify URL is publicly accessible
   - Check firewall settings
   - Review webhook logs in admin panel

2. **Payment Fails:**
   - Verify credentials are correct
   - Check test/production mode matches
   - Review payment attempt logs
   - Verify order amount is valid

3. **Encryption Errors:**
   - Ensure `PAYMENT_ENCRYPTION_KEY` is set
   - Check key is at least 32 characters
   - Verify key hasn't changed

4. **Gateway Not Appearing in Checkout:**
   - Check gateway is enabled
   - Verify test mode matches environment
   - Check gateway position (sorting)

---

## 📝 Notes

- **Multiple Gateways:** You can configure multiple gateways of the same type (useful for ArCa with different banks)
- **Position:** Lower position numbers appear first in checkout
- **Encryption:** Sensitive fields are automatically encrypted on save
- **Sanitization:** Passwords are never returned in API responses

---

## 🆘 Support

For issues:
1. Check webhook logs in admin panel
2. Review payment attempt logs
3. Check console logs for errors
4. Verify environment variables
5. Contact payment gateway support if needed

