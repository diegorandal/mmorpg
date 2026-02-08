'use client';

import { useEffect, useRef, useState } from 'react';
import * as Colyseus from "@colyseus/sdk";
import { MyRoomState } from '@/app/(protected)/home/PlayerState';
import './global.css';
import { useSession } from "next-auth/react"

export default function Home() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState(1);
  const [error, setError] = useState('');
  const { data: session } = useSession();
  const [playerName, setPlayerName] = useState('');

  const characters = Array.from({ length: 18 }, (_, i) => i + 1);

  useEffect(() => {
    if (session?.user?.username) {
      setPlayerName(session.user.username);
    } else {
      // Generamos un nombre persistente mientras no cambie la sesión
      setPlayerName(prev => prev || 'player' + Math.floor(Math.random() * 99999));
    }
  }, [session]);

  const handleConnection = async () => {
    try {
      setError('');
      const client = new Colyseus.Client("wss://randal.onepixperday.xyz");

      const options = {
        username: playerName,
        password: playerName,
        character: selectedCharacter
      };

      const joinedRoom = await client.joinOrCreate<MyRoomState>("my_room", options);
      setRoom(joinedRoom);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al conectar al servidor");
    }
  };

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
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'flex-start', minHeight: '100vh', background: '#1a1a1a', color: 'white',
        fontFamily: 'sans-serif', padding: '20px'
      }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem', textAlign: 'center' }}>
          ¡Bienvenido, {playerName}!
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '15px',
          width: '100%',
          maxWidth: '600px',
          background: '#2a2a2a',
          padding: '12px',
          borderRadius: '12px',
          maxHeight: '60vh',
          overflowY: 'auto'
        }}>
          {characters.map((id) => (
            <div
              key={id}
              onClick={() => setSelectedCharacter(id)}
              style={{
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                border: selectedCharacter === id ? '2px solid #4CAF50' : '4px solid transparent',
                backgroundColor: selectedCharacter === id ? '#333' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.2s',
              }}
            >
              <img
                src={`https://randalrpg.onepixperday.xyz/char${id}.png`}
                alt={`Personaje ${id}`}
                style={{
                  width: '96px',
                  height: '96px',
                  imageRendering: 'pixelated',
                  objectFit: 'contain'
                }}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleConnection}
          style={{
            padding: '18px 40px', fontSize: '1.4rem', cursor: 'pointer',
            backgroundColor: '#4CAF50', color: 'white', border: 'none',
            borderRadius: '10px', fontWeight: 'bold', marginTop: '30px',
            boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)'
          }}
        >
          ENTRAR AL MUNDO
        </button>

        {error && (
          <p style={{ color: '#ff5555', marginTop: '20px', fontWeight: 'bold' }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <main style={{ width: '100vw', height: '100vh', backgroundColor: '#000' }}>
      <div id="game-container" ref={gameContainerRef} style={{ width: '100%', height: '100%' }} />
    </main>
  );
}