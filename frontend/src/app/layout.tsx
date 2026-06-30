import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Verdant — Mini Store',
  description: 'A small, coherent e-commerce storefront and admin panel.',
};

// Resolve the saved theme before first paint so dark mode never flashes. Reads the same
// localStorage key + resolution rule as usePreferences; writes only 'light'|'dark'.
const themeBootstrap = `(function(){try{
  var t='system';
  var raw=localStorage.getItem('pp:preferences');
  if(raw){var p=JSON.parse(raw);if(p&&p.theme)t=p.theme;}
  if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  var d=document.documentElement;
  d.dataset.theme=t;
  d.style.colorScheme=t;
}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500;1,6..72,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

