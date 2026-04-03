'use client';

import { useState } from 'react';
import SecCage from './secCage';
import SecRooms from './secRooms';

export default function Home() {
    const [activeTab, setActiveTab] = useState('rooms');

  // Función para renderizar el componente según el estado
  const renderSection = () => {
    switch (activeTab) {
      case 'rooms': return <SecRooms></SecRooms>;
      case 'cage': return <SecCage></SecCage>;
      case 'profile': return <div className="p-4">PROFILE</div>;
      case 'info': return <div className="p-4">INFORMATION</div>;
      case 'leaderboard': return <div className="p-4">LEADERBOARD</div>;
      default: return null;
    }
  };

  return (
    <main style={{minHeight: '100vh', background: '#25201c', color: 'white', display: 'flex', flexDirection: 'column'}}>

      {/* HEADER DIVIDIDO EN 2 */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center', // Alineación vertical
        padding: '10px 15px',
        background: '#1a1a1a',
        borderBottom: '1px solid #444',
        gap: '10px',
        flexWrap: 'nowrap'
      }}>

        {/* IZQUIERDA: Contenedor con shrink 0 para que no se achiquen estos iconos sape */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button onClick={() => setActiveTab('info')}
            className="h-10 px-2 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white border-4 border-[#D1851F] rounded-lg transition-all duration-200 active:scale-95">
            📄
          </button>

          <button onClick={() => setActiveTab('leaderboard')}
            className="h-10 px-2 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white border-4 border-[#D1851F] rounded-lg transition-all duration-200 active:scale-95 whitespace-nowrap">
            <span className="flex items-center gap-1">
              <span>🏆</span>
              <span className="ml-1 text-xs bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent font-bold">#123</span>
            </span>
          </button>
        </div>

        {/* DERECHA: Este es el que debe adaptarse si el espacio es crítico */}
        <div style={{ minWidth: 0, flexShrink: 1 }}>
          <button onClick={() => setActiveTab('cage')} className="h-10 px-2 w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] border-4 border-[#D1851F] rounded-lg overflow-hidden">
            <span className="flex items-center gap-1">
              <span>💰</span>
              <span className="text-xs bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent font-bold truncate">
                0.002468
              </span>
            </span>
          </button>
        </div>
      </header>

      {/* CONTENIDO DINÁMICO */}
      <section style={{ flex: 1, paddingBottom: '80px', overflowY: 'auto' }}>
        {renderSection()}
      </section>

      {/* FOOTER FLOTANTE */}
      <nav style={{position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '15px', background: 'rgba(26, 26, 26, 0.9)', padding: '10px 10px', borderRadius: '100px', border: '1px solid #555', backdropFilter: 'blur(5px)', zIndex: 100}}>

        <button onClick={() => setActiveTab('profile')} className="w-16 h-16 flex items-center justify-center bg-[radial-gradient(circle_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white font-bold text-4xl tracking-widest border-4 border-[#D1851F] rounded-full shadow-[0_0_10px_rgba(209,133,31,0.6)] transition-all duration-200 hover:brightness-125 hover:scale-105 active:scale-95 overflow-hidden">👤</button>
        <button onClick={() => setActiveTab('rooms')} className="w-16 h-16 flex items-center justify-center bg-[radial-gradient(circle_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white font-bold text-4xl tracking-widest border-4 border-[#D1851F] rounded-full shadow-[0_0_10px_rgba(209,133,31,0.6)] transition-all duration-200 hover:brightness-125 hover:scale-105 active:scale-95 overflow-hidden">⚔</button>
        <button onClick={() => setActiveTab('cage')} className="w-16 h-16 flex items-center justify-center bg-[radial-gradient(circle_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white font-bold text-4xl tracking-widest border-4 border-[#D1851F] rounded-full shadow-[0_0_10px_rgba(209,133,31,0.6)] transition-all duration-200 hover:brightness-125 hover:scale-105 active:scale-95 overflow-hidden">💸</button>

      </nav>

    </main>
  );
}

// ESTILOS RÁPIDOS
const btnHeaderStyle = {
  padding: '8px 15px',
  borderRadius: '6px',
  border: 'none',
  background: '#333',
  color: 'white',
  cursor: 'pointer'
};

const btnFooterStyle = {
  fontSize: '1.5rem',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '5px'
};