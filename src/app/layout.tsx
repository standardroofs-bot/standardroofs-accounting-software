import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "Standard Roofs Books (SR-Books) — HR & ERP",
  description: "Enterprise Workforce Attendance, Employee Self-Service & ERP System for Standard Roofs",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SR-Books HR",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // 1. Theme initialization
                try {
                  var saved = localStorage.getItem('sr_theme');
                  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}

                // 2. Unbreakable Client Self-Healing: Intercept chunk/script 404s before React crashes
                function triggerSafeReload(reason) {
                  var key = 'sr_auto_heal_ts';
                  var last = sessionStorage.getItem(key);
                  var now = Date.now();
                  if (!last || now - parseInt(last, 10) > 8000) {
                    sessionStorage.setItem(key, String(now));
                    console.warn('[SR-Books Auto-Heal] Recovering from stale chunk (' + reason + '). Reloading fresh assets...');
                    window.location.reload();
                  }
                }

                // Capture script loading failures (404 on outdated hashed chunks)
                window.addEventListener('error', function(e) {
                  var target = e.target || {};
                  var isScript = target.tagName === 'SCRIPT' && target.src;
                  var msg = (e.message || '').toLowerCase();
                  if (isScript && (target.src.indexOf('/_next/static/') !== -1 || target.src.indexOf('chunks') !== -1)) {
                    triggerSafeReload('script_404: ' + target.src);
                  } else if (msg.indexOf('loading chunk') !== -1 || msg.indexOf('chunkloaderror') !== -1) {
                    triggerSafeReload('error_event: ' + msg);
                  }
                }, true); // Capture phase is essential for script errors!

                // Capture Promise rejections from dynamic imports
                window.addEventListener('unhandledrejection', function(e) {
                  var reason = e.reason || {};
                  var msg = (reason.message || String(reason) || '').toLowerCase();
                  if (msg.indexOf('loading chunk') !== -1 || msg.indexOf('chunkloaderror') !== -1 || msg.indexOf('failed to fetch dynamically imported') !== -1) {
                    triggerSafeReload('unhandled_rejection');
                  }
                });

                // 3. Register Service Worker for PWA
                if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function(err) {
                      console.log('[SW] Registration failed:', err);
                    });
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
