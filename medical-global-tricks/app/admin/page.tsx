import Link from 'next/link';
import { adminCtx } from '@/lib/adminPage';
import { one, q } from '@/lib/db';
import { emailConfigured } from '@/lib/email';
import { formatMoney, paymentsEnabled } from '@/lib/catalog';

export default async function AdminHome() {
  const { L, lang, user } = await adminCtx();
  const [counts, usage, sales, pendingReq, recent] = await Promise.all([
    one(`SELECT (SELECT count(*) FROM users WHERE role = 'student')::int AS students,
                (SELECT count(*) FROM courses WHERE status = 'available')::int AS available,
                (SELECT count(*) FROM courses WHERE status = 'planned')::int AS planned,
                (SELECT count(*) FROM questions WHERE status = 'published')::int AS published,
                (SELECT count(*) FROM questions WHERE status = 'in_review')::int AS in_review,
                (SELECT count(*) FROM questions WHERE status = 'draft')::int AS drafts,
                (SELECT count(*) FROM enrollments WHERE status IN ('active','canceled') AND (expires_at IS NULL OR expires_at > now()))::int AS active_access`),
    one(`SELECT (SELECT count(DISTINCT user_id) FROM sessions WHERE last_seen_at > now() - interval '7 days')::int AS active7,
                (SELECT count(*) FROM rating_events WHERE created_at > now() - interval '7 days')::int AS ratings7,
                (SELECT count(*) FROM exam_attempts WHERE started_at > now() - interval '7 days')::int AS attempts7,
                (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days')::int AS signups7`),
    q(`SELECT to_char(date_trunc('month', paid_at), 'YYYY-MM') AS month, currency, count(*)::int AS n, sum(amount_minor)::bigint AS total,
              count(*) FILTER (WHERE status IN ('refunded','partially_refunded'))::int AS refunds
         FROM orders WHERE paid_at IS NOT NULL GROUP BY 1, 2 ORDER BY 1 DESC LIMIT 24`),
    one(`SELECT count(*)::int AS n FROM device_replacement_requests WHERE status = 'pending'`),
    q(`SELECT name, email, created_at FROM users ORDER BY created_at DESC LIMIT 6`),
  ]);
  const Stat = ({ n, label }: { n: number; label: string }) => <div className="card stat"><b>{n}</b><span>{label}</span></div>;
  return (
    <>
      <div className="grid grid-2">
        <div className={`alert ${paymentsEnabled() ? 'alert-good' : 'alert-warn'}`}>
          <b>{L('Payments', 'الدفع')}:</b> {paymentsEnabled() ? L('Stripe keys configured. Access is granted only by verified webhooks.', 'مفاتيح Stripe مُعدّة. يُمنح الوصول فقط عبر إشعارات Webhook موثّقة.') : L('Not enabled. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET after the company account is approved. Until then, grant access manually.', 'غير مفعّل. أضف STRIPE_SECRET_KEY وSTRIPE_WEBHOOK_SECRET بعد اعتماد حساب الشركة. حتى ذلك الحين امنح الوصول يدويًا.')}
        </div>
        <div className={`alert ${emailConfigured() ? 'alert-good' : 'alert-warn'}`}>
          <b>{L('Email', 'البريد')}:</b> {emailConfigured() ? L('SMTP configured.', 'SMTP مُعد.') : L('Not configured — messages are kept in the outbox and not delivered.', 'غير مُعد — تُحفظ الرسائل في الصندوق الصادر ولا تُرسل.')}
        </div>
      </div>
      {user.role === 'admin' && (pendingReq?.n ?? 0) > 0 && (
        <div className="alert alert-info spread"><span>{L('Pending device replacement requests', 'طلبات استبدال أجهزة قيد الانتظار')}: <b>{pendingReq!.n}</b></span><Link className="btn btn-dark btn-sm" href="/admin/devices">{L('Review', 'مراجعة')}</Link></div>
      )}
      <h2 style={{ fontSize: '1.2rem' }}>{L('Content', 'المحتوى')}</h2>
      <div className="grid grid-4">
        <Stat n={counts.available} label={L('Available courses', 'كورسات متاحة')} />
        <Stat n={counts.planned} label={L('Planned courses', 'كورسات مخطط لها')} />
        <Stat n={counts.published} label={L('Published questions', 'أسئلة منشورة')} />
        <Stat n={counts.in_review + counts.drafts} label={L('Drafts / in review', 'مسودات / قيد المراجعة')} />
      </div>
      <h2 style={{ fontSize: '1.2rem' }}>{L('Usage (last 7 days)', 'الاستخدام (آخر 7 أيام)')}</h2>
      <div className="grid grid-4">
        <Stat n={counts.students} label={L('Student accounts (total)', 'حسابات الطلاب (الإجمالي)')} />
        <Stat n={usage.active7} label={L('Active users', 'مستخدمون نشطون')} />
        <Stat n={usage.ratings7} label={L('Self-ratings saved', 'تقييمات ذاتية محفوظة')} />
        <Stat n={usage.attempts7} label={L('Timed attempts', 'محاولات مؤقتة')} />
      </div>
      <p className="faint">{L('Active course access', 'صلاحيات وصول فعّالة')}: {counts.active_access} · {L('New sign-ups', 'تسجيلات جديدة')}: {usage.signups7}</p>
      <h2 style={{ fontSize: '1.2rem' }}>{L('Sales', 'المبيعات')}</h2>
      {sales.length === 0 ? <p className="muted">{L('No paid orders yet. Sales reports appear here once payments are enabled and confirmed by the gateway.', 'لا توجد طلبات مدفوعة بعد. تظهر تقارير المبيعات هنا بعد تفعيل الدفع وتأكيده من البوابة.')}</p> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>{L('Month', 'الشهر')}</th><th>{L('Orders', 'الطلبات')}</th><th>{L('Gross', 'الإجمالي')}</th><th>{L('Refunds', 'المستردات')}</th></tr></thead>
          <tbody>{sales.map((s) => <tr key={s.month + s.currency}><td>{s.month}</td><td>{s.n}</td><td className="ltr">{formatMoney(Number(s.total), s.currency, lang)}</td><td>{s.refunds}</td></tr>)}</tbody>
        </table></div>
      )}
      <h2 style={{ fontSize: '1.2rem' }}>{L('Recent sign-ups', 'آخر التسجيلات')}</h2>
      <ul>{recent.map((r) => <li key={r.email}>{r.name} · <span className="ltr">{r.email}</span></li>)}</ul>
    </>
  );
}
