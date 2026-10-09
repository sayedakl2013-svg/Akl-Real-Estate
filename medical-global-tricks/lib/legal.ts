// Legal page content. Marked as a draft until reviewed by the company's legal adviser (LEGAL_DRAFT=false hides the notice).
type Section = { h: string; p: string[] };
type Page = { title: string; sections: Section[] };

export const legal: Record<'privacy' | 'terms' | 'refund' | 'disclaimer', { en: Page; ar: Page }> = {
  privacy: {
    en: { title: 'Privacy policy', sections: [
      { h: 'Who we are', p: ['Medical Global Tricks is an independent online study platform operated by a company registered in the Sharjah Media City (SHAMS) Free Zone, United Arab Emirates.'] },
      { h: 'What we collect', p: ['Account data: your name, email address and a securely hashed password (we never store your password in readable form).', 'Study data: your self-assessment ratings, saved questions, timed-attempt answers and notes, study-plan ticks.', 'Security data: a device identifier stored in a cookie (used for the 2-device limit), sign-in times, IP address and browser type.', 'Payment data: handled by our payment provider (Stripe). We receive the payment status, amount and a reference — never your full card number.'] },
      { h: 'How we use it', p: ['To provide your courses and keep your progress, to protect accounts (device limit, rate limiting, fraud prevention), to send account emails (confirmation, password reset), and to produce aggregate usage reports for improving the platform.', 'We do not sell personal data and do not use your study data for advertising.'] },
      { h: 'Cookies', p: ['We use strictly necessary cookies only: a session cookie, a device cookie and a language preference. Your sound preference is stored in your browser.'] },
      { h: 'Sharing', p: ['We share data only with service providers needed to run the platform (hosting, database, email delivery, payment processing), under contracts that require them to protect it, or when required by law.'] },
      { h: 'Retention and your rights', p: ['We keep account and study data while your account is active and for a limited period afterwards for legal and accounting purposes. You may request access, correction or deletion of your data, subject to records we must keep by law (for example payment records).'] },
      { h: 'Security', p: ['Data is transmitted over HTTPS, passwords are hashed with scrypt, each student’s data is isolated by account, and backups are encrypted and access-controlled.'] },
    ] },
    ar: { title: 'سياسة الخصوصية', sections: [
      { h: 'من نحن', p: ['Medical Global Tricks منصة مذاكرة إلكترونية مستقلة تديرها شركة مسجلة في المنطقة الحرة لمدينة الشارقة للإعلام (شمس) بدولة الإمارات العربية المتحدة.'] },
      { h: 'البيانات التي نجمعها', p: ['بيانات الحساب: الاسم والبريد الإلكتروني وكلمة مرور مشفّرة بطريقة آمنة (لا نخزّن كلمة المرور بشكل مقروء).', 'بيانات المذاكرة: تقييماتك الذاتية والأسئلة المحفوظة وإجابات وملاحظات المحاولات المؤقتة وإنجازات خطة المذاكرة.', 'بيانات الأمان: معرّف الجهاز المحفوظ في ملف تعريف الارتباط (لتطبيق حد الجهازين)، وأوقات الدخول، وعنوان IP، ونوع المتصفح.', 'بيانات الدفع: تتولاها بوابة الدفع (Stripe). نستلم حالة الدفع والمبلغ ورقمًا مرجعيًا فقط، ولا نستلم رقم بطاقتك كاملًا.'] },
      { h: 'كيف نستخدمها', p: ['لتقديم الكورسات وحفظ تقدّمك، ولحماية الحسابات (حد الأجهزة، وتقييد المحاولات، ومنع الاحتيال)، ولإرسال رسائل الحساب (التأكيد واستعادة كلمة المرور)، ولإعداد تقارير استخدام إجمالية لتحسين المنصة.', 'لا نبيع البيانات الشخصية ولا نستخدم بيانات مذاكرتك لأغراض إعلانية.'] },
      { h: 'ملفات تعريف الارتباط', p: ['نستخدم ملفات ضرورية فقط: ملف الجلسة، وملف الجهاز، وتفضيل اللغة. ويُحفظ تفضيل الصوت في متصفحك.'] },
      { h: 'المشاركة', p: ['نشارك البيانات فقط مع مزوّدي الخدمات اللازمين لتشغيل المنصة (الاستضافة وقاعدة البيانات وإرسال البريد ومعالجة الدفع) بموجب عقود تُلزمهم بحمايتها، أو عندما يقتضي القانون ذلك.'] },
      { h: 'مدة الحفظ وحقوقك', p: ['نحتفظ ببيانات الحساب والمذاكرة طوال نشاط حسابك ولمدة محدودة بعده لأغراض قانونية ومحاسبية. يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها، مع مراعاة السجلات التي يلزمنا القانون بالاحتفاظ بها (مثل سجلات الدفع).'] },
      { h: 'الأمان', p: ['تُنقل البيانات عبر HTTPS، وتُشفّر كلمات المرور بخوارزمية scrypt، وتُعزل بيانات كل طالب حسب حسابه، والنسخ الاحتياطية مشفّرة ومحمية الوصول.'] },
    ] },
  },
  terms: {
    en: { title: 'Terms of use', sections: [
      { h: 'The service', p: ['Medical Global Tricks provides study material and self-assessment tools for medical licensing exam preparation. Each course is sold and accessed independently.'] },
      { h: 'Independence', p: ['The platform is independent. It is not affiliated with, endorsed by or approved by MOHAP, DHA, DOH, SCFHS or any other examination or licensing authority. Course names refer to the exam a course helps you prepare for, not to any partnership.'] },
      { h: 'No guarantee of results', p: ['We do not guarantee that you will pass any exam. Oral practice and timed sessions are self-assessed: the ratings are yours and are not official scores.'] },
      { h: 'Not medical advice', p: ['Content is for exam preparation only. It is not clinical guidance for treating patients. Always follow current official guidelines, product labelling and your scope of practice.'] },
      { h: 'Your account', p: ['Accounts are personal. One account may be used on up to 2 devices; replacing a device requires a request that the platform team approves. Sharing accounts or redistributing content (including PDFs, questions and videos) is prohibited and may lead to suspension without refund.'] },
      { h: 'Intellectual property', p: ['The platform’s design, software and brand belong to Medical Global Tricks. Reference materials, guidelines and product names cited in content remain the property of their owners and are cited for educational purposes.'] },
      { h: 'Payments and subscriptions', p: ['Prices are shown before checkout. Access starts only after the payment provider confirms the payment. Subscriptions renew automatically until cancelled; cancelling stops future renewals and access continues until the end of the paid period.'] },
      { h: 'Changes and law', p: ['We may update these terms; material changes will be announced on the platform. These terms are governed by the laws of the United Arab Emirates as applied in the Emirate of Sharjah.'] },
    ] },
    ar: { title: 'شروط الاستخدام', sections: [
      { h: 'الخدمة', p: ['تقدّم Medical Global Tricks مواد مذاكرة وأدوات تقييم ذاتي للتحضير لامتحانات الترخيص الطبي. يُباع كل كورس ويُتاح الوصول إليه بشكل مستقل.'] },
      { h: 'الاستقلالية', p: ['المنصة مستقلة، وليست تابعة أو معتمدة من MOHAP أو DHA أو DOH أو SCFHS أو أي جهة امتحانات أو ترخيص أخرى. أسماء الكورسات تشير إلى الامتحان الذي يساعدك الكورس على التحضير له، ولا تعني أي شراكة.'] },
      { h: 'لا ضمان للنتائج', p: ['لا نضمن نجاحك في أي امتحان. التدريب الشفوي والجلسات المؤقتة تقييم ذاتي: التقييمات منك وليست درجات رسمية.'] },
      { h: 'ليست استشارة طبية', p: ['المحتوى مخصص للتحضير للامتحانات فقط، وليس إرشادًا سريريًا لعلاج المرضى. التزم دائمًا بالإرشادات الرسمية الحالية ونشرات المنتجات ونطاق ممارستك.'] },
      { h: 'حسابك', p: ['الحساب شخصي. يمكن استخدام الحساب على جهازين كحد أقصى، واستبدال جهاز يتطلب طلبًا يوافق عليه فريق المنصة. يُمنع مشاركة الحسابات أو إعادة توزيع المحتوى (بما فيه ملفات PDF والأسئلة والفيديوهات)، وقد يؤدي ذلك إلى إيقاف الحساب دون استرداد.'] },
      { h: 'الملكية الفكرية', p: ['تصميم المنصة وبرمجياتها وهويتها مملوكة لـ Medical Global Tricks. أما المواد المرجعية والإرشادات وأسماء المنتجات المذكورة فهي مملوكة لأصحابها وتُذكر لأغراض تعليمية.'] },
      { h: 'الدفع والاشتراكات', p: ['تُعرض الأسعار قبل الدفع. يبدأ الوصول فقط بعد تأكيد بوابة الدفع للعملية. تتجدد الاشتراكات تلقائيًا حتى إلغائها، والإلغاء يوقف التجديدات القادمة ويستمر الوصول حتى نهاية الفترة المدفوعة.'] },
      { h: 'التعديلات والقانون', p: ['قد نحدّث هذه الشروط، وسنعلن التغييرات الجوهرية على المنصة. تخضع هذه الشروط لقوانين دولة الإمارات العربية المتحدة كما تُطبّق في إمارة الشارقة.'] },
    ] },
  },
  refund: {
    en: { title: 'Refund policy', sections: [
      { h: 'How to request a refund', p: ['Contact the platform team from the email address on your account, with your order date and course name. Requests are reviewed individually.'] },
      { h: 'Eligibility', p: ['Refund eligibility depends on the time since purchase and how much of the course has been used (questions practised, PDFs opened, videos watched). The refund window and conditions for each offer are confirmed by the company before sales open and shown at checkout.', 'Duplicate charges and technical failures that prevent access are always refunded.'] },
      { h: 'Subscriptions', p: ['You can cancel a subscription at any time from your account. Cancelling stops the next renewal; access continues until the end of the current paid period. Past periods are not refunded unless required by law.'] },
      { h: 'What happens after a refund', p: ['A full refund ends access to the course. Your study history is kept in case you return, unless you ask us to delete it.'] },
      { h: 'Processing', p: ['Approved refunds are issued through the original payment method via our payment provider. The time for funds to appear depends on your bank or card issuer.'] },
    ] },
    ar: { title: 'سياسة الاسترداد', sections: [
      { h: 'كيف تطلب الاسترداد', p: ['تواصل مع فريق المنصة من البريد الإلكتروني المسجل في حسابك، مع ذكر تاريخ الطلب واسم الكورس. تُراجع الطلبات كلٌّ على حدة.'] },
      { h: 'الأهلية', p: ['تعتمد أهلية الاسترداد على المدة منذ الشراء ومدى استخدام الكورس (الأسئلة التي تدرّبت عليها، وملفات PDF التي فتحتها، والفيديوهات التي شاهدتها). تؤكد الشركة مدة الاسترداد وشروط كل عرض قبل فتح البيع وتُعرض عند الدفع.', 'يُسترد دائمًا المبلغ في حالات الخصم المكرر أو الأعطال التقنية التي تمنع الوصول.'] },
      { h: 'الاشتراكات', p: ['يمكنك إلغاء الاشتراك في أي وقت من حسابك. الإلغاء يوقف التجديد القادم ويستمر الوصول حتى نهاية الفترة المدفوعة الحالية. لا تُسترد الفترات السابقة إلا إذا اقتضى القانون ذلك.'] },
      { h: 'ماذا يحدث بعد الاسترداد', p: ['الاسترداد الكامل ينهي الوصول إلى الكورس. نحتفظ بسجل مذاكرتك إذا عدت لاحقًا، ما لم تطلب حذفه.'] },
      { h: 'التنفيذ', p: ['تُصرف المبالغ المعتمدة إلى وسيلة الدفع الأصلية عبر بوابة الدفع. تعتمد مدة ظهور المبلغ على البنك أو جهة إصدار البطاقة.'] },
    ] },
  },
  disclaimer: {
    en: { title: 'Disclaimer', sections: [
      { h: 'Independent platform', p: ['Medical Global Tricks is not affiliated with, endorsed by or approved by MOHAP, DHA, DOH, SCFHS or any other examination or licensing authority. Authority names are used only to describe which exam a course prepares for.'] },
      { h: 'Self-assessment', p: ['Oral practice results are your own self-assessment and are not official exam scores. The platform does not automatically mark or correct medical answers.'] },
      { h: 'Content accuracy', p: ['Reference answers are compiled from cited sources, and some items carry verification notes where sources disagree. Medicine changes: always confirm against current official guidelines and product labelling.'] },
      { h: 'No success guarantee', p: ['We make no promise about exam results, pass rates or licensing outcomes.'] },
    ] },
    ar: { title: 'إخلاء المسؤولية', sections: [
      { h: 'منصة مستقلة', p: ['Medical Global Tricks ليست تابعة أو معتمدة من MOHAP أو DHA أو DOH أو SCFHS أو أي جهة امتحانات أو ترخيص أخرى. تُستخدم أسماء الجهات فقط لوصف الامتحان الذي يحضّر له الكورس.'] },
      { h: 'تقييم ذاتي', p: ['نتائج التدريب الشفوي تقييم ذاتي منك وليست درجات امتحان رسمي. لا تقوم المنصة بتصحيح الإجابات الطبية آليًا.'] },
      { h: 'دقة المحتوى', p: ['الإجابات المرجعية مجمّعة من المصادر المذكورة، وبعضها يحمل ملاحظات تحقق عند اختلاف المصادر. الطب يتطور: تحقق دائمًا من الإرشادات الرسمية الحالية ونشرات المنتجات.'] },
      { h: 'لا ضمان للنجاح', p: ['لا نقدّم أي وعد بشأن نتائج الامتحانات أو نسب النجاح أو الحصول على الترخيص.'] },
    ] },
  },
};
