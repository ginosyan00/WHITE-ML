# 🔧 Payment Gateway Troubleshooting Guide

## Common Issues and Solutions

---

## ❌ Payment Initiation Fails

### Issue: "Failed to initiate payment"

**Possible Causes:**
1. Gateway not enabled
2. Invalid credentials
3. Test/production mode mismatch
4. Missing configuration fields

**Solutions:**
1. **Check Gateway Status:**
   - Go to `/admin/payments`
   - Verify gateway is enabled
   - Check test/production mode

2. **Verify Credentials:**
   - Check credentials are correct
   - Verify test credentials for test mode
   - Ensure production credentials for production mode

3. **Check Configuration:**
   - All required fields must be filled
   - Currency accounts must be configured
   - Bank ID must be set (for ArCa)

4. **Review Logs:**
   - Check console logs for errors
   - Review payment attempt logs
   - Check API response

---

## ❌ Webhook Not Received

### Issue: Payment completed but webhook not processed

**Possible Causes:**
1. Webhook URL incorrect
2. URL not publicly accessible
3. Firewall blocking requests
4. Gateway configuration error

**Solutions:**
1. **Verify Webhook URL:**
   ```
   https://yourdomain.com/api/v1/payments/webhooks/[gateway]
   ```
   - Check for typos
   - Ensure HTTPS in production
   - Verify gateway name is correct

2. **Test URL Accessibility:**
   - Open URL in browser (should return error, not 404)
   - Use online tools to test accessibility
   - Check from different networks

3. **Check Gateway Configuration:**
   - Verify URL in gateway admin panel
   - Check gateway logs
   - Contact gateway support

4. **Review Webhook Logs:**
   - Check admin panel for webhook logs
   - Review processing status
   - Check error messages

---

## ❌ Webhook Signature Verification Fails

### Issue: "Checksum verification failed" (Idram)

**Possible Causes:**
1. Incorrect secret key
2. Checksum calculation error
3. Data corruption

**Solutions:**
1. **Verify Secret Key:**
   - Check secret key in gateway configuration
   - Ensure key matches gateway dashboard
   - Verify test/production key is correct

2. **Check Checksum Calculation:**
   - Idram: `MD5(EDP_REC_ACCOUNT:EDP_AMOUNT:SECRET_KEY:EDP_BILL_NO:EDP_PAYER_ACCOUNT:EDP_TRANS_ID:EDP_TRANS_DATE)`
   - Verify all fields are included
   - Check field order

3. **Review Webhook Payload:**
   - Check webhook logs for received data
   - Verify all required fields present
   - Check for data encoding issues

---

## ❌ Payment Status Not Updated

### Issue: Payment completed but order status unchanged

**Possible Causes:**
1. Webhook not processed
2. Order not found
3. Payment ID mismatch
4. Database error

**Solutions:**
1. **Check Webhook Processing:**
   - Review webhook logs
   - Verify webhook was received
   - Check processing status

2. **Verify Order:**
   - Check order exists in database
   - Verify order ID matches
   - Review order payment status

3. **Check Payment Record:**
   - Verify payment record exists
   - Check payment ID matches
   - Review payment status

4. **Review Database:**
   - Check for database errors
   - Verify foreign key constraints
   - Review transaction logs

---

## ❌ Gateway Not Appearing in Checkout

### Issue: Payment gateway not shown in checkout

**Possible Causes:**
1. Gateway not enabled
2. Test/production mode mismatch
3. API error
4. Frontend error

**Solutions:**
1. **Check Gateway Status:**
   - Go to `/admin/payments`
   - Verify gateway is enabled
   - Check test mode matches environment

2. **Test API:**
   ```bash
   curl http://localhost:3000/api/v1/payments/gateways
   ```
   - Verify API returns enabled gateways
   - Check response format
   - Review error messages

3. **Check Frontend:**
   - Open browser console
   - Check for JavaScript errors
   - Review API calls in Network tab

4. **Verify Environment:**
   - Check `NODE_ENV` matches test mode
   - Verify API URL is correct
   - Check CORS settings

---

## ❌ Encryption/Decryption Errors

### Issue: "Failed to encrypt/decrypt data"

**Possible Causes:**
1. Encryption key not set
2. Key too short
3. Key changed
4. Data corruption

