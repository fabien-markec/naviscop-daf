import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { DossierProvider } from '@/lib/dossier-context';

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NAVISCOP — Pilotage financier',
  description: 'Application de pilotage financier pour DAF externalisé',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={sans.variable}>
      <body>
        <DossierProvider>
          <div className="relative flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-x-hidden px-8 py-8 lg:px-10">
              <div className="rise mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
        </DossierProvider>
      </body>
    </html>
  );
}
