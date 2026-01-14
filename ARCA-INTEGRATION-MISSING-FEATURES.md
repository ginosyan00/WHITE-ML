# ArCa (iPay) Integration - Missing Features Analysis

## Վերլուծություն vPOS Merchant API ձեռնարկի հիման վրա

### ✅ Ինչ արդեն արված է:

1. **Հիմնական API endpoints:**
   - ✅ `register.do` - Օրդերի գրանցում (ArcaPaymentService)
   - ✅ `registerPreAuth.do` - Օրդերի գրանցում pre-authorization-ով
   - ✅ `getOrderStatusExtended.do` - Օրդերի ստատուսի ստուգում
   - ✅ `refund.do` - Գումարի վերադարձ
   - ✅ `reverse.do` - Գործարքի չեղարկում
   - ✅ `deposit.do` - Pre-authorized գործարքի ավարտում
   - ✅ `verifyEnrollment.do` - 3DS enrollment check
   - ✅ `paymentOrderBinding.do` - Վճարում կապված քարտով
   - ✅ `unBindCard.do` - Քարտի կապի ապաակտիվացում
   - ✅ `bindCard.do` - Քարտի կապի ակտիվացում
   - ✅ `getBindings.do` - Կապված քարտերի ցուցակ
   - ✅ `threeds2/getUrls.do` - 3DS2 URL-ների ստացում
   - ✅ `processform.do` - Client-side card input processing
   - ✅ `paymentorder.do` - Վճարում client-side card input-ով
   - ✅ `paymentOrderRecurring.do` - Recurring payment execution
   - ✅ `processformtransfer.do` - P2P payments

2. **Հիմնական ֆունկցիոնալություն:**
   - ✅ Payment initiation
   - ✅ Payment status checking (with full orderStatus mapping 0-6)
   - ✅ Action code parsing and handling
   - ✅ Extended status parsing (paymentAmountInfo, bankInfo, cardAuthInfo)
   - ✅ Webhook processing
   - ✅ Multi-currency support (AMD, USD, EUR, RUB)
   - ✅ Test/Production mode support
   - ✅ Two-stage payments (pre-auth + deposit)
   - ✅ Refunds (partial and multiple)
   - ✅ Reversals
   - ✅ Card bindings (save cards for future payments)
   - ✅ 3DS2 support (client-side card input)
   - ✅ Recurring payments
   - ✅ P2P payments
   - ✅ jsonParams support (recurring, transaction_type, clientId, etc.)

3. **API Routes:**
   - ✅ `/api/v1/payments/refund` - Refund endpoint
   - ✅ `/api/v1/payments/reverse` - Reverse endpoint
   - ✅ `/api/v1/payments/deposit` - Deposit endpoint
   - ✅ `/api/v1/payments/bindings` - Bindings endpoint (GET list, POST payment)

---

## ✅ Բոլոր հիմնական features-ները ավարտված են!

### 1. **Երկաստիճան (Two-Stage) Payment Support** ✅

**Ավարտված:**
- ✅ `registerPreAuth.do` - Օրդերի գրանցում pre-authorization-ով
- ✅ `deposit.do` - Հաստատված pre-auth-ի ավարտում (deposit)
- ✅ `reverse.do` - Օրդերի չեղարկում (reversal)

**Ինչու է կարևոր:**
- Երկաստիճան վճարումները թույլ են տալիս նախ ստուգել քարտի վճարունակությունը, ապա ավարտել գործարքը
- Reversal-ը թույլ է տալիս չեղարկել գործարքը մինչև deposit-ը
- Deposit-ը ավարտում է pre-authorized գործարքը

**Ձեռնարկի հղում:** 
- 7.2.1 - registerPreAuth (էջ 37-39)
- 7.2.3 - deposit (էջ 42-43)
- 7.1.3 / 7.2.4 - reverse (էջ 30-31, 44-45)

---

### 2. **Refund (Վերադարձ) Support** ✅

**Ավարտված:**
- ✅ `refund.do` - Գումարի վերադարձ

**Ինչու է կարևոր:**
- Հնարավորություն վերադարձնելու գումարը հաճախորդին
- Կարող է լինել մասնակի վերադարձ
- Կարող է լինել բազմակի վերադարձ (մինչև օրդերի գումարը)

