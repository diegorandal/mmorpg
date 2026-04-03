'use client';

export default function Home() {

  return (
    <main className="relative flex flex-col items-center justify-center min-h-[100dvh] min-h-screen bg-black text-white font-sans">
      {/* Mensaje Central */}
      <div className="flex flex-col items-center gap-4">
        sape sape sape lokita
      </div>

      {/* Footer Fijo al fondo */}
      <footer className="absolute bottom-8 text-center">
        <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
          SkillStake (alpha 0.1.0) <span className="ml-2">diegorandal</span>
        </p>
      </footer>

    </main>
  );
}