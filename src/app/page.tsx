'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { walletAuth } from '@/auth/wallet';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Es una buena práctica manejar efectos secundarios como redirecciones 
  // o llamadas a funciones externas dentro de un useEffect.
  useEffect(() => {
    if (status === 'authenticated') {

      if (!session?.user?.id || !session.user.username) return;

      if (session.user.id.toLowerCase() === '0x10fed80b87407320cfb2affbd68be78868937a6e'){
        router.push('/home/alterpage.tsx');
      } else {
        router.push('/home');
      }

      


    } else if (status === 'unauthenticated') {
      walletAuth();
    }
  }, [status, router]);

  return (
    <main className="relative flex flex-col items-center justify-center min-h-[100dvh] min-h-screen bg-black text-white font-sans">

      {/* Mensaje Central */}
      <div className="flex flex-col items-center gap-4">
        {status === 'loading' ? (
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm tracking-widest uppercase opacity-70">Loading</p>
          </div>
        ) : (
          <p className="text-sm tracking-widest uppercase opacity-70">
              Waiting for authentication...
          </p>
        )}
      </div>

      {/* Footer Fijo al fondo */}
      <footer className="absolute bottom-8 text-center">
        <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
          SkillStake (alpha 0.1.1) <span className="ml-2">diegorandal</span>
        </p>
      </footer>

    </main>
  );
}