**Ձեռնարկի հղում:**
- 7.1.4 - refund (էջ 31-32)
- 7.2.5 - refund (էջ 45-46)

---

### 3. **3DS Card Enrollment Check** ✅

**Ավարտված:**
- ✅ `verifyEnrollment.do` - Ստուգում, թե արդյոք քարտը ներգրավված է 3DS-ում

**Ինչու է կարևոր:**
- Նախապես ստուգել, թե արդյոք քարտը աջակցում է 3D Secure
- Կարող է օգտագործվել UI-ում ցուցադրելու համար
- Կարող է օգնել որոշելու, թե ինչ վճարման հոսք օգտագործել

**Ձեռնարկի հղում:**
- 7.1.6 - verifyEnrollment (էջ 36-37)
- 7.2.8 - verifyEnrollment (էջ 51-52)

---

### 4. **Card Bindings (Քարտերի կապում)** ✅

**Ավարտված:**
- ✅ `paymentOrderBinding.do` - Վճարում կապված քարտով
- ✅ `unBindCard.do` - Քարտի կապի ապաակտիվացում
- ✅ `bindCard.do` - Քարտի կապի ակտիվացում
- ✅ `getBindings.do` - Կապված քարտերի ցուցակ

**Ինչու է կարևոր:**
- Հաճախորդները կարող են պահել իրենց քարտերը ապագա վճարումների համար
- Recurring payments (կրկնվող վճարումներ) աջակցություն
- Ավելի արագ checkout փորձառություն

**Ձեռնարկի հղում:**
- 11 - Описание функционала связок (էջ 60-65)
- 11.3.1 - Создание связки
- 11.3.2 - paymentOrderBinding (էջ 61-62)
- 11.3.3 - unBindCard (էջ 62-63)
- 11.3.4 - bindCard (էջ 63-64)
- 11.3.5 - getBindings (էջ 64-65)

---

### 5. **3DS2 Support (Client-Side Card Input)** ✅

**Ավարտված:**
- ✅ `threeds2/getUrls.do` - 3DS2 URL-ների ստացում
- ✅ `processform.do` - Քարտի տվյալների ուղարկում (client-side)
- ✅ `paymentorder.do` - Վճարում client-side card input-ով
- ✅ Client info collection (browser data)
- ✅ 3DS2 challenge handling

**Ինչու է կարևոր:**
- Ավելի ժամանակակից 3DS2 աջակցություն
- Client-side card input (PCI DSS compliance պահանջում է)
- Ավելի լավ UX (չի պահանջում redirect payment gateway-ի էջ)

**Ձեռնարկի հղում:**
- 16 - 3DS2 with card on client side (էջ 69-73)
- 17 - 3DS2 with Binding on client side (էջ 74-76)
- 5.2 - Схема с вводом реквизитов на стороне Магазина (էջ 13-16)

---

### 6. **Recurring Payments (Կրկնվող վճարումներ)** ✅

**Ավարտված:**
- ✅ `paymentOrderRecurring.do` - Recurring payment execution
- ✅ Recurring payment initialization (jsonParams-ում)
- ✅ Recurring payment management

**Ինչու է կարևոր:**
- Subscription-based business models
- Ավտոմատ վճարումներ
- Հաճախորդի հարմարություն

**Ձեռնարկի հղում:**
- 12 - Рекуррентные платежи (էջ 66-67)

---

### 7. **P2P Payments (Card-to-Card)** ✅

**Ավարտված:**
- ✅ P2P payment support (transaction_type: "transfer")
- ✅ `processformtransfer.do` - P2P payment processing
- ✅ P2P_credit support (via jsonParams)

**Ինչու է կարևոր:**
- Card-to-card transfers
- Հատուկ բիզնես դեպքեր

**Ձեռնարկի հղում:**
- 13 - P2P платежи (էջ 67)
- 14 - P2Pcredit платежи (էջ 68)
- 15 - Использование связок при P2P и P2P_credit (էջ 68-69)

---

### 8. **Payment Page Customization**

**Բացակայում է:**
- ❌ Custom payment page upload
- ❌ Payment page requirements implementation
- ❌ Error page customization

**Ինչու է կարևոր:**
- Brand consistency
- Custom user experience
- Localization

**Ձեռնարկի հղում:**
- 8 - Оформление платежной страницы (էջ 53-58)

