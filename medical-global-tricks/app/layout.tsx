import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getT } from '@/lib/i18n';
import { I18nProvider } from '@/components/I18n';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: { default: 'Medical Global Tricks', template: '%s · Medical Global Tricks' },
  description: 'Learn with clarity. Practise with confidence. Independent preparation for medical licensing exams.',
  robots: process.env.SITE_NOINDEX === 'false' ? undefined : { index: false, follow: false },
  icons: { icon: '/brand/icon.svg' },
};

export const viewport: Viewport = { themeColor: '#050e1c', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, dir, t } = await getT();
  return (
    <html lang={lang} dir={dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Manrope:wght@400;600;700;800&display=swap" />
      </head>
      <body>
        <I18nProvider lang={lang}>
          <a href="#main" className="skip-link">{t.skip}</a>
          <Header />
          <main id="main" tabIndex={-1}>{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
