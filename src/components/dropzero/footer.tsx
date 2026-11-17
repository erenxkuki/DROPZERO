import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export function Footer() {
  const repoUrl =
    (import.meta.env.VITE_DROPZERO_REPO_URL as string | undefined)?.trim() || '';

  return (
    <footer className="border-t border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#080808]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 text-[#111111] dark:text-[#F5F5F5]">
              <span className="font-mono text-sm font-semibold tracking-[0.14em] uppercase">
                DROPZERO
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#666666] dark:text-[#929292]">
              Transfer without limits. Direct encrypted peer-to-peer file transport with zero
              accounts, zero cloud storage, and cryptographic verification.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#111111] dark:text-[#F5F5F5]">
              Workspace
            </p>
            <ul className="mt-3 space-y-2 text-xs text-[#666666] dark:text-[#929292]">
              <li>
                <Link to="/transfer" className="hover:text-[#111111] dark:hover:text-[#F5F5F5]">
                  Transfer
                </Link>
              </li>
              <li>
                <Link to="/devices" className="hover:text-[#111111] dark:hover:text-[#F5F5F5]">
                  Devices
                </Link>
              </li>
              <li>
                <Link to="/history" className="hover:text-[#111111] dark:hover:text-[#F5F5F5]">
                  History
                </Link>
              </li>
              <li>
                <Link to="/settings" className="hover:text-[#111111] dark:hover:text-[#F5F5F5]">
                  Settings
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#111111] dark:text-[#F5F5F5]">
              Architecture
            </p>
            <ul className="mt-3 space-y-2 text-xs text-[#666666] dark:text-[#929292]">
              <li>
                <Link to="/features" className="hover:text-[#111111] dark:hover:text-[#F5F5F5]">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/security" className="hover:text-[#111111] dark:hover:text-[#F5F5F5]">
                  Security
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-[#111111] dark:hover:text-[#F5F5F5]">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#111111] dark:hover:text-[#F5F5F5]">
                  About
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#111111] dark:text-[#F5F5F5]">
              Clients & Source
            </p>
            <ul className="mt-3 space-y-2 text-xs text-[#666666] dark:text-[#929292]">
              <li>
                <Link to="/download" className="hover:text-[#111111] dark:hover:text-[#F5F5F5]">
                  Desktop & CLI Releases
                </Link>
              </li>
              <li>
                {repoUrl ? (
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-[#111111] dark:hover:text-[#F5F5F5]"
                  >
                    Source Repository
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : (
                  <span className="text-[#8A8A8A] dark:text-[#626262]">
                    Repo URL via VITE_DROPZERO_REPO_URL
                  </span>
                )}
              </li>
              <li className="font-mono text-[11px] text-[#8A8A8A] dark:text-[#626262]">
                Dual License · MIT / Apache-2.0
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-[#E5E5E5] dark:border-[#252525] pt-6 text-xs text-[#8A8A8A] dark:text-[#626262]">
          <p>Free forever · No ads · No telemetry · No cloud file storage</p>
          <p className="font-mono tabular-nums">DROPZERO v1.0.0 · Protocol dz-p2p/1.0</p>
        </div>
      </div>
    </footer>
  );
}