---

### 9. **Additional Parameters Support** ✅

**Ավարտված:**
- ✅ `jsonParams` full support (recurring, transaction_type, etc.)
- ✅ `clientId` support for bindings
- ✅ `language` parameter support
- ⚠️ `sessionTimeoutSecs` customization (can be added if needed)
- ⚠️ `pageView` parameter (MOBILE/DESKTOP) (can be added if needed)

**Ինչու է կարևոր:**
- Ավելի ճկուն ինտեգրացիա
- Mobile optimization
- Multi-language support

**Ձեռնարկի հղում:**
- 7.1.1 - register parameters (էջ 24-26)
- 7.2.1 - registerPreAuth parameters (էջ 37-39)

---

### 10. **Order Status Mapping** ✅

**Ավարտված:**
- ✅ Full orderStatus mapping (0-6)
- ✅ actionCode handling
- ✅ Extended status information parsing
- ✅ Payment history tracking (via providerResponse)

**Ձեռնարկի հղում:**
- 5.5 - Состояния заказа (էջ 20-22)
- 5.6 - Правила переходов (էջ 20-22)
- 5.7 - История заказа (էջ 22-23)
- 18.1 - Список значений action code (էջ 76-79)

---

## 📋 Առաջնահերթություն (Priority)

### 🔴 **CRITICAL (Պարտադիր):**
1. **Refund support** - Հաճախորդների վերադարձների համար
2. **Reverse support** - Գործարքների չեղարկման համար
3. **Full orderStatus mapping** - Ճիշտ ստատուսների ցուցադրում

### 🟡 **HIGH (Կարևոր):**
4. **Two-stage payments** - Pre-auth և deposit
5. **3DS enrollment check** - UX բարելավում
6. **Extended status parsing** - Ավելի մանրամասն տեղեկություն

### 🟢 **MEDIUM (Ցանկալի):**
7. **Card bindings** - Recurring payments-ի համար
8. **3DS2 client-side** - Modern payment flow
9. **Recurring payments** - Subscription support

### 🔵 **LOW (Հետագայում):**
10. **P2P payments** - Հատուկ դեպքեր
11. **Payment page customization** - Branding

---

## 🔧 Ինչ պետք է արվի:

### 1. ArcaPaymentService-ում ավելացնել:

```typescript
// Two-stage payments
async registerPreAuth(order: PaymentOrder): Promise<PaymentResponse>
async deposit(orderId: string, amount?: number): Promise<PaymentResponse>
async reverse(orderId: string): Promise<PaymentResponse>

// Refund
async refund(orderId: string, amount: number): Promise<PaymentResponse>

// 3DS Check
async verifyEnrollment(pan: string): Promise<{ enrolled: 'Y' | 'N' | 'U', emitterName?: string }>

// Bindings
async paymentOrderBinding(mdOrder: string, bindingId: string, cvc?: string): Promise<PaymentResponse>
async unBindCard(bindingId: string): Promise<void>
async bindCard(bindingId: string): Promise<void>
async getBindings(clientId: string): Promise<Binding[]>

// 3DS2
async get3DS2Urls(mdOrder: string): Promise<ThreeDS2Urls>
async processForm(cardData: CardData, mdOrder: string): Promise<PaymentResponse>
async sendClientInfo(threeDSServerTransID: string, clientInfo: ClientInfo): Promise<void>

// Recurring
async paymentOrderRecurring(mdOrder: string, recurringId: string): Promise<PaymentResponse>
```

### 2. Order Status Mapping-ի բարելավում:

```typescript
// Map ArCa orderStatus to our PaymentStatus
const orderStatusMap = {
  0: 'pending',      // CREATED
  1: 'pending',      // APPROVED (pre-authorized)
  2: 'completed',    // DEPOSITED
  3: 'cancelled',    // REVERSED
  4: 'refunded',     // REFUNDED
  5: 'pending',       // Authorization started
  6: 'failed',       // DECLINED
}
```

### 3. API Routes ավելացնել:

```typescript
// /api/v1/payments/refund
// /api/v1/payments/reverse
// /api/v1/payments/deposit
// /api/v1/payments/bindings
// /api/v1/payments/verify-enrollment
```

---

## 📝 Եզրակացություն

