import { adminCtx } from '@/lib/adminPage';
import { q } from '@/lib/db';
import { formatMoney } from '@/lib/catalog';

export default async function Orders() {
  const { L, fmt, lang } = await adminCtx('admin');
  const [orders, events] = await Promise.all([
    q(`SELECT o.*, u.email, c.title_en FROM orders o JOIN users u ON u.id = o.user_id JOIN courses c ON c.id = o.course_id ORDER BY o.created_at DESC LIMIT 100`),
    q(`SELECT id, type, received_at, processed_at, error FROM payment_events ORDER BY received_at DESC LIMIT 50`),
  ]);
  return (
    <>
      <h2>{L('Orders & payments', 'الطلبات والمدفوعات')}</h2>
      <p className="muted">{L('An order becomes “paid” only when a signed gateway webhook confirms it. Refunds and subscription changes made in the Stripe dashboard flow back here automatically.', 'يصبح الطلب «مدفوعًا» فقط عند تأكيده بإشعار Webhook موقّع من البوابة. الاستردادات وتغييرات الاشتراك من لوحة Stripe تنعكس هنا تلقائيًا.')}</p>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>{L('Created', 'الإنشاء')}</th><th>Email</th><th>{L('Course', 'الكورس')}</th><th>{L('Type', 'النوع')}</th><th>{L('Amount', 'المبلغ')}</th><th>{L('Status', 'الحالة')}</th><th>{L('Paid', 'الدفع')}</th></tr></thead>
        <tbody>{orders.map((o) => <tr key={o.id}><td>{fmt(o.created_at)}</td><td className="ltr">{o.email}</td><td>{o.title_en}</td><td>{o.kind}</td><td className="ltr">{formatMoney(o.amount_minor, o.currency, lang)}</td><td>{o.status}</td><td>{fmt(o.paid_at)}</td></tr>)}</tbody>
      </table></div>
      <h3>{L('Gateway events', 'أحداث البوابة')}</h3>
      <div className="table-wrap"><table className="table"><tbody>{events.map((e) => <tr key={e.id}><td className="ltr">{e.id}</td><td>{e.type}</td><td>{fmt(e.received_at)}</td><td>{e.processed_at ? '✓' : '…'}</td><td style={{ color: 'var(--danger)' }}>{e.error}</td></tr>)}</tbody></table></div>
    </>
  );
}
