'use client';

import SecCage from './secCage';
import SecRooms from './secRooms';
import SecProfile from './secProfile';
import SecLeaderboard from './secLeaderboard';
import SecInfo from './secInfo';

import { useEffect, useRef, useState } from 'react';
import { MyRoomState } from '@/app/(protected)/home/PlayerState';
import { useSession } from "next-auth/react"
import { MiniKit } from '@worldcoin/minikit-js';
import { ethers } from "ethers";
import InfoModal from '@/modals/Information'
import DepositModal from '@/modals/Deposit'
import WithdrawModal from '@/modals/Withdraw';
import TransactionsModal from '@/modals/Transactions';
import CharactersModal from '@/modals/Characters';
import ResultModal from '@/modals/Result';
import * as Colyseus from "@colyseus/sdk";

type PlayerProfile = {
  wallet: string;
  username: string;
  balance: string;
  xp: number;
  kills: number;
  characterid: number;
  characters: number[];
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('rooms');
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<Colyseus.Room | null>(null);

  // Función para renderizar el componente según el estado
  const renderSection = () => {
    switch (activeTab) {
      case 'rooms': return <SecRooms></SecRooms>;
      case 'cage': return <SecCage></SecCage>;
      case 'profile': return <SecProfile></SecProfile>;
      case 'info': return <SecInfo></SecInfo>;
      case 'leaderboard': return <SecLeaderboard></SecLeaderboard>;
      default: return null;
    }
  };

  if (!room) {

    return (
      <main style={{minHeight: '100vh', background: '#25201c', color: 'white', display: 'flex', flexDirection: 'column'}}>

        {/* HEADER DIVIDIDO EN 2 */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 15px',
          background: '#1a1a1a',
          borderBottom: '1px solid #444',
          gap: '10px',
          flexWrap: 'nowrap'
        }}>

          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => setActiveTab('info')} className="h-10 px-2 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white border-4 border-[#D1851F] rounded-lg transition-all duration-200 active:scale-95">
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
        <nav style={{position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '15px', background: '#1a1a1a', padding: '10px 10px', borderRadius: '100px', border: '1px solid #444', backdropFilter: 'blur(5px)', zIndex: 100}}>

          <button onClick={() => setActiveTab('profile')} className="w-16 h-16 flex items-center justify-center bg-[radial-gradient(circle_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white font-bold text-3xl tracking-widest border-4 border-[#D1851F] rounded-full shadow-[0_0_10px_rgba(209,133,31,0.6)] transition-all duration-200 hover:brightness-125 hover:scale-105 active:scale-95 overflow-hidden">👤</button>
          <button onClick={() => setActiveTab('rooms')} className="w-16 h-16 flex items-center justify-center bg-[radial-gradient(circle_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white font-bold text-3xl tracking-widest border-4 border-[#D1851F] rounded-full shadow-[0_0_10px_rgba(209,133,31,0.6)] transition-all duration-200 hover:brightness-125 hover:scale-105 active:scale-95 overflow-hidden">⚔</button>
          <button onClick={() => setActiveTab('cage')} className="w-16 h-16 flex items-center justify-center bg-[radial-gradient(circle_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white font-bold text-3xl tracking-widest border-4 border-[#D1851F] rounded-full shadow-[0_0_10px_rgba(209,133,31,0.6)] transition-all duration-200 hover:brightness-125 hover:scale-105 active:scale-95 overflow-hidden">💸</button>

        </nav>

      </main>
    );
  }

  // GAME ROOM PHASER
  return (
    <main style={{ width: '100vw', height: '100vh', backgroundColor: '#000' }}>
      <div id="game-container" ref={gameContainerRef} style={{ width: '100%', height: '100%' }} />
    </main>
  );

}
