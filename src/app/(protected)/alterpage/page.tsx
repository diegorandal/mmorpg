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
      default: return null;
    }
  };

  return (
    <main style={{minHeight: '100vh', background: '#25201c', color: 'white', display: 'flex', flexDirection: 'column'}}>

      {/* HEADER DIVIDIDO EN 2 */}
      <header style={{display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#1a1a1a', borderBottom: '1px solid #444'}}>
        {/* Izquierda: 2 botones */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setActiveTab('')} style={btnHeaderStyle}>S1</button>
          <button onClick={() => setActiveTab('')} style={btnHeaderStyle}>S2</button>
        </div>
        {/* Derecha: 1 botón (ej: Perfil o Ajustes) */}
        <div>
          <button style={{ ...btnHeaderStyle, background: '#444' }}>Perfil</button>
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
        borderRadius: '30px',
        border: '1px solid #555',
        backdropFilter: 'blur(5px)',
        zIndex: 100
      }}>
        <button onClick={() => setActiveTab('profile')} style={btnFooterStyle}>👨</button>
        <button onClick={() => setActiveTab('rooms')} style={btnFooterStyle}>⚔</button>
        <button onClick={() => setActiveTab('cage')} style={btnFooterStyle}>💸</button>
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