# إشعارات الطلبات (Web Push)

الإشعارات تعمل على مرحلتين:

1. **داخل التطبيق** — نغمة + توست (`dashboard.tsx`) بمجرد وصول حدث Realtime.
2. **Web Push** — إشعار نظام حقيقي يصل **حتى والتطبيق مغلق**، عبر:
   - `push_subscriptions` (جدول الاشتراكات)
   - `supabase/functions/send-order-push` (المرسل، VAPID)
   - Database Webhook على `orders` يوقظ الدالة عند كل `INSERT`

الكود جاهز بالكامل؛ ما يلي هو التفعيل على مشروعك.

---

## 1) تطبيق الـmigrations

```bash
supabase db push
```

يُطبّق:

- `20261115100000_enable_realtime_orders.sql` — يضيف `orders` إلى `supabase_realtime` (للنغمة والتوست الفوري).
- `20261115110000_push_subscriptions.sql` — جدول الاشتراكات + RLS.

## 2) توليد مفاتيح VAPID

```bash
npx web-push generate-vapid-keys
```

يُخرج:

```
Public Key:  B...
Private Key: x...
```

- **Public** → يذهب إلى الواجهة (`.env`).
- **Private** → يبقى في أسرار Supabase فقط، ولا يُرفع إلى Git أبدًا.

## 3) أسرار الدالة

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY="B..." \
  VAPID_PRIVATE_KEY="x..." \
  VAPID_SUBJECT="mailto:you@example.com" \
  PUSH_WEBHOOK_SECRET="$(openssl rand -hex 32)" \
  APP_URL="https://your-domain.com"
```

`APP_URL` اختياري: يُستخدم كأيقونة احتياطية فقط إذا فشل توقيع شعار المتجر.

احتفظ بقيمة `PUSH_WEBHOOK_SECRET` — ستحتاجها في الخطوة 5.

## 4) نشر الدالة

```bash
supabase functions deploy send-order-push --no-verify-jwt
```

(`--no-verify-jwt` مطلوب لأن Database Webhook لا يرسل توكن مستخدم؛ الحماية تتم عبر `x-webhook-secret`.)

## 5) Database Webhook على `orders`

من لوحة Supabase → **Database → Webhooks → Create a new hook**:

| الحقل | القيمة |
| --- | --- |
| Name | `new-order-push` |
| Table | `public.orders` |
| Events | `INSERT` فقط |
| Type | `HTTP Request` |
| Method | `POST` |
| URL | `https://<project-ref>.supabase.co/functions/v1/send-order-push` |
| HTTP Headers | `x-webhook-secret: <نفس القيمة من الخطوة 3>` |
| Body | الافتراضي (يحتوي `record`) |

## 6) مفتاح VAPID العام في الواجهة

ضع المفتاح العام في `.env` ثم أعد النشر (`bun run build` + نشر):

```
VITE_VAPID_PUBLIC_KEY="B..."
```

بدون هذا المفتاح يبقى Push معطّلًا بصمت (النغمة/التوست يعملان طبيعيًا).

> ملاحظة: تغيير المفتاح العام يُبطل الاشتراكات القديمة — يُصلحها العميل تلقائيًا (يلغي الاشتراك ويعيد التسجيل) عند أول فتح.

## 7) تفعيل الإشعارات على الجهاز

1. ثبّت التطبيق على الشاشة الرئيسية (PWA).
2. افتح الداشبورد → سيظهر شريط «إشعارات الطلبات» → اضغط **تفعيل** → اسمح.
3. سيُسجَّل الجهاز في `push_subscriptions` تلقائيًا.

## 8) اختبار

- **أندرويد/سطح المكتب**: أغلق التطبيق تمامًا (أو أغلقه من قائمة التطبيقات) ثم أنشئ طلبًا من المتجر → يجب أن يصل إشعار يحمل شعار المتجر.
- **iOS**: يعمل فقط بعد «إضافة إلى الشاشة الرئيسية» وعلى iOS 16.4+.

فحص سريع للسجل:

```sql
select store_id, language, created_at, user_agent from public.push_subscriptions order by created_at desc limit 5;
```

## استكشاف الأعطال

| العَرَض | السبب المحتمل |
| --- | --- |
| لا يصل شيء والتطبيق مغلق | Webhook غير منشأ، أو الدالة رفضت الطلب (`401 unauthorized`) بسبب اختلاف `x-webhook-secret`. |
| `500 missing_vapid_keys` | لم تُضبط أسرار `VAPID_*` أو لم تُنشر الدالة بعد ضبطها (`supabase secrets set` ثم أعد النشر). |
| يصل الإشعار بلا شعار | شعار المتجر غير مرفوع، أو تعذّر توقيع الرابط؛ راجع `logo_url` في `stores` و`APP_URL`. |
| يصل مرة ثم يتوقف على جهاز معيّن | الاشتراك أصبح بائدًا (`404/410`) فحُذف تلقائيًا؛ أعد التفعيل من الجهاز. |
| يعمل على الحاسوب ولا يعمل على الهاتف | iOS يحتاج تثبيت PWA + iOS 16.4+، والموقع يجب أن يكون HTTPS. |
| لا يظهر شريط «تفعيل» | الصلاحية ليست `default` (ممنوحة أو محظورة)، أو سبق الضغط على «لاحقًا» (امسح `oranix:notifications-prompt` من localStorage). |
