import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { DossierProvider } from '@/lib/dossier-context';
import { AuthGate } from '@/components/auth-gate';

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
        <AuthGate>
          <DossierProvider>
            <div className="relative flex min-h-screen">
              <Sidebar />
              <main className="flex-1 overflow-x-hidden px-4 pb-10 pt-20 sm:px-6 lg:px-10 lg:py-8">
                <div className="rise mx-auto max-w-6xl">{children}</div>
              </main>
            </div>
          </DossierProvider>
        </AuthGate>
      </body>
    </html>
  );
}
