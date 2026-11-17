import React from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/src/components/ui/theme-switcher';
import { ToastProvider } from '@/src/components/ui/toast';
import { TransferProvider } from '@/src/lib/dropzero/transfer-context';
import { Header } from '@/src/components/dropzero/header';
import { Footer } from '@/src/components/dropzero/footer';
import { Button } from '@/src/components/ui/button';
import { HomePage } from '@/src/pages/HomePage';
import { TransferPage } from '@/src/pages/TransferPage';
import { DevicesPage } from '@/src/pages/DevicesPage';
import { HistoryPage } from '@/src/pages/HistoryPage';
import { FeaturesPage } from '@/src/pages/FeaturesPage';
import { SecurityPage } from '@/src/pages/SecurityPage';
import { PrivacyPage } from '@/src/pages/PrivacyPage';
import { AboutPage } from '@/src/pages/AboutPage';
import { DownloadPage } from '@/src/pages/DownloadPage';
import { SettingsPage } from '@/src/pages/SettingsPage';

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-[#8A8A8A] dark:text-[#626262]">
        404 · Route Not Found
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-[#111111] dark:text-[#F5F5F5]">
        No peer endpoint registered at this path.
      </h1>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary">Return Home</Button>
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <TransferProvider>
          <BrowserRouter>
            <div className="flex min-h-dvh flex-col bg-[#FAFAFA] dark:bg-[#080808] text-[#111111] dark:text-[#F5F5F5]">
              <Header />
              <div className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/transfer" element={<TransferPage />} />
                  <Route path="/devices" element={<DevicesPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/features" element={<FeaturesPage />} />
                  <Route path="/security" element={<SecurityPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/download" element={<DownloadPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </div>
              <Footer />
            </div>
          </BrowserRouter>
        </TransferProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
