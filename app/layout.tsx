import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ui/theme-switcher';
import { ToastProvider } from '@/components/ui/toast';
import { TransferProvider } from '@/lib/dropzero/transfer-context';
import { Header } from '@/components/dropzero/header';
import { Footer } from '@/components/dropzero/footer';

export const metadata: Metadata = {
  title: 'DROPZERO — Transfer without limits.',
  description:
    'Send files directly between your devices. Fast, private, and completely free peer-to-peer file transfer.',
  openGraph: {
    title: 'DROPZERO — Transfer without limits.',
    description:
      'Send files directly between your devices. Fast, private, and completely free peer-to-peer file transfer.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DROPZERO — Transfer without limits.',
    description:
      'Send files directly between your devices. Fast, private, and completely free peer-to-peer file transfer.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="min-h-dvh flex flex-col bg-[#FAFAFA] dark:bg-[#080808] text-[#111111] dark:text-[#F5F5F5] antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <ToastProvider>
            <TransferProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </TransferProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
