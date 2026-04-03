'use client';

import SecCage from './secCage';
import SecRooms from './secRooms';
import SecProfile from './secProfile';
import SecLeaderboard from './secLeaderboard';
import SecInfo from './secInfo';
import SecResult from './secResult';

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

type PlayerProfile = {wallet: string; username: string; balance: string; xp: number; kills: number; characterid: number; characters: number[];};

export default function Home() {

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [usersOnline, setUsersOnline] = useState<number | null>(null);
  const [usersOnlineFree, setUsersOnlineFree] = useState<number | null>(null);
  const [error, setError] = useState('');
  const { data: session, status } = useSession();
  const [playerName, setPlayerName] = useState('playera');
  const [playerWallet, setPlayerWallet] = useState('');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectingFree, setConnectingFree] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [infoSelector, setInfoSelector] = useState<string | null>(null);

  const MIN_BALANCE = 0.25; // wld
  const balanceWld = profile?.balance ? Number(ethers.formatUnits(profile.balance, 18)) : 0;
  const canPlay = profile && balanceWld >= MIN_BALANCE && !connecting;

  // Función para renderizar el componente según el estado
  const [activeTab, setActiveTab] = useState('rooms');
  const dataRoomsEjemplo = [
    {
      name: "Forest Training",
      cost: "0.00",
      desc: "⚔",
      type: "Training",
      map: "Forest",
      ref: "asd",
      onlineUsers: 12
    },
    {
      name: "Forest Stake",
      cost: "0.250 WLD",
      desc: "⚔",
      type: "Stake",
      map: "Forest",
      ref: "asd",
      onlineUsers: 5
    },
    {
      name: "Desert Royale",
      cost: "0.250 WLD",
      desc: "💀",
      type: "Royale",
      map: "Desert",
      ref: "asd",
      onlineUsers: 28
    },
    {
      name: "Capture the flag",
      cost: "0.01 WLD",
      desc: "🏳",
      type: "Flag",
      map: "Forest",
      ref: "asd",
      onlineUsers: 3
    },
    {
      name: "Color Teams",
      cost: "0.10 WLD",
      desc: "👨🏽‍🤝‍👨🏻",
      type: "Teams",
      map: "Dungeons",
      ref: "asd",
      onlineUsers: 8
    }
  ];

  const renderSection = () => {
    switch (activeTab) {
      case 'rooms': return <SecRooms roomsData={dataRoomsEjemplo} handleConnection={handleConnection}></SecRooms>;
      case 'cage': return <SecCage></SecCage>;
      case 'profile': return <SecProfile></SecProfile>;
      case 'info': return <SecInfo></SecInfo>;
      case 'result': return <SecResult></SecResult>;
      case 'leaderboard': return <SecLeaderboard loading={loadingLeaderboard} data={leaderboardData}></SecLeaderboard>;
      default: return null;
    }
  };

  // #region fetchProfile
  const fetchProfile = async () => {
    if (!session?.user?.id || !session.user.username) return;
    try {
      setLoadingProfile(true);
      const wallet = session.user.id.toLowerCase();
      const username = session.user.username;
      setPlayerName(username);
      const res = await fetch(`https://randal.onepixperday.xyz/api/profile?wallet=${wallet}&username=${username}`);
      if (!res.ok) throw new Error("Perfil no encontrado");
      const data = await res.json();
      setProfile(data);
      setPlayerName(data.username);
      setPlayerWallet(data.wallet);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el perfil");
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchProfile();
      fetchLeaderboard();
    }
  }, [session?.user?.id]);

  // #region fetchLeaderboard
  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const response = await fetch("https://randal.onepixperday.xyz/api/get-leaderboard");
      const data = await response.json();
      if (data.body && data.body.result) setLeaderboardData(data.body.result);
    } catch (error) {
      console.error("Error cargando el leaderboard:", error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  // #region Connection
  const handleConnection = async (roomName: string) => {

    if (!profile) return;

    setError('');

    if(roomName == 'my_room'){
      setConnecting(true);
    } 

    // ======================================== SERVER FREE ===================================
    if (roomName == 'free_room') {

      setConnectingFree(true);

      try{

        const client = new Colyseus.Client("wss://randal.onepixperday.xyz");
        const options = { wallet: playerWallet, signature: "sape" };
        const joinedRoom = await client.join<MyRoomState>(roomName, options);
        setRoom(joinedRoom);
        
        return;
        
      } catch (e: unknown) {

          const msg = e instanceof Error ? e.message : "Error al conectar al servidor free";
          setError(msg);
          setTimeout(() => { setError(''); }, 2000);
          console.error("Error en handleConnection:", e);
        } finally {
          setConnectingFree(false);
        }

    }

    // ======================================== SERVER PAY ===================================

    if (roomName == 'my_room') {

      try {
        const timestamp = new Date().toLocaleString(); 
        const message = `Enter server ${MIN_BALANCE} wld @ ${timestamp}`;
        const { finalPayload } = await MiniKit.commandsAsync.signMessage({ message });
        
        if (finalPayload.status !== "success") {
          throw new Error("Fallo en la firma del mensaje");
        }

        const res = await fetch(
          "https://randal.onepixperday.xyz/api/enter",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({address: finalPayload.address, signature: finalPayload.signature, message})
          }
        );
        
        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }

        const data = await res.json();

        if (data.statusCode === 500 || data.body?.error) {
          throw new Error(data.body?.error || "Error interno del servidor");
        }

        const client = new Colyseus.Client("wss://randal.onepixperday.xyz");
        const options = { wallet: playerWallet, signature: finalPayload.signature};
        const joinedRoom = await client.join<MyRoomState>(roomName, options);

        setRoom(joinedRoom);

      } catch (e: unknown) {

        const msg = e instanceof Error ? e.message : "Error al conectar al servidor";
        setError(msg);

        setTimeout(() => {setError('');}, 2000);
        console.error("Error en handleConnection:", e);

      } finally {
        setConnecting(false);
      }

    }

  };

  // #region exitGame
  useEffect(() => {
    const handleExitGame = () => {
      setActiveTab('result');
      if(room) setRoom(null);
    };
    window.addEventListener('exit-game', handleExitGame);
    fetchProfile();
    return () => window.removeEventListener('exit-game', handleExitGame);
  }, [room]);

  // #region setRoom
  useEffect(() => {
    if (!room) return;
    let game: Phaser.Game | null = null;
    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default;
      const { getGameConfig } = await import('../game/PhaserGame');
      if (gameContainerRef.current) {
        const config = getGameConfig(gameContainerRef.current.id);
        config.callbacks = {
          preBoot: (g) => { g.registry.set('room', room); }
        };
        game = new Phaser.Game(config);
      }
    };
    initPhaser();
    return () => { game?.destroy(true); };
  }, [room]);

  if (!room) {
    // #region return
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
                  {profile?.balance ? ethers.formatUnits(profile.balance, 18) : "0"}
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
