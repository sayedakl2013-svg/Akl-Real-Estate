'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from './I18n';

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const { lang } = useI18n();
  const path = usePathname();
  const L = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const items: [string, string, boolean][] = [
    ['/admin', L('Overview & reports', 'نظرة عامة وتقارير'), true],
    ['/admin/courses', L('Courses', 'الكورسات'), true],
    ['/admin/questions', L('Questions & review', 'الأسئلة والمراجعة'), true],
    ['/admin/media', L('PDFs & videos', 'الملفات والفيديوهات'), isAdmin],
    ['/admin/students', L('Students & access', 'الطلاب والصلاحيات'), isAdmin],
    ['/admin/devices', L('Device requests', 'طلبات الأجهزة'), isAdmin],
    ['/admin/orders', L('Orders & payments', 'الطلبات والمدفوعات'), isAdmin],
    ['/admin/outbox', L('Email outbox', 'صندوق البريد الصادر'), isAdmin],
    ['/admin/audit', L('Audit log', 'سجل العمليات'), isAdmin],
  ];
  return (
    <nav className="side-nav" aria-label="Admin">
      {items.filter((i) => i[2]).map(([href, label]) => (
        <Link key={href} href={href} aria-current={(href === '/admin' ? path === href : path.startsWith(href)) ? 'page' : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
