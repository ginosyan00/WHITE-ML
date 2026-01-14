# 💳 Payment Gateway Setup Instructions

## ✅ Ավարտված աշխատանքներ

Բոլոր payment gateway integration task-երը ավարտված են:

- ✅ Database Schema (PaymentGateway, PaymentAttempt, PaymentWebhookLog)
- ✅ Payment Services (Idram, Ameriabank, Inecobank, ArCa)
- ✅ API Routes (Admin CRUD, Init, Webhooks, Callbacks)
- ✅ Admin Panel UI
- ✅ Checkout Integration
- ✅ Encryption (AES-256-GCM)
- ✅ Testing & Documentation

---

## 🚀 Setup Steps

### 1. Environment Variables

Ստեղծեք կամ թարմացրեք `.env` ֆայլը root directory-ում:

```bash
# Required for Payment Gateways
PAYMENT_ENCRYPTION_KEY="your-32-character-minimum-encryption-key-here"

# If not set, will fall back to JWT_SECRET
# But recommended to use separate key for payment encryption
```

**Կարևոր:** 
- Encryption key-ը պետք է լինի առնվազն 32 characters
- Production-ում օգտագործեք strong, random key
- Never commit `.env` file to version control

### 2. Database Migration

Migration-ը արդեն ստեղծված է: Run արեք:

```bash
cd packages/db
npm run db:push
# OR for production:
npm run db:migrate deploy
```

**Migration file:** `packages/db/prisma/migrations/20260113202907_add_payment_gateways/migration.sql`

**Creates:**
- `payment_gateways` table
- `payment_attempts` table
- `payment_webhook_logs` table
- Extends `orders` and `payments` tables

### 3. Generate Prisma Client

```bash
cd packages/db
npm run db:generate
```

**Note:** Եթե file lock error ստանաք (Windows-ում), փակեք բոլոր running processes-ները, որոնք օգտագործում են Prisma client-ը, և նորից run արեք:

### 4. Start Development Server

```bash
npm run dev
```

---

## 🔧 Configuration

### Admin Panel

1. **Navigate to Admin Panel:**
   ```
   http://localhost:3000/admin/payments
   ```

2. **Add Payment Gateway:**
   - Click "Add Gateway"
   - Select gateway type (Idram, Ameriabank, Inecobank, ArCa)
   - Fill configuration fields
   - Enable test mode for testing
   - Save

### Gateway Configuration

#### Idram
- **Production ID:** Your Idram merchant ID
- **Production Key:** Your Idram secret key
- **Test ID:** Test merchant ID (optional)
- **Test Key:** Test secret key (optional)
- **Rocket Line:** Enable/disable
- **Default Language:** en/hy/ru

#### Ameriabank
- **Client ID:** Your Ameriabank client ID
- **Currency Accounts:** Username/Password for each currency (AMD, USD, EUR, RUB)
- **Test Order ID Range:** Min/Max for test mode

#### Inecobank
- **Currency Accounts:** Username/Password for each currency (AMD, USD, EUR, RUB)

#### ArCa
- **Bank:** Select bank from dropdown
- **Currency Accounts:** Username/Password for each currency (AMD, USD, EUR, RUB)
- **Test Port:** Port for test mode (default: 8443)

---

## 🧪 Testing

### Test Mode

1. **Enable Test Mode** in gateway configuration
2. **Use Test Credentials** provided by payment gateway
3. **Test Payment Flow:**
   - Create test order
   - Select payment gateway
   - Complete payment in test environment
   - Verify webhook processing

### Webhook Testing (Local)

For local webhook testing, use ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Start development server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Use ngrok URL in gateway webhook configuration:
# https://abc123.ngrok.io/api/v1/payments/webhooks/idram
```

---

## 📚 Documentation

Complete documentation available in `docs/` directory:

- **API Documentation:** `docs/PAYMENT-API-DOCUMENTATION.md`
- **Configuration Guide:** `docs/PAYMENT-CONFIGURATION-GUIDE.md`
- **Webhook Setup:** `docs/PAYMENT-WEBHOOK-SETUP.md`
- **Troubleshooting:** `docs/PAYMENT-TROUBLESHOOTING.md`
- **Testing Guide:** `docs/PAYMENT-TESTING-GUIDE.md`

---

## 🔒 Security

### Encryption

- All sensitive configuration data (passwords, keys) is encrypted using AES-256-GCM
- Encryption key stored in `PAYMENT_ENCRYPTION_KEY` environment variable
- Sensitive data is never returned in API responses

### Webhook Security

- All webhooks are verified using gateway-specific methods:
  - **Idram:** MD5 checksum verification
  - **Other gateways:** API verification calls
- Webhook logs stored for audit trail

---

## ✅ Checklist

Before going to production:

- [ ] `PAYMENT_ENCRYPTION_KEY` is set
- [ ] Database migration is run
- [ ] Prisma client is generated
- [ ] Payment gateways are configured in admin panel
- [ ] Test mode is verified
- [ ] Webhook URLs are configured
- [ ] Webhooks are publicly accessible (HTTPS in production)
- [ ] SSL certificate is valid
- [ ] Error handling is tested
- [ ] Logging is working

---

## 🆘 Troubleshooting

### Common Issues

1. **Migration fails:**
   - Check `DATABASE_URL` is correct
   - Ensure database is accessible
   - Check PostgreSQL is running

2. **Prisma generate fails (file lock):**
   - Close all running processes using Prisma
   - Restart terminal
   - Try again

3. **Webhook not received:**
   - Check webhook URL is correct
   - Verify URL is publicly accessible
   - Check firewall settings
   - Review webhook logs in admin panel

4. **Payment fails:**
   - Verify credentials are correct
   - Check test/production mode matches
   - Review payment attempt logs

See `docs/PAYMENT-TROUBLESHOOTING.md` for more details.

---

## 📞 Support

For issues:
1. Check documentation in `docs/` directory
2. Review webhook logs in admin panel
3. Check console logs for errors
4. Verify environment variables
5. Contact payment gateway support if needed

---

**Status:** ✅ **READY FOR TESTING**  
**Last Updated:** 2025-01-13

