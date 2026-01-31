'use client';

import { useEffect, useRef, useState } from 'react';
import * as Colyseus from "colyseus.js";
import './global.css';

export default function Home() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [form, setForm] = useState({ user: '', pass: '' });
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const client = new Colyseus.Client("wss://randalmmorpg.duckdns.org");
      // Intentamos unirnos enviando las credenciales a onAuth
      const joinedRoom = await client.joinOrCreate("my_room", {
        username: form.user,
        password: form.pass
      });

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

        game = new Phaser.Game(config);

        // Forma más segura: Inyectar directamente en el registry apenas se crea la instancia
        game.registry.set('room', room);
      }
    };

    initPhaser();
    return () => { game?.destroy(true); };
  }, [room]);

  if (!room) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#222', color: 'white' }}>
        <h2>RPG Login</h2>
        <input type="text" placeholder="Usuario" onChange={e => setForm({ ...form, user: e.target.value })} style={{ margin: 5, padding: 8 }} />
        <input type="password" placeholder="Password" onChange={e => setForm({ ...form, pass: e.target.value })} style={{ margin: 5, padding: 8 }} />
        <button onClick={handleLogin} style={{ padding: '10px 20px', cursor: 'pointer' }}>Entrar</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    );
  }

  return (
    <main style={{ width: '100vw', height: '100vh', backgroundColor: '#000' }}>
      <div id="game-container" ref={gameContainerRef} />
    </main>
  );
}