**Solutions:**
1. **Check Environment Variable:**
   ```bash
   echo $PAYMENT_ENCRYPTION_KEY
   ```
   - Verify key is set
   - Check key length (minimum 32 characters)
   - Ensure key hasn't changed

2. **Development Mode:**
   - In development, encryption errors fall back to plain text
   - Check console for warnings
   - Verify data is stored correctly

3. **Production Mode:**
   - Encryption is required
   - Set strong encryption key
   - Never change key after data is encrypted

4. **Data Migration:**
   - If key changed, re-encrypt all data
   - Or migrate to new key
   - Backup data before migration

---

## ❌ Order Creation Fails

### Issue: "Failed to create order" during checkout

**Possible Causes:**
1. Cart is empty
2. Stock insufficient
3. Validation error
4. Database error

**Solutions:**
1. **Check Cart:**
   - Verify cart has items
   - Check item quantities
   - Review cart totals

2. **Verify Stock:**
   - Check product stock
   - Verify variant stock
   - Review stock reservation

3. **Check Validation:**
   - Verify all required fields
   - Check email format
   - Review phone number format

4. **Review Logs:**
   - Check console logs
   - Review error messages
   - Check database errors

---

## ❌ Payment Redirect Fails

### Issue: Redirect to payment gateway doesn't work

**Possible Causes:**
1. Payment URL not generated
2. Form data missing
3. Gateway error
4. Network issue

**Solutions:**
1. **Check Payment Response:**
   - Verify `paymentUrl` or `formData` in response
   - Check form action URL
   - Review form method

2. **Test Payment URL:**
   - Open payment URL in browser
   - Verify gateway page loads
   - Check for gateway errors

3. **Review Form Submission:**
   - Check form data is complete
   - Verify all required fields
   - Review form action URL

4. **Check Network:**
   - Verify internet connection
   - Check gateway is accessible
   - Review firewall settings

---

## 🔍 Debugging Tips

### 1. Enable Detailed Logging

Check console logs for:
- `[PaymentService]` - Payment service logs
- `[PaymentGatewayService]` - Gateway service logs
- `[WEBHOOK]` - Webhook processing logs
- `[Encryption]` - Encryption/decryption logs

### 2. Check Database

Query payment-related tables:
```sql
-- Check gateways
SELECT * FROM payment_gateways WHERE enabled = true;

-- Check payments
SELECT * FROM payments ORDER BY createdAt DESC LIMIT 10;

-- Check webhook logs
SELECT * FROM payment_webhook_logs ORDER BY createdAt DESC LIMIT 10;

-- Check payment attempts
SELECT * FROM payment_attempts ORDER BY createdAt DESC LIMIT 10;
```

### 3. Test API Endpoints

Use curl or Postman:
```bash
# Get gateways
curl http://localhost:3000/api/v1/payments/gateways

# Initiate payment
curl -X POST http://localhost:3000/api/v1/payments/init \
  -H "Content-Type: application/json" \
  -d '{"orderId": "..."}'
```

### 4. Review Webhook Logs

In admin panel:
- Navigate to payment gateway
- View webhook logs
- Check processing status
- Review error messages

---

## 📞 Getting Help

### 1. Check Documentation
- [API Documentation](PAYMENT-API-DOCUMENTATION.md)
- [Configuration Guide](PAYMENT-CONFIGURATION-GUIDE.md)
- [Webhook Setup](PAYMENT-WEBHOOK-SETUP.md)

### 2. Review Logs
- Console logs
- Webhook logs
- Payment attempt logs
- Database logs

### 3. Contact Support
- Payment gateway support (for gateway-specific issues)
- System administrator (for system issues)
- Development team (for code issues)

---

## ✅ Checklist

Before reporting an issue, verify:

- [ ] Gateway is enabled
- [ ] Test/production mode matches environment
- [ ] Credentials are correct
- [ ] Webhook URLs are configured
- [ ] URLs are publicly accessible
- [ ] Encryption key is set
- [ ] Database is accessible
- [ ] Logs are reviewed
- [ ] Documentation is checked

---

## 🔗 Related Documentation

- [API Documentation](PAYMENT-API-DOCUMENTATION.md)
- [Configuration Guide](PAYMENT-CONFIGURATION-GUIDE.md)
- [Webhook Setup](PAYMENT-WEBHOOK-SETUP.md)

