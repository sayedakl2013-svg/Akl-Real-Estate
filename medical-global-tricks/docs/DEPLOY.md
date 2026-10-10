# نشر المنصة على رابط — Deploying to a link

## بالعربية (Render — أسهل طريقة، دون سطر أوامر)

الملف `render.yaml` في جذر المستودع ينشئ تلقائيًا:
- خادم الويب،
- قاعدة بيانات PostgreSQL،
- مساحة تخزين دائمة لملفات PDF والفيديو (5 GB)،
- كلمة مرور للمعاينة الخاصة،
- رمزًا سريًا لإعداد أول مشرف.

**التكلفة:** الخطط المحددة مدفوعة (خادم `starter` وقاعدة `basic-256mb`)، لأن مساحة التخزين الدائمة لا تعمل على الخطة المجانية. راجع أسعار Render الحالية قبل التطبيق، ويمكنك تغيير الخطط من لوحة Render.

### 1) إنشاء الخدمة (مرة واحدة)
1. ادخل إلى [dashboard.render.com](https://dashboard.render.com) وسجّل الدخول بحساب GitHub.
2. اضغط **New → Blueprint**.
3. اختر المستودع `sayedakl2013-svg/Akl-Real-Estate` والفرع `claude/medical-global-tricks-platform-9dxvzv`، أو `main` بعد الدمج.
4. اضغط **Apply**. انتظر حتى تصبح الخدمة **Live**، ويستغرق ذلك من 5 إلى 10 دقائق في المرة الأولى.
5. يظهر الرابط أعلى صفحة الخدمة، مثل `https://medical-global-tricks.onrender.com`.

### 2) فتح الموقع الخاص
1. من صفحة الخدمة: **Environment** ← انسخ قيمة `SITE_ACCESS_PASSWORD`.
2. افتح الرابط. سيطلب المتصفح اسم مستخدم وكلمة مرور: الاسم `preview`، وكلمة المرور هي القيمة التي نسختها.
3. أعطِ هذه البيانات فقط لمن تريد أن يجرّب المنصة. الموقع لن يظهر في محركات البحث.

### 3) جعل حسابك هو المشرف
1. أنشئ حسابك من **إنشاء حساب**.
2. افتح الرابط `/setup` (مثل `https://…onrender.com/setup`).
3. الصق قيمة `ADMIN_BOOTSTRAP_TOKEN` من صفحة Environment، ثم اضغط «اجعل حسابي هو المشرف». يعمل هذا مرة واحدة فقط.

### 4) تحميل المحتوى من لوحة الإدارة
المحتوى غير موجود في المستودع لأنه عام، فيُرفع مرة واحدة:
1. **الإدارة ← الأسئلة والمراجعة ← استيراد بنك الأسئلة:** ارفع ملف `aesthetic_medicine_study_binder.html`، واختر **published**، ثم اضغط «استيراد». سيظهر: 313 سؤالًا.
   - إذا استوردته كمسودة، اضغط زر «نشر كل الأسئلة».
2. **الإدارة ← الملفات والفيديوهات ← رفع ملفات الملخصات دفعة واحدة:** اختر ملفات PDF الخمسة عشر معًا (من الملف المضغوط المرسل)، واترك «نشر مباشرة» مفعّلًا.
3. **رفع ملف فيديو:** اختر الفيديو التعريفي، والنوع `promo`، والوصول `public`. بعد الرفع اضغط «نشر».

### 5) إعطاء الطلاب صلاحية الوصول
حتى يتم تفعيل الدفع:
- يسجّل الطالب حسابه.
- تدخل أنت **الإدارة ← الطلاب والصلاحيات ← إدارة ← منح الوصول**.
- ويمكنك أيضًا «تأكيد البريد يدويًا».

### لاحقًا
- **الدفع:** أضف `STRIPE_SECRET_KEY` و`STRIPE_WEBHOOK_SECRET` في Environment. الخطوات في `PAYMENTS.md`.
- **البريد:** أضف قيم `SMTP_*` و`EMAIL_FROM`.
- **نطاق خاص:** من Settings ← Custom Domains، ثم ضع الرابط في `APP_BASE_URL`.
- **الإطلاق العام:** احذف `SITE_ACCESS_PASSWORD` واجعل `SITE_NOINDEX=false`.
- **النسخ الاحتياطي:** فعّل النسخ الاحتياطي التلقائي لقاعدة البيانات من صفحة القاعدة في Render.

### إذا فشل النشر
افتح **Logs** في صفحة الخدمة وأرسل لي آخر 30 سطرًا.

---

## English (summary)

1. **Create the services.** Render → **New → Blueprint**, then pick this repository and branch → **Apply**. `render.yaml` creates the web service (`rootDir: medical-global-tricks`), PostgreSQL and a 5 GB disk. It also generates two secrets: `SITE_ACCESS_PASSWORD` and `ADMIN_BOOTSTRAP_TOKEN`.
2. **Open the private preview.** Visit the onrender.com URL. The username is `preview` and the password is `SITE_ACCESS_PASSWORD`.
3. **Become the admin.** Register, open `/setup`, and paste `ADMIN_BOOTSTRAP_TOKEN`. This works once, and only while no admin exists.
4. **Load the content in Admin:**
   - import the binder HTML as *published* (or use "Publish all");
   - bulk-upload the 15 summary PDFs (file names start with the domain code, e.g. `H-Hyaluronidase.pdf`);
   - upload the teaser video as a public promo and publish it.
5. **Give students access.** Grant access in *Admin → Students* until Stripe is configured.

Each start runs migrations and the idempotent seed. They never delete data. `/api/health` is open for the host's health check, and everything else sits behind the preview password.

For any other host (VPS, Railway, Fly): `NEXT_STANDALONE=1 npm run build`, then follow `OPERATIONS.md`.

The whole flow above was rehearsed against an empty database with `tests/deploy-bootstrap.mjs` (7/7 checks pass).
