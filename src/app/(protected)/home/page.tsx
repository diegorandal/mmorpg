'use client';

import { useEffect, useRef, useState } from 'react';
import { MyRoomState } from '@/app/(protected)/home/PlayerState';
import { useSession } from "next-auth/react"
import { MiniKit } from '@worldcoin/minikit-js';
import { ethers } from "ethers";
import DepositModal from '@/modals/Deposit'
import WithdrawModal from '@/modals/Withdraw';
import TransactionsModal from '@/modals/Transactions';
import CharactersModal from '@/modals/Characters';
import ResultModal from '@/modals/Result';
import * as Colyseus from "@colyseus/sdk";
import './global.css';

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
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [usersOnline, setUsersOnline] = useState<number | null>(null);
  const [error, setError] = useState('');
  const { data: session, status } = useSession();
  const [playerName, setPlayerName] = useState('playera');
  const [playerWallet, setPlayerWallet] = useState('');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showCharactersModal, setShowCharactersModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [connecting, setConnecting] = useState(false);
  
  const MIN_BALANCE = 0.25; // wld

  // calcular balance disponible
  const balanceWld = profile?.balance
    ? Number(ethers.formatUnits(profile.balance, 18))
    : 0;

  const canPlay = profile && balanceWld >= MIN_BALANCE && !connecting;

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

