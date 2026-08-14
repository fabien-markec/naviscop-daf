import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { DossierProvider } from '@/lib/dossier-context';
import { AuthGate } from '@/components/auth-gate';
import { AppShell } from '@/components/app-shell';

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
            <AppShell>{children}</AppShell>
          </DossierProvider>
        </AuthGate>
      </body>
    </html>
  );
}
