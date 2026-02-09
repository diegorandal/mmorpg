'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { walletAuth } from '@/auth/wallet';

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  router.push('/home');
  return null;

}

/*

'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { walletAuth } from '@/auth/wallet';

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p>Cargando...</p>
      </main>
    );
  }

  if (status === 'authenticated') {
    router.push('/home');
    return null;
  }

  if (status === 'unauthenticated') {
    walletAuth();
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p>Esperando autenticación...</p>
      </main>
    );
  }
  return null;
}

*/