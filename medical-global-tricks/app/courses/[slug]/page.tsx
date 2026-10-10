import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getT, pick } from '@/lib/i18n';
import { getUser } from '@/lib/auth';
import { courseAccess, courseBySlug, domainsFor } from '@/lib/access';
import { activeOffers, formatMoney, paymentsEnabled } from '@/lib/catalog';
import { StatusBadge } from '@/components/CourseCard';
import { BuyButton } from '@/components/BuyButton';

export const dynamic = 'force-dynamic';

export default async function CoursePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const [{ t, lang }, user, course] = await Promise.all([getT(), getUser(), courseBySlug(slug)]);
  if (!course || (course.status === 'draft' && user?.role === 'student') || (course.status === 'draft' && !user) || course.status === 'archived') notFound();
  const [access, domains, offers] = await Promise.all([courseAccess(user, course.id), domainsFor(course.id), activeOffers(course.id)]);
  const total = domains.reduce((s, d) => s + d.total, 0);
  const sellable = course.status === 'available' && offers.length > 0 && paymentsEnabled();
  const d = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { dateStyle: 'medium' });

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/courses">{t.catalogue.title}</Link></div>
          <div className="row" style={{ marginBottom: 10 }}>
            <StatusBadge status={course.status} t={t} />
            <span className="badge badge-teal">{t.countries[course.country] ?? course.country}</span>
            <span className="badge badge-violet ltr">{course.authority}</span>
            <span className="badge badge-draft">{t.tracks[course.track] ?? course.track}</span>
          </div>
          <h1>{pick(lang, course.title_en, course.title_ar)}</h1>
          <p>{pick(lang, course.summary_en, course.summary_ar)}</p>
        </div>
      </div>
      <div className="container section stack" style={{ paddingTop: 28 }}>
        {sp.access === 'required' && !access.active && <div className="alert alert-warn">{t.course.accessRequired}</div>}
        {sp.checkout === 'success' && !access.active && <div className="alert alert-info">{t.course.pending}</div>}
        {course.status === 'planned' && <div className="alert alert-warn">{t.course.plannedBanner}</div>}

        <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
          <div className="card stack">
            {access.active && course.status !== 'planned' ? (
              <>
                <div className="alert alert-good">
                  {t.course.youHaveAccess}{' '}
                  {access.enrollment && (access.enrollment.expires_at ? `${t.course.expires}: ${d.format(new Date(access.enrollment.expires_at))}` : t.course.noExpiry)}
                </div>
                <div><Link className="btn btn-primary" href={`/learn/${course.slug}`}>{t.course.start}</Link></div>
              </>
            ) : course.status === 'available' ? (
              <>
                <h2 style={{ fontSize: '1.3rem' }}>{t.course.buy}</h2>
                {offers.length === 0 && <p className="muted">{t.course.notForSale}</p>}
                {!paymentsEnabled() && <div className="alert alert-info">{t.course.paymentsOff}</div>}
                {offers.length > 0 && (
                  <div className="grid grid-2">
                    {offers.map((o) => (
                      <div key={o.id} className="card" style={{ background: 'var(--surface-2)' }}>
                        <div className="badge badge-teal">{o.kind === 'one_time' ? t.course.oneTime : t.course.subscription}</div>
                        <h3 style={{ marginTop: 10 }}>{pick(lang, o.label_en, o.label_ar)}</h3>
                        <p style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0' }}>
                          {formatMoney(o.amount_minor, o.currency, lang)}{' '}
                          <span className="faint">
                            {o.kind === 'subscription'
                              ? (o.interval_count === 1 ? (o.interval === 'year' ? t.course.perYear : t.course.perMonth) : `${t.course.every} ${o.interval_count} ${o.interval}`)
                              : o.access_days ? `· ${o.access_days} ${t.course.days}` : ''}
                          </span>
                        </p>
                        {sellable && (user ? (user.emailVerified ? <BuyButton offerId={o.id} /> : <p className="faint">{t.course.verifyFirst}</p>)
                          : <Link className="btn btn-dark btn-sm" href={`/login?next=/courses/${course.slug}`}>{t.course.signInToBuy}</Link>)}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>

          {domains.length > 0 && (
            <div className="card stack">
              <div className="spread"><h2 style={{ fontSize: '1.3rem', margin: 0 }}>{t.course.domains}</h2><span className="faint">{total} {t.catalogue.questions}</span></div>
              <div className="grid grid-3">
                {domains.map((dm, i) => (
                  <div key={dm.id} className="row enter" style={{ ['--i' as any]: i, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                    <span className="dot" style={{ background: dm.color, marginTop: 8 }} />
                    <div>
                      <b>{pick(lang, dm.name_en, dm.name_ar)}</b> <span className="faint">({dm.total})</span>
                      <div className="faint content-en" lang="en">{dm.description_en}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="alert alert-violet">{t.learn.selfNote} {t.footer.independent}</div>
        </div>
      </div>
    </>
  );
}
