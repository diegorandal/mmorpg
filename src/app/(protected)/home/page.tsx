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
        config.callbacks = { preBoot: (g) => { g.registry.set('room', room); } };
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
        fontFamily: 'sans-serif', padding: '10px'
      }}>
        {/* Título */}
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', textAlign: 'center' }}>
          {isRegistering ? 'Nuevo PJ' : 'Randal RPG'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '320px' }}>
          <input
            type="text"
            placeholder="Usuario"
            onChange={e => setForm({ ...form, user: e.target.value })}
            style={{ padding: '12px', fontSize: '1.1rem', borderRadius: '8px', border: 'none', width: '100%', boxSizing: 'border-box' }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            onChange={e => setForm({ ...form, pass: e.target.value })}
            style={{ padding: '12px', fontSize: '1.1rem', borderRadius: '8px', border: 'none', width: '100%', boxSizing: 'border-box' }}
          />

          {isRegistering && (
            <div style={{ marginTop: '10px', width: '100%' }}>
              <p style={{ fontSize: '1rem', marginBottom: '8px', textAlign: 'center' }}>Selecciona tu personaje:</p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)', // 5 columnas para que quepan bien
                gap: '8px',
                background: '#2a2a2a',
                padding: '10px',
                borderRadius: '8px',
                justifyItems: 'center'
              }}>
                {characters.map((id) => (
                  <div
                    key={id}
                    onClick={() => setForm({ ...form, character: id })}
                    style={{
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      border: form.character === id ? '2px solid #4CAF50' : '2px solid transparent',
                      backgroundColor: form.character === id ? '#333' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <img
                      src={`/char${id}.png`}
                      alt={`C${id}`}
                      style={{ width: '32px', height: 'auto', imageRendering: 'pixelated' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleConnection}
            style={{
              padding: '15px', fontSize: '1.2rem', cursor: 'pointer',
              backgroundColor: '#4CAF50', color: 'white', border: 'none',
              borderRadius: '8px', fontWeight: 'bold', marginTop: '10px'
            }}
          >
            {isRegistering ? 'CREAR Y ENTRAR' : 'ENTRAR'}
          </button>

          <button
            onClick={() => setIsRegistering(!isRegistering)}
            style={{
              background: 'none', border: 'none', color: '#4da6ff',
              textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem'
            }}
          >
            {isRegistering ? '« Volver al Login' : '¿Eres nuevo? Crear personaje'}
          </button>
        </div>

        {error && <p style={{ color: '#ff5555', fontSize: '1rem', marginTop: '15px', textAlign: 'center', maxWidth: '300px' }}>{error}</p>}
      </div>
    );
  }

  return (
    <main style={{ width: '100vw', height: '100vh', backgroundColor: '#000' }}>
      <div id="game-container" ref={gameContainerRef} style={{ width: '100%', height: '100%' }} />
    </main>
  );
}