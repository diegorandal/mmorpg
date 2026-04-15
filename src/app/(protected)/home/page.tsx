'use client';

import SecVault from './secVault';
import SecRooms from './secRooms';
import SecProfile from './secProfile';
import SecLeaderboard from './secLeaderboard';
import SecInfo from './secInfo';
import SecResult from './secResult';
import SecConfig from './secConfig';
import { useEffect, useRef, useState } from 'react';
import { MyRoomState } from './PlayerState';
import { FlagRoomState } from './FlagState';
import { useSession } from "next-auth/react"
import { MiniKit } from '@worldcoin/minikit-js';
import { ethers } from "ethers";
import { formatEther } from "ethers";
import * as Colyseus from "@colyseus/sdk";

type PlayerProfile = {wallet: string; username: string; balance: string; xp: number; kills: number; characterid: number; characters: number[];};
interface Room { name: string; cost: string; desc: string; type: string; map: string; ref: string; status: string; onlineUsers: number;}

export default function Home() {

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Colyseus.Room | null>(null);
  const clientRef = useRef<Colyseus.Client | null>(null);
  const lobbyRef = useRef<Colyseus.Room | null>(null);
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [lobbyRoom, setLobbyRoom] = useState<Colyseus.Room | null>(null);
  const [error, setError] = useState('');
  const {data: session, status } = useSession();
  const [playerName, setPlayerName] = useState('playera');
  const [playerWallet, setPlayerWallet] = useState('');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [dataRooms, setDataRooms] = useState<Room[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

//  const MIN_BALANCE = 0.25; // wld
//  const balanceWld = profile?.balance ? Number(ethers.formatUnits(profile.balance, 18)) : 0;
//  const canPlay = profile && balanceWld >= MIN_BALANCE && !connecting;

  // Función para renderizar el componente según el estado
  const [activeTab, setActiveTab] = useState('rooms');

  if (!clientRef.current) {
    clientRef.current = new Colyseus.Client(
      "wss://randal.onepixperday.xyz"
    );
  }
  
  const colyseusClient = clientRef.current;

  const dataRoomsFake = [
    {name: "Desert Royale", cost: "250000000000000000", desc: "💀", type: "Royale", map: "desert", ref: "sape", status: "close", onlineUsers: 0},
    //{name: "Capture the flag", cost: "100000000000000000", desc: "🏳", type: "Flag", map: "forest", ref: "sape", status: "close", onlineUsers: 0},
    {name: "Color Teams", cost: "100000000000000000", desc: "👨🏽‍🤝‍👨🏻", type: "Teams", map: "dungeon", ref: "sapent", status: "close", onlineUsers: 0}
  ];

  const renderSection = () => {
    switch (activeTab) {
      case 'rooms': return <SecRooms roomsData={dataRooms} handleConnection={handleConnection} profile={profile}></SecRooms>;
      case 'vault': return (<SecVault address={profile!.wallet} inGameBalance={profile!.balance} fetchProfile={fetchProfile}/>);
      case 'profile': return <SecProfile profile={profile} fetchProfile={fetchProfile} handleSetActiveTab={handleSetActiveTab}></SecProfile>;
      case 'info': return <SecInfo></SecInfo>;
      case 'config': return <SecConfig></SecConfig>;
      case 'result': return <SecResult address={playerWallet} profile={profile}></SecResult>;
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
      setProfile({...data, balance: data.balance ?? "0"});
      setPlayerName(username);
      setPlayerWallet(wallet);

    } catch (err) {
      console.error('fprofile', err);
      setError("No se pudo cargar el perfil");
      setLoadingProfile(false);
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

  // #region Lobby
  useEffect(() => {
    connectLobby();
    return () => {lobbyRef.current?.leave();};
  }, []);

  const connectLobby = async () => {
    
    if (lobbyRef.current) return;

    try {
      const lobby = await colyseusClient.joinOrCreate("lobby");
      
      lobby.removeAllListeners();

      lobby.onMessage("rooms", (rooms: any[]) => {

        const formatted: Room[] = rooms.map((r) => ({
          name: r.metadata?.name ?? "",
          cost: r.metadata?.cost ?? "0",
          desc: r.metadata?.desc ?? "",
          type: r.metadata?.type ?? "",
          map: r.metadata?.map ?? "",
          ref: r.metadata?.ref ?? "",
          status: r.metadata?.status ?? "open",
          onlineUsers: r.clients ?? 0
        }));

        setDataRooms([...formatted, ...dataRoomsFake]);
      });

      setLobbyRoom(lobby);
      lobbyRef.current = lobby;

    } catch (err) {
      console.error("Lobby connection error:", err);
    }
  };

  const handleSetActiveTab = (selectTab : string) => {

    setActiveTab(selectTab);
    
  }

  // #region Connection
  const handleConnection = async (roomName: string, roomCost: string) => {

    if (!profile) return;
    if (connecting) return;
    if (room) return;

    setConnecting(true);
    setError('');
    
    if (lobbyRoom) {
      await lobbyRef.current?.leave();
      lobbyRef.current = null;
      setLobbyRoom(null);
    }


    // ======================================== SERVER FREE ===================================
    if (roomName == 'free_room') {

      try{

        const options = { wallet: playerWallet, signature: "sape" };
        const joinedRoom = await colyseusClient.join<MyRoomState>(roomName, options);
        setRoom(joinedRoom);
        
        return;
        
      } catch (e: unknown) {

          const msg = e instanceof Error ? e.message : "Error al conectar al servidor free";
          setError(msg);
          setTimeout(() => { setError(''); }, 2000);
          console.error("Error en handleConnection:", e);
        } finally {
          setConnecting(false);
        }

    }

    // ======================================== SERVER PAY ===================================

    if (roomName == 'my_room') {

      try {
        const timestamp = new Date().toLocaleString(); 
        const message = `Enter server ${formatEther(roomCost)} wld @ ${timestamp}`;
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

        //const client = new Colyseus.Client("wss://randal.onepixperday.xyz");
        const options = { wallet: playerWallet, signature: finalPayload.signature};
        const joinedRoom = await colyseusClient.join<MyRoomState>(roomName, options);

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

    // ======================================== SERVER PAY ===================================

    if (roomName == 'flag_room') {

      try {

        const options = { wallet: playerWallet, signature: "sape" };
        const joinedRoom = await colyseusClient.join<FlagRoomState>(roomName, options);
        setRoom(joinedRoom);

        return;

      } catch (e: unknown) {

        const msg = e instanceof Error ? e.message : "Error al conectar al servidor free";
        setError(msg);
        setTimeout(() => { setError(''); }, 2000);
        console.error("Error en handleConnection:", e);
      } finally {
        setConnecting(false);
      }


    }

  };
  
  // #region exitGame
  useEffect(() => {

    const handleExitGame = async () => {

      fetchProfile();
      setActiveTab('result');
      roomRef.current = null;
      setRoom(null);
      await connectLobby();

    };

    window.addEventListener('exit-game', handleExitGame);

    return () =>
      window.removeEventListener('exit-game', handleExitGame);

  }, []);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // #region setRoom
  useEffect(() => {

    if (!room) return;
    let game: Phaser.Game | null = null;

    room.onLeave((code) => {
      console.log("Left room. Code:", code);
      window.dispatchEvent(new Event("exit-game"));
    });
    
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

  useEffect(() => {

    if (!room) return;

    const handler = () => {
      if (document.visibilityState === 'hidden') {
        room.send("hidden");
      } else {
        room.send("unhidden");
      }
    };

    document.addEventListener('visibilitychange', handler);

    return () => {
      document.removeEventListener('visibilitychange', handler);
    };

  }, [room]);


  if (!profile && error) {
    return (
      <main style={{ minHeight: '100vh', background: '#25201c', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center flex flex-col gap-4">
          <p className="text-xl text-red-400">{error}</p>
          <button
            onClick={() => fetchProfile()}
            className="px-6 py-2 bg-[#D1851F] rounded-lg font-bold active:scale-95 transition-transform"
          >
            🔄 Retry Connection
          </button>
        </div>
      </main>
    );
  }

  if (!profile && activeTab !== 'info' && activeTab !== 'config') {
    return (
      <main style={{ minHeight: '100vh', background: '#25201c', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center">
          <p className="text-2xl animate-pulse">Loading profile...</p>
        </div>
      </main>
    );
  }


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
            <button onClick={() => setActiveTab('config')} className="h-10 px-2 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white border-4 border-[#D1851F] rounded-lg transition-all duration-200 active:scale-95">
              ⚙
            </button>
            <button onClick={() => setActiveTab('info')} className="h-10 px-2 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white border-4 border-[#D1851F] rounded-lg transition-all duration-200 active:scale-95">
              📄
            </button>
            <button onClick={() => setActiveTab('leaderboard')} className="h-10 px-2 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white border-4 border-[#D1851F] rounded-lg transition-all duration-200 active:scale-95 whitespace-nowrap">
              🏆
            </button>
            <button onClick={() => setActiveTab('result')} className="h-10 px-2 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white border-4 border-[#D1851F] rounded-lg transition-all duration-200 active:scale-95 whitespace-nowrap">
              ✔
            </button>
          </div>

          {/* DERECHA: Este es el que debe adaptarse si el espacio es crítico */}
          <div style={{ minWidth: 0, flexShrink: 1 }}>
            <button onClick={() => setActiveTab('vault')} className="h-10 px-2 w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] border-4 border-[#D1851F] rounded-lg overflow-hidden">
              <span className="flex items-center gap-1">
                <span>💰</span>
                <span className="text-xs bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent font-bold truncate">
                  {profile?.balance ? ethers.formatUnits(profile?.balance, 18) : "0"}
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
          <button onClick={() => setActiveTab('vault')} className="w-16 h-16 flex items-center justify-center bg-[radial-gradient(circle_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white font-bold text-3xl tracking-widest border-4 border-[#D1851F] rounded-full shadow-[0_0_10px_rgba(209,133,31,0.6)] transition-all duration-200 hover:brightness-125 hover:scale-105 active:scale-95 overflow-hidden">💸</button>

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
