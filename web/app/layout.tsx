import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rover Control Dashboard',
  description: 'Real-time WebRTC audio & remote telemetry control panel for Raspberry Pi Rover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-emerald-500 selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
