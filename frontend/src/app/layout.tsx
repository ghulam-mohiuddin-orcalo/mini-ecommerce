import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pine & Parcel — Mini Store',
  description: 'A small, coherent e-commerce storefront and admin panel.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
