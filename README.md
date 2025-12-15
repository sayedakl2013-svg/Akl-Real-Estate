# منصة عقارات MVP (Next.js + Supabase)

يدعم:
- أراضي للبيع: سكني / تجاري / صناعي
- عقارات للبيع: شقق / مكاتب
- فلترة + تفاصيل + نموذج Leads
- صفحة تسجيل عقار -> Pending
- لوحة Admin: تغيير حالة العروض + مشاهدة Leads + الملاك

## إعداد Supabase
1) Create Project
2) SQL Editor -> شغل `sql/001_init.sql`
3) Settings -> API -> انسخ URL + anon key + service_role key

## التشغيل
1) انسخ `.env.example` إلى `.env.local` واملأ القيم
2) `npm install`
3) `npm run dev`

> للإطلاق الحقيقي: أضف Supabase Auth + RLS للـ admin.
