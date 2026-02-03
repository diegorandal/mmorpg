'use client';

import { useEffect, useRef, useState } from 'react';
import * as Colyseus from "@colyseus/sdk";
import { MyRoomState } from '@/app/(protected)/home/PlayerState';
import './global.css';

export default function Home() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [form, setForm] = useState({ user: '', pass: '', character: 1 });
  const [error, setError] = useState('');

  const characters = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const handleConnection = async () => {
    try {
      setError('');
      const client = new Colyseus.Client("wss://randalmmorpg.duckdns.org");

      const options = {
        username: form.user,
        password: form.pass,
        ...(isRegistering && { character: form.character })
      };

      const joinedRoom = await client.joinOrCreate<MyRoomState>("my_room", options);
      setRoom(joinedRoom);

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al conectar");
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
          preBoot: (g) => {
            g.registry.set('room', room);
          }
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
        justifyContent: 'center', minHeight: '100vh', background: '#1a1a1a', color: 'white',
        fontFamily: 'sans-serif', padding: '20px'
      }}>
        <h2 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          {isRegistering ? 'Nuevo Héroe' : 'Mundo RPG'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '500px' }}>
          <input
            type="text"
            placeholder="Usuario"
            onChange={e => setForm({ ...form, user: e.target.value })}
            style={{ padding: '25px', fontSize: '1.8rem', borderRadius: '12px', border: 'none', width: '100%' }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            onChange={e => setForm({ ...form, pass: e.target.value })}
            style={{ padding: '25px', fontSize: '1.8rem', borderRadius: '12px', border: 'none', width: '100%' }}
          />

          {isRegistering && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '1.5rem', marginBottom: '15px', textAlign: 'center' }}>Selecciona tu apariencia:</p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '10px',
                background: '#333',
                padding: '15px',
                borderRadius: '12px'
              }}>
                {characters.map((id) => (
                  <div
                    key={id}
                    onClick={() => setForm({ ...form, character: id })}
                    style={{
                      cursor: 'pointer',
                      padding: '10px',
                      borderRadius: '8px',
                      border: form.character === id ? '4px solid #4CAF50' : '4px solid transparent',
                      backgroundColor: form.character === id ? '#444' : 'transparent',
                      transition: '0.2s',
                      display: 'flex',
                      justifyContent: 'center'
                    }}
                  >
                    <img
                      src={`/char${id}.png`}
                      alt={`Char ${id}`}
                      style={{ width: '48px', height: 'auto', imageRendering: 'pixelated' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleConnection}
            style={{
              padding: '25px', fontSize: '2rem', cursor: 'pointer',
              backgroundColor: '#4CAF50', color: 'white', border: 'none',
              borderRadius: '12px', fontWeight: 'bold', marginTop: '20px'
            }}
          >
            {isRegistering ? 'CREAR Y JUGAR' : 'ENTRAR'}
          </button>

          <button
            onClick={() => setIsRegistering(!isRegistering)}
            style={{
              background: 'none', border: 'none', color: '#4da6ff',
              textDecoration: 'underline', cursor: 'pointer', fontSize: '1.4rem'
            }}
          >
            {isRegistering ? '« Volver al Login' : '¿Eres nuevo? Crear personaje'}
          </button>
        </div>

        {error && <p style={{ color: '#ff5555', fontSize: '1.5rem', marginTop: '30px', fontWeight: 'bold', textAlign: 'center' }}>{error}</p>}
      </div>
    );
  }

  return (
    <main style={{ width: '100vw', height: '100vh', backgroundColor: '#000' }}>
      <div id="game-container" ref={gameContainerRef} style={{ width: '100%', height: '100%' }} />
    </main>
  );
}