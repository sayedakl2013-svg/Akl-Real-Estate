# حالة التسليم — Delivery status

## بالعربية

### مكتمل ويعمل (تم التحقق منه آليًا: 33 فحصًا ناجحًا)
- **الهوية والتصميم:** هيدر وتذييل باسم Medical Global Tricks، وشعار الصليب الطبي مع الكرة الأرضية، والألوان المطلوبة، وخطّا Manrope وCairo، والعبارة الرئيسية بالعربية والإنجليزية، ودعم كامل للغة العربية من اليمين لليسار، وتصميم متجاوب للجوال بلا تمرير أفقي.
- **الحركة والصوت:** حركات دخول وكشف وتقدّم سلسة، وتُلغى عند تفعيل خيار «تقليل الحركة». أصوات قصيرة مكتومة افتراضيًا، والتفضيل محفوظ، وتعطّل الصوت لا يؤثر على أي وظيفة.
- **الكورسات:** فلترة حسب البلد والجهة والمسار والتخصص. الكورس المتاح هو التحضير الشفوي لطب التجميل (313 سؤالًا في 15 مجالًا من بنك الأسئلة الموجود). وهناك 3 كورسات «مخطط لها» (DHA وDOH وSCFHS) لا يمكن شراؤها.
- **المذاكرة:** لوحة رئيسية، ومكتبة أسئلة مع بحث وفلترة وحفظ، وتدريب شفوي مع تقييم ذاتي، وامتحانات مؤقتة مع تعليم الأسئلة وحفظ تلقائي واستكمال وتسليم، ودفتر أخطاء، وسجل محاولات وتحليل حسب المجال، وخطة مذاكرة.
- **الملخصات:** 15 ملف PDF بالإنجليزية (شرح ونقاط مهمة ومفاتيح مراجعة، دون أسئلة)، مبنية من المحتوى الموجود فقط، ومحمية حسب الاشتراك.
- **الفيديو:** يُعرض الفيديو التعريفي بزر تشغيل يدوي فقط. وتوجد إمكانية رفع فيديوهات الدروس أو ربطها.
- **الحسابات:** تسجيل وتسجيل دخول، وتأكيد البريد، واستعادة كلمة المرور، وحد جهازين، وطلب استبدال جهاز بموافقة الإدارة.
- **الدفع:** تكامل Stripe للشراء لمرة واحدة وللاشتراكات. لا يتفعّل الوصول إلا بعد تأكيد موقّع من البوابة. التجديد والإلغاء والاسترداد مختبرة بإشعارات موقّعة محليًا.
- **لوحة الإدارة:** الكورسات والمجالات والأسعار، والأسئلة بمراحل مسودة ← مراجعة ← نشر، والملفات والفيديوهات، والطلاب والصلاحيات، وطلبات الأجهزة، والطلبات، وتقارير الاستخدام والمبيعات، وسجل العمليات.
- **الأمان والنسخ الاحتياطي:** عزل بيانات كل مستخدم، وحماية الملفات، ونسخ احتياطي واستعادة مختبرة.
- **الصفحات القانونية:** الخصوصية والشروط والاسترداد وإخلاء المسؤولية، مع توضيح الاستقلالية وعدم الارتباط بأي جهة امتحانات.

### يحتاج بيانات أو إعدادات خارجية
| البند | المطلوب منكم |
|---|---|
| النشر على رابط | جاهز للنشر بنقرات على Render عبر `render.yaml` (راجع `DEPLOY.md`)، ويحتاج فقط حسابكم على Render. لم أستطع تحديث رابط chatgpt.site الحالي من هذه البيئة |
| المحتوى والحسابات في النسخة التجريبية الحالية | تصدير الطلاب ونتائجهم من النسخة الحالية (إن وُجد) لاستيرادها. لم يكن الوصول لبياناتها ممكنًا من هنا |
| الدخول بحساب ChatGPT | يعمل فقط داخل منصة chatgpt.site الحالية، ولا يمكن نقله لهذا التطبيق المستقل. أبقوا النسخة التجريبية كما هي حتى تشغيل الحسابات المستقلة |
| البريد الإلكتروني | مزوّد SMTP وإعداد SPF/DKIM. حتى ذلك الحين لا تُرسل الرسائل، والتأكيد يتم يدويًا من الإدارة |
| الدفع | تفعيل حساب Stripe للشركة (التحقق من أهلية شركة منطقة شمس الحرة)، ومفاتيح API، وWebhook، وإدخال الأسعار الحقيقية |
| الإعلان العربي ذو مدة 45 ثانية | لم يُرفع بعد. الفيديو المرفق مدته 10 ثوانٍ وبالإنجليزية («Coming soon»)، وقد أضفته كفيديو تعريفي |
| السعة 25,000 ممتحن متزامن | اختبار تحميل كامل على بيئة مماثلة أو التزام مكتوب من المزوّد (راجع SCALING.md) |
| الصفحات القانونية | مراجعة قانونية، وتحديد مدة وشروط الاسترداد الفعلية، والبريد الرسمي للتواصل |
| مفتاح Supabase المكشوف | تغيير المفتاح فورًا (موجود في ملفات جذر المستودع العام) |

## English

### Done and verified (33/33 automated end-to-end checks pass)
Everything listed in the README table is implemented and exercised by `tests/e2e.mjs`. The suite covers:
- opening a course, starting a timed exam, saving self-ratings, submitting, and retrieving results
- Arabic RTL and mobile layouts, keyboard use, and muted-by-default sound
- the reduced-motion preference
- access control and per-user data isolation
- the device limit and replacement flow
- webhook-only payment activation, refunds and subscriptions

### Needs external data or setup
- **Hosting and a URL.** It's ready for a Render Blueprint deploy (`render.yaml`, `docs/DEPLOY.md`) and only needs your Render account. I couldn't update the existing chatgpt.site trial from this environment.
- **Existing trial data.** Exports of any existing trial students and results, if they're to be migrated.
- **ChatGPT sign-in** stays on the existing trial only.
- **Email delivery:** SMTP credentials and DNS records.
- **Payments:** Stripe activation for the SHAMS free-zone company, keys, the webhook endpoint, and real prices.
- **The 45-second Arabic ad.** It hasn't been supplied yet. The uploaded clip is a 10-second English teaser.
- **25k-concurrency proof:** a full-scale load test or a written provider commitment.
- **Legal review** of the draft policies, including the actual refund window.
- **Rotate the Supabase key** that is committed at the repository root.
