import React from 'react';
import Link from 'next/link';

export function Footer() {
  const repoUrl = process.env.NEXT_PUBLIC_DROPZERO_REPO_URL?.trim();

  return (
    <footer className="border-t border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#080808]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]"
            >
              DROPZERO
            </Link>
            <p className="mt-2.5 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
              Transfer without limits. Your devices, your files, your connection.
            </p>
            <p className="mt-4 font-mono text-[11px] text-[#8A8A8A] dark:text-[#626262]">
              Version 1.0.0 · Dual MIT / Apache-2.0
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-[#111111] dark:text-[#F5F5F5]">Product</h3>
            <ul className="mt-3 flex flex-col gap-2 text-xs text-[#666666] dark:text-[#929292]">
              <li>
                <Link href="/transfer" className="hover:text-[#111111] dark:hover:text-[#F5F5F5] transition-colors">
                  Transfer workspace
                </Link>
              </li>
              <li>
                <Link href="/devices" className="hover:text-[#111111] dark:hover:text-[#F5F5F5] transition-colors">
                  Devices
                </Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-[#111111] dark:hover:text-[#F5F5F5] transition-colors">
                  Local history
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-[#111111] dark:hover:text-[#F5F5F5] transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/download" className="hover:text-[#111111] dark:hover:text-[#F5F5F5] transition-colors">
                  Downloads
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-[#111111] dark:text-[#F5F5F5]">Trust & Specs</h3>
            <ul className="mt-3 flex flex-col gap-2 text-xs text-[#666666] dark:text-[#929292]">
              <li>
                <Link href="/security" className="hover:text-[#111111] dark:hover:text-[#F5F5F5] transition-colors">
                  Security
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#111111] dark:hover:text-[#F5F5F5] transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#111111] dark:hover:text-[#F5F5F5] transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-[#111111] dark:hover:text-[#F5F5F5] transition-colors">
                  Settings
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-[#111111] dark:text-[#F5F5F5]">Engineering</h3>
            <ul className="mt-3 flex flex-col gap-2 text-xs text-[#666666] dark:text-[#929292]">
              <li>
                <Link href="/security#protocol" className="hover:text-[#111111] dark:hover:text-[#F5F5F5] transition-colors">
                  Protocol & Documentation
                </Link>
              </li>
              <li>
                {repoUrl ? (
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#111111] dark:hover:text-[#F5F5F5] transition-colors"
                  >
                    GitHub Repository
                  </a>
                ) : (
                  <span
                    className="text-[#8A8A8A] dark:text-[#626262]"
                    title="Configure NEXT_PUBLIC_DROPZERO_REPO_URL when repository is published"
                  >
                    GitHub (configure NEXT_PUBLIC_DROPZERO_REPO_URL)
                  </span>
                )}
              </li>
              <li>
                <Link href="/download#source" className="hover:text-[#111111] dark:hover:text-[#F5F5F5] transition-colors">
                  Build from Rust workspace
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-[#E5E5E5] dark:border-[#252525] pt-6 text-xs text-[#666666] dark:text-[#929292]">
          <p>Free forever · No advertisements · No mandatory cloud uploads</p>
          <p className="font-mono">Protocol v1.0.0</p>
        </div>
      </div>
    </footer>
  );
}
