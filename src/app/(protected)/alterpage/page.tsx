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
      case 'economy': return <div className="p-4">Sección 3: Ranking</div>;
      case 'profile': return <div className="p-4">Sección 4: Inventario</div>;
      case 'howtoplay': return <div className="p-4">Sección 5: Configuración</div>;
      case 'info': return <div className="p-4">INFORMATION</div>;
      case 'leaderboard': return <div className="p-4">LEADERBOARD</div>;
      default: return null;
    }
  };

  return (
    <main style={{minHeight: '100vh', background: '#25201c', color: 'white', display: 'flex', flexDirection: 'column'}}>

      {/* HEADER DIVIDIDO EN 2 */}
      <header style={{display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#1a1a1a', borderBottom: '1px solid #444'}}>
        {/* Izquierda: 2 botones */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setActiveTab('info')} className="h-12 px-2 ph-2 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white font-bold text-xl tracking-widest border-4 border-[#D1851F] rounded-xl shadow-[0_0_10px_rgba(209,133,31,0.6)] transition-all duration-200 hover:brightness-125 hover:scale-105 active:scale-95 overflow-hidden whitespace-nowrap">📄</button>
          <button onClick={() => setActiveTab('leaderboard')} className="h-12 px-2 ph-2 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white font-bold text-xl tracking-widest border-4 border-[#D1851F] rounded-xl shadow-[0_0_10px_rgba(209,133,31,0.6)] transition-all duration-200 hover:brightness-125 hover:scale-105 active:scale-95 overflow-hidden whitespace-nowrap">🏆
            <span className="bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent font-bold">
              #123
            </span>
          </button>
        </div>
        {/* Derecha: 1 botón (ej: Perfil o Ajustes) */}
        <div>
          <button className="h-12 px-2 ph-2 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] ext-white font-bold text-xl tracking-widest border-4 border-[#D1851F] rounded-xl shadow-[0_0_10px_rgba(209,133,31,0.6)] transition-all duration-200 hover:brightness-125 hover:scale-105 active:scale-95 overflow-hidden whitespace-nowrap">💰
            <span className="bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent font-bold">
              0.002468
            </span>
          </button>
        </div>
      </header>

      {/* CONTENIDO DINÁMICO */}
      <section style={{ flex: 1, paddingBottom: '80px', overflowY: 'auto' }}>
        {renderSection()}
      </section>

      {/* FOOTER FLOTANTE */}
      <nav style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '15px',
        background: 'rgba(26, 26, 26, 0.9)',
        padding: '10px 20px',
        borderRadius: '100px',
        border: '1px solid #555',
        backdropFilter: 'blur(5px)',
        zIndex: 100
      }}>

        <button onClick={() => setActiveTab('profile')} className="w-18 h-18 flex items-center justify-center bg-[radial-gradient(circle_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white font-bold text-4xl tracking-widest border-4 border-[#D1851F] rounded-full shadow-[0_0_10px_rgba(209,133,31,0.6)] transition-all duration-200 hover:brightness-125 hover:scale-105 active:scale-95 overflow-hidden">🧙‍♂️</button>
        <button onClick={() => setActiveTab('rooms')} className="w-18 h-18 flex items-center justify-center bg-[radial-gradient(circle_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white font-bold text-4xl tracking-widest border-4 border-[#D1851F] rounded-full shadow-[0_0_10px_rgba(209,133,31,0.6)] transition-all duration-200 hover:brightness-125 hover:scale-105 active:scale-95 overflow-hidden">⚔</button>
        <button onClick={() => setActiveTab('cage')} className="w-18 h-18 flex items-center justify-center bg-[radial-gradient(circle_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white font-bold text-4xl tracking-widest border-4 border-[#D1851F] rounded-full shadow-[0_0_10px_rgba(209,133,31,0.6)] transition-all duration-200 hover:brightness-125 hover:scale-105 active:scale-95 overflow-hidden">💸</button>

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