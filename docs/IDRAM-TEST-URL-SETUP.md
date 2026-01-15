# 🔧 Idram Test URL Setup Guide

Այս ուղեցույցը ցույց է տալիս, թե ինչ URL-ներ պետք է տաք Idram-ին Next.js-ի test environment-ի համար:

---

## 📋 Ընդհանուր տեղեկություն

Քանի որ `borboraqua.am`-ը արդեն WordPress-ով է, test-ի համար ունես մի քանի տարբերակ:

---

## 🎯 Տարբերակ 1: Test Subdomain (Առաջարկվող)

### Setup

1. **Ստեղծիր test subdomain:**
   - `test.borboraqua.am` կամ
   - `nextjs.borboraqua.am` կամ
   - `dev.borboraqua.am`

2. **Deploy Next.js application-ը այս subdomain-ին**

3. **Idram-ին տուր այս URL-ները:**

```
SUCCESS_URL: https://test.borboraqua.am/api/v1/payments/callback/success
FAIL_URL:    https://test.borboraqua.am/api/v1/payments/callback/fail
RESULT_URL:  https://test.borboraqua.am/api/v1/payments/webhooks/idram
```

### Առավելություններ
- ✅ Production-ից առանձին է
- ✅ Test-ի համար անվտանգ է
- ✅ WordPress-ի հետ conflict չկա
- ✅ Real domain, Idram-ը կընդունի

### Ինչ պետք է անես
1. DNS-ում ավելացրու A record: `test.borboraqua.am` → Next.js server IP
2. SSL certificate ավելացրու subdomain-ի համար
3. Deploy Next.js-ը այս subdomain-ին

---

## 🎯 Տարբերակ 2: ngrok (Local Development)

Եթե դեռ local-ում ես test անում:

### Setup

1. **Տեղադրիր ngrok:**
   ```bash
   npm install -g ngrok
   # կամ
   npx ngrok http 3000
   ```

2. **Սկսիր ngrok tunnel:**
   ```bash
   ngrok http 3000
   ```

3. **Ստացիր ngrok URL-ը:**
   ```
   Forwarding: https://abc123def456.ngrok.io -> http://localhost:3000
   ```

4. **Idram-ին տուր այս URL-ները:**

```
SUCCESS_URL: https://abc123def456.ngrok.io/api/v1/payments/callback/success
FAIL_URL:    https://abc123def456.ngrok.io/api/v1/payments/callback/fail
RESULT_URL:  https://abc123def456.ngrok.io/api/v1/payments/webhooks/idram
```

### ⚠️ Նշումներ
- ngrok URL-ը փոխվում է ամեն անգամ (free plan-ում)
- Test-ից առաջ պետք է նոր URL տաս Idram-ին
- Production-ի համար չի օգտագործվում

---

## 🎯 Տարբերակ 3: Staging/Dev Server

Եթե ունես staging server:

### Setup

1. **Օգտագործիր staging domain:**
   - `staging.borboraqua.am` կամ
   - `dev.borboraqua.am` կամ
   - Ցանկացած այլ subdomain

2. **Idram-ին տուր այս URL-ները:**

```
SUCCESS_URL: https://staging.borboraqua.am/api/v1/payments/callback/success
FAIL_URL:    https://staging.borboraqua.am/api/v1/payments/callback/fail
RESULT_URL:  https://staging.borboraqua.am/api/v1/payments/webhooks/idram
```

---

## 🎯 Տարբերակ 4: Նույն Domain, Տարբեր Port (Չի աշխատի)

❌ **Չի աշխատի**, քանի որ:
- Idram-ը պահանջում է HTTPS (port 443)
- WordPress-ը արդեն զբաղեցրել է root domain-ը
- Port-based routing-ը Idram-ի կողմից չի աջակցվում

---

## ✅ Առաջարկվող Լուծում

### Production Test (Idram Test Mode)

**Օգտագործիր test subdomain:**

```
SUCCESS_URL: https://test.borboraqua.am/api/v1/payments/callback/success
FAIL_URL:    https://test.borboraqua.am/api/v1/payments/callback/fail
RESULT_URL:  https://test.borboraqua.am/api/v1/payments/webhooks/idram
```

### Local Development Test

**Օգտագործիր ngrok:**

```bash
# 1. Սկսիր Next.js
npm run dev

# 2. Այլ terminal-ում սկսիր ngrok
ngrok http 3000

# 3. Ստացիր ngrok URL-ը և տուր Idram-ին
SUCCESS_URL: https://YOUR-NGROK-URL.ngrok.io/api/v1/payments/callback/success
FAIL_URL:    https://YOUR-NGROK-URL.ngrok.io/api/v1/payments/callback/fail
RESULT_URL:  https://YOUR-NGROK-URL.ngrok.io/api/v1/payments/webhooks/idram
```

---

## 📝 Idram-ին Տալիք Հաղորդագրություն

### Test Environment-ի համար

```
Բարև,

Ես ուզում եմ test անել Next.js-ով արված նոր application-ը։

Խնդրում եմ կարգավորեք test mode-ի համար հետևյալ URL-ները:

SUCCESS_URL: https://test.borboraqua.am/api/v1/payments/callback/success
FAIL_URL:    https://test.borboraqua.am/api/v1/payments/callback/fail
RESULT_URL:  https://test.borboraqua.am/api/v1/payments/webhooks/idram

Test credentials:
- Test Merchant ID: [ձեր test ID]
- Test Secret Key: [ձեր test key]

Շնորհակալություն։
```

---

## 🔍 URL-ների Ստուգում

Test-ից առաջ համոզվիր, որ բոլոր URL-ները աշխատում են:

### 1. SUCCESS_URL Test
```bash
curl -I https://test.borboraqua.am/api/v1/payments/callback/success
```
Պետք է ստանաս `302 Redirect` response

### 2. FAIL_URL Test
```bash
curl -I https://test.borboraqua.am/api/v1/payments/callback/fail
```
Պետք է ստանաս `302 Redirect` response

### 3. RESULT_URL Test
```bash
curl -X POST https://test.borboraqua.am/api/v1/payments/webhooks/idram \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "EDP_PRECHECK=YES&EDP_BILL_NO=test&EDP_REC_ACCOUNT=100000114&EDP_AMOUNT=100.00"
```
Պետք է ստանաս `200 OK` response

---

## 🚀 Production-ի համար

Երբ test-ը հաջող լինի, production-ի համար կօգտագործես նույն domain-ը:

```
SUCCESS_URL: https://borboraqua.am/api/v1/payments/callback/success
FAIL_URL:    https://borboraqua.am/api/v1/payments/callback/fail
RESULT_URL:  https://borboraqua.am/api/v1/payments/webhooks/idram
```

**Նշում:** Production-ում պետք է WordPress-ը հեռացնես root-ից կամ Next.js-ը deploy անես root-ին:

---

## 📋 Checklist

- [ ] Test subdomain ստեղծված է (test.borboraqua.am)
- [ ] DNS A record ավելացված է
- [ ] SSL certificate տեղադրված է
- [ ] Next.js application deploy արված է
- [ ] Բոլոր 3 URL-ները աշխատում են
- [ ] Idram-ին տրված են test URL-ները
- [ ] Test payment փորձարկված է
- [ ] Webhook-ները ստանում ես և process ես անում

---

## 🔗 Related Documentation

- [Payment Webhook Setup](PAYMENT-WEBHOOK-SETUP.md)
- [Payment Callback Examples](PAYMENT-CALLBACK-EXAMPLES.md)
- [Payment Configuration Guide](PAYMENT-CONFIGURATION-GUIDE.md)





