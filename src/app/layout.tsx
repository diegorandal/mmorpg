import { auth } from '@/auth';
import ClientProviders from '@/providers';
//import '@worldcoin/mini-apps-ui-kit-react/styles.css';
import type { Metadata, Viewport } from 'next'; // Importa Viewport
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

// Esto es CRUCIAL para que el contenido se dibuje detrás de las barras del sistema
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // <--- Esto expande el juego al borde físico
};


const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'sKillsTake',
  description: 'ARPG 2D multijugador',
  verification: {other: {'app-oracle': 'd43995187006'}}
};

export default async function RootLayout({children}: Readonly<{children: React.ReactNode;}>) {
  
  const session = await auth();
  
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`} style={{
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        height: '100dvh', // Usamos dvh para móviles (dynamic viewport height)
        backgroundColor: '#000'
      }}>
        <ClientProviders session={session}>{children}</ClientProviders>
      </body>
    </html>
  );

}