Ներկայիս ինտեգրացիան աջակցում է միայն **հիմնական** payment flow-ը:
- ✅ Order registration
- ✅ Status checking
- ✅ Basic webhook processing

**Բացակայում են կարևոր գործառույթներ:**
- ❌ Refunds (վերադարձներ)
- ❌ Reversals (չեղարկումներ)
- ❌ Two-stage payments
- ❌ Card bindings
- ❌ 3DS2 support
- ❌ Recurring payments

**Առաջարկություն:** Սկսել Critical priority-ից (Refund, Reverse, Status mapping), ապա անցնել High priority-ին:

---

## 📝 Task List (TODO)

### 🔴 CRITICAL Priority Tasks ✅

- [x] **arca-refund** - Implement refund.do API - Գումարի վերադարձ հաճախորդին (կարող է լինել մասնակի և բազմակի) ✅
- [x] **arca-reverse** - Implement reverse.do API - Գործարքի չեղարկում (reversal) մինչև deposit ✅
- [x] **arca-order-status-mapping** - Improve orderStatus mapping - Map all ArCa statuses (0-6) to PaymentStatus correctly ✅
- [x] **arca-action-code-handling** - Implement actionCode handling - Parse and handle all action codes from API responses ✅

### 🟡 HIGH Priority Tasks ✅

- [x] **arca-deposit** - Implement deposit.do API - Pre-authorized գործարքի ավարտում (two-stage payments) ✅
- [x] **arca-register-preauth** - Implement registerPreAuth.do API - Օրդերի գրանցում pre-authorization-ով (two-stage payments) ✅
- [x] **arca-verify-enrollment** - Implement verifyEnrollment.do API - Ստուգում, թե արդյոք քարտը ներգրավված է 3DS-ում ✅
- [x] **arca-extended-status** - Parse extended status info - paymentAmountInfo, bankInfo, cardAuthInfo from getOrderStatusExtended ✅

### 🟢 MEDIUM Priority Tasks ✅

- [x] **arca-bindings-payment** - Implement paymentOrderBinding.do - Վճարում կապված քարտով ✅
- [x] **arca-bindings-unbind** - Implement unBindCard.do - Քարտի կապի ապաակտիվացում ✅
- [x] **arca-bindings-bind** - Implement bindCard.do - Քարտի կապի ակտիվացում ✅
- [x] **arca-bindings-list** - Implement getBindings.do - Կապված քարտերի ցուցակ ստացում ✅
- [x] **arca-3ds2-geturls** - Implement threeds2/getUrls.do - 3DS2 URL-ների ստացում ✅
- [x] **arca-3ds2-processform** - Implement processform.do - Client-side card input processing ✅
- [x] **arca-3ds2-paymentorder** - Implement paymentorder.do - Վճարում client-side card input-ով ✅
- [x] **arca-3ds2-clientinfo** - Implement client info collection - Browser data gathering for 3DS2 ✅
- [x] **arca-recurring** - Implement paymentOrderRecurring.do - Recurring payment execution ✅

### 🔵 LOW Priority Tasks ✅

- [x] **arca-p2p** - Implement P2P payments - Card-to-card transfers (processformtransfer.do) ✅
- [x] **arca-jsonparams** - Add full jsonParams support - recurring, transaction_type, clientId, etc. ✅
- [x] **arca-api-routes** - Create API routes for new endpoints - /api/v1/payments/refund, /reverse, /deposit, /bindings, etc. ✅

---

## 📊 Progress Tracking

- **Total Tasks:** 20
- **Completed:** 20 ✅
- **In Progress:** 0
- **Pending:** 0

### By Priority:
- 🔴 Critical: 4 tasks ✅ (100%)
- 🟡 High: 4 tasks ✅ (100%)
- 🟢 Medium: 9 tasks ✅ (100%)
- 🔵 Low: 3 tasks ✅ (100%)

## 🎉 Բոլոր task-երը ավարտված են!

**Ամբողջական ArCa (iPay) ինտեգրացիան պատրաստ է օգտագործման:**
- ✅ Բոլոր հիմնական API endpoints-ները
- ✅ Բոլոր payment flows-ները (one-stage, two-stage, recurring, P2P)
- ✅ Card bindings support
- ✅ 3DS2 support
- ✅ API routes-ները
- ✅ Error handling և logging

