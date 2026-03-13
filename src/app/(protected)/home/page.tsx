'use client';

import { useEffect, useRef, useState } from 'react';
import * as Colyseus from "@colyseus/sdk";
import { MyRoomState } from '@/app/(protected)/home/PlayerState';
import './global.css';
import { useSession } from "next-auth/react"
import { ethers } from "ethers";
import DepositModal from '@/modals/Deposit'
import WithdrawModal from '@/modals/Withdraw';
import TransactionsModal from '@/modals/Transactions';
import CharactersModal from '@/modals/Characters';

// respuesta de la api: https://randal.onepixperday.xyz/api/profile?wallet=0x123&username=Diego
// {"wallet":"0x123","username":"Diego","balance":"0","xp":0,"characterid":5,"characters":[5,6,10,11]}

type PlayerProfile = {
  wallet: string;
  username: string;
  balance: string;
  xp: number;
  characterid: number;
  characters: number[];
};

export default function Home() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  //const [selectedCharacter, setSelectedCharacter] = useState(1);
  const [usersOnline, setUsersOnline] = useState<number | null>(null);
  const [error, setError] = useState('');
  const { data: session, status } = useSession();
  const [playerName, setPlayerName] = useState('playera');
  const [playerWallet, setPlayerWallet] = useState('');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  //const characters = Array.from({ length: 18 }, (_, i) => i + 1);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showCharactersModal, setShowCharactersModal] = useState(false);

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

  // CANTIDAD DE USUARIOS ONLINE
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

  // CONEXION
  const handleConnection = async () => {
    
    try {
    
      setError('');
      const client = new Colyseus.Client("wss://randal.onepixperday.xyz");
      const options = {wallet: playerWallet};
      const joinedRoom = await client.joinOrCreate<MyRoomState>("my_room", options);

      setRoom(joinedRoom);

    } catch (e: unknown) {setError(e instanceof Error ? e.message : "Error al conectar al servidor");}

  };

  // SALE DE LA ROOM
  useEffect(() => {
    const handleExitGame = () => {
      if (room) {
        room.leave();
      }
      setRoom(null);
    };
    window.addEventListener('exit-game', handleExitGame);
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

  // LOBBY
  if (!room) {

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
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
                  padding: "2px 6px",
                  bottom: 0,
                  right: 0,
                  background: "#477fe7",
                  borderRadius: "6px",
                  textDecoration: "none",
                  color: "white"
                }}
              >
                🔄
              </button>

            </div>

            {/* PLAYER INFO */}
            <div style={{ flex: 1 }}>

              <h3 style={{ margin: 0 }}>
                {profile.username}
              </h3>

              <p style={{ margin: "6px 0" }}>
                Balance: {profile?.balance
                  ? ethers.formatUnits(profile.balance, 18)
                  : "0"} wld
              </p>

              <p style={{ margin: 0 }}>
                XP: {profile.xp}
              </p>

            </div>

          </div>

        )}

        {/* WALLET ACTIONS */}
        {profile && (
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "20px"
            }}
          >
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
                background: "#51e7b5",
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
        )}

        {/* USERS ONLINE */}
        <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
          {usersOnline !== null
            ? `${usersOnline} jugador${usersOnline === 1 ? '' : 'es'} online`
            : 'Cargando jugadores...'}
        </p>

        {/* ENTER BUTTON */}
        <button
          disabled={!profile}
          onClick={handleConnection}
          style={{
            padding: '18px 40px',
            fontSize: '1.4rem',
            cursor: profile ? 'pointer' : 'not-allowed',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            marginTop: '20px',
            opacity: profile ? 1 : 0.5
          }}
        >
          ENTRAR
        </button>

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
        {showCharactersModal && profile && (
          <CharactersModal
            address={profile.wallet}
            onSelect={(id) => {
              
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