// #region fetchProfile
  const fetchProfile = async () => {

    if (!session?.user?.id || !session.user.username) return;

    try {

      setLoadingProfile(true);

      const wallet = session.user.id.toLowerCase();
      const username = session.user.username;

      setPlayerName(username);

      const res = await fetch(
        `https://randal.onepixperday.xyz/api/profile?wallet=${wallet}&username=${username}`
      );

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
    }
  }, [session?.user?.id]);

  // #region online users
  useEffect(() => {
    const fetchUsersOnline = async () => {
      try {
        const res = await fetch("https://randal.onepixperday.xyz/api/usersonline");
        const data = await res.json();
        setUsersOnline(data.totalClients);
      } catch (err) {console.error("Error fetching users online:", err);}
    };
    fetchUsersOnline();
    const interval = setInterval(fetchUsersOnline, 5000);
    return () => clearInterval(interval);
  }, []);

  // #region Connection
  const handleConnection = async () => {

    if (!profile) return;

    setError('');
    setConnecting(true);

    try {
      const timestamp = new Date().toLocaleString(); // Ej: "27/10/2023, 15:30:05"
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
      const options = { wallet: playerWallet };
      const joinedRoom = await client.joinOrCreate<MyRoomState>("my_room", options);

      setRoom(joinedRoom);

    } catch (e: unknown) {

      const msg = e instanceof Error ? e.message : "Error al conectar al servidor";
      setError(msg);

      setTimeout(() => {setError('');}, 2000);
      console.error("Error en handleConnection:", e);

    } finally {
      setConnecting(false);
    }

  };

  // #region exitGame
  useEffect(() => {
    const handleExitGame = () => {
      
      console.log('salio de la room');

      //aca hay que llamar a que muestre el resultado de la sesion

      setShowResultModal(true);

      if(room) setRoom(null);
      
    };
    window.addEventListener('exit-game', handleExitGame);

    fetchProfile();

    return () => window.removeEventListener('exit-game', handleExitGame);


  }, [room]);


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

  // #region Return
  if (!room) {

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100vh',
        overflowY: 'auto',
        background: '#1a1a1a',
        color: 'white',
        fontFamily: 'sans-serif',
        padding: '20px'
      }}>

        {/* PROFILE CARD */}
        {loadingProfile && <p>Cargando perfil...</p>}

        {profile && (
          <div style={{
            display: "flex",
            background: "#2a2a2a",
            borderRadius: "12px",
            padding: "16px",
            width: "100%",
            maxWidth: "600px",
            marginBottom: "25px",
            gap: "16px",
            alignItems: "center"
          }}>

            {/* CHARACTER IMAGE */}
            <div style={{ position: "relative" }}>

              <img
                src={`https://randalrpg.onepixperday.xyz/char${profile.characterid}.png`}
                style={{
                  width: 96,
                  height: 96,
                  imageRendering: "pixelated",
                  borderRadius: "8px",
                  background: "#111"
                }}
              />

              {/* SHOP LINK */}
              <button
                onClick={() => setShowCharactersModal(true)}
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  textDecoration: "none",
                }}
              >
                🔄
              </button>

            </div>

            {/* PLAYER INFO */}
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0 }}>{profile.username} 
                {/* Result Modal */}
                <button onClick={() => setShowResultModal(true)} 
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: 'inherit',
                  marginLeft: '8px'
                }}>🧾</button>                
              </h3>
              <p style={{ margin: 0 }}>XP: {profile.xp}</p>
              <p style={{ margin: 0 }}>Kills: {profile.kills}</p>
            </div>

          </div>

        )}


        {/* WALLET ACTIONS */}
        {profile && (
          <div
            style={{
              display: "flex",
              flexDirection: "column", // Balance arriba, botones abajo
              background: "#2a2a2a",
              borderRadius: "12px",
              padding: "20px",
              width: "100%",
              maxWidth: "600px",
              marginBottom: "25px",
              gap: "20px",              // Espacio entre el balance y la fila de botones
              alignItems: "center"
            }}
          >
            {/* BALANCE - Centrado arriba */}
            <p style={{
              margin: 0,
              fontSize: "1.2rem",
              fontWeight: "bold",
              color: "white"
            }}>
              In-game Balance: {profile?.balance
                ? ethers.formatUnits(profile.balance, 18)
                : "0"} wld
            </p>

            {/* CONTENEDOR DE BOTONES - En una fila */}
            <div style={{
              display: "flex",
              flexDirection: "row",    // Botones uno al lado del otro
              gap: "10px",             // Espacio entre botones
              flexWrap: "wrap",        // Por si la pantalla es muy pequeña, que bajen
              justifyContent: "center" // Centra los botones
            }}>
              <button
                onClick={() => setShowDepositModal(true)}
                style={{
                  padding: "10px 22px",
                  background: "#477fe7",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                DEPOSIT
              </button>

              <button
                onClick={() => setShowWithdrawModal(true)}
                style={{
                  padding: "10px 22px",
                  background: "#e76f51",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                WITHDRAW
              </button>

              <button
                onClick={() => setShowTransactionsModal(true)}
                style={{
                  padding: "10px 22px",
                  background: "#2e7c62",
                  border: "none",
                  borderRadius: "8px",
                  color: "white", 
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                HISTORY
              </button>
            </div>
            Funds are held in-game. Withdraw to your wallet anytime.
          </div>
        )}


        <div
          style={{
            display: "flex",
            flexDirection: "column", // Esto pone los elementos en vertical
            background: "#2a2a2a",
            borderRadius: "12px",
            padding: "24px",         // Aumenté un poco el padding para mejor balance
            width: "100%",
            maxWidth: "600px",
            marginBottom: "25px",
            gap: "12px",             // Espacio entre el texto y el botón
            alignItems: "center",    // Centra ambos elementos horizontalmente
            textAlign: "center"
          }}
        >
          {/* USERS ONLINE */}
          <p style={{
            margin: 0,
            fontSize: "1.2rem",
            fontWeight: "bold",
            color: "white"
          }}>
            {usersOnline !== null
              ? `${usersOnline}/25 player${usersOnline === 1 ? '' : 's'} online`
              : 'Loading data...'}
          </p>

          <button
            disabled={!canPlay || usersOnline > 24}
            onClick={handleConnection}
            style={{
              padding: '18px 40px',
              fontSize: '1.4rem',
              cursor: canPlay ? 'pointer' : 'not-allowed',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 'bold',
              width: '100%',
              maxWidth: '300px',
              opacity: canPlay ? 1 : 0.5,
              transition: '0.2s'
            }}
          >
            {usersOnline > 24
              ? "SERVER FULL"
              : (connecting ? "CONNECTING..." : `PLAY (${MIN_BALANCE} wld)`)}
          </button>
        </div>

        {/* LEADERBOARD CARD */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: "#2a2a2a",
            borderRadius: "12px",
            padding: "20px",
            width: "100%",
            maxWidth: "600px",
            marginBottom: "15px",
            cursor: "pointer"
          }}
          onClick={() => setShowLeaderboard(!showLeaderboard)}
        >
          <h3 style={{ margin: 0 }}>
            Leaderboard {showLeaderboard ? "▲" : "▼"}
          </h3>

          {showLeaderboard && (
            <div style={{ marginTop: "15px", opacity: 0.9 }}>
              <p>1. PlayerOne — 2500 XP</p>
              <p>2. PlayerTwo — 2100 XP</p>
              <p>3. PlayerThree — 1800 XP</p>
            </div>
          )}
        </div>


        {/* HOW TO PLAY CARD */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: "#2a2a2a",
            borderRadius: "12px",
            padding: "20px",
            width: "100%",
            maxWidth: "600px",
            marginBottom: "25px",
            cursor: "pointer"
          }}
          onClick={() => setShowHowToPlay(!showHowToPlay)}
        >
          <h3 style={{ margin: 0 }}>
            How to play {showHowToPlay ? "▲" : "▼"}
          </h3>

          {showHowToPlay && (
            <div style={{ marginTop: "15px", opacity: 0.9 }}>
              <p>• Enter the world using the PLAY button.</p>
              <p>• Defeat enemys and use portals for teleport o exit.</p>
              <p>• Gain XP and wld.</p>
            </div>
          )}
        </div>

        {/* MODALs */}
        {showDepositModal && (
          <DepositModal onClose={() => setShowDepositModal(false)} onSuccess={fetchProfile}/>
        )}
        {showWithdrawModal && (
          <WithdrawModal balance={Number(ethers.formatUnits(profile.balance, 18))} onClose={() => setShowWithdrawModal(false)} onSuccess={fetchProfile}/>
        )}
        {showTransactionsModal && (
          <TransactionsModal address={profile.wallet} onClose={() => setShowTransactionsModal(false)} />
        )}
        {showResultModal && (
          <ResultModal address={profile.wallet} onClose={() => setShowResultModal(false)} />
        )}
        {showCharactersModal && profile && (
          <CharactersModal
            address={profile.wallet}
            balance={Number(ethers.formatUnits(profile.balance, 18))}
            onSelect={(id, refetechar?) => {
              
              if (refetechar) fetchProfile();
              
              setProfile(prev =>
                prev
                  ? { ...prev, characterid: id }
                  : prev
              );

            }}
            onClose={() => setShowCharactersModal(false)}
          />
        )}

        {error && (
          <p style={{ color: '#ff5555', marginTop: '20px' }}>
            {error}
          </p>
        )}

      </div>
    );
  }

  // GAME ROOM PHASER
  return (
    <main style={{ width: '100vw', height: '100vh', backgroundColor: '#000' }}>
      <div id="game-container" ref={gameContainerRef} style={{ width: '100%', height: '100%' }} />
    </main>
  );

}