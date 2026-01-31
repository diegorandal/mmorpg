'use client';

import { useState } from 'react';
import * as Colyseus from "colyseus.js";
import './global.css';

// Interfaces estrictas
interface IPlayerState {
  username?: string;
  name?: string;
  x: number;
  y: number;
  lastMessage: string;
}

interface IPlayerMonitor extends IPlayerState {
  sessionId: string;
}

export default function Home() {
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [players, setPlayers] = useState<IPlayerMonitor[]>([]);
  const [form, setForm] = useState({ user: '', pass: '' });
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      setError(''); // Limpiamos errores previos
      const client = new Colyseus.Client("wss://randalmmorpg.duckdns.org");

      const joinedRoom = await client.joinOrCreate("my_room", {
        username: form.user,
        password: form.pass
      });

      // Guardamos la sala PRIMERO
      setRoom(joinedRoom);

      // Configuramos los listeners del estado
      joinedRoom.onStateChange((state) => {
        if (!state?.players) return;

        const playersArray: IPlayerMonitor[] = [];

        state.players.forEach((player: IPlayerState | undefined, sessionId: string) => {
          if (!player) return; // ⬅️ ESTO ES CLAVE

          playersArray.push({
            sessionId,
            username: player.username,
            name: player.name,
            x: player.x ?? 0,
            y: player.y ?? 0,
            lastMessage: player.lastMessage ?? ""
          });
        });

        setPlayers(playersArray);
      });

    } catch (e: unknown) {
      console.error("Error en login:", e);
      setError(e instanceof Error ? e.message : "Error al conectar");
    }
  };

  // Pantalla de Login
  if (!room) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#222', color: 'white' }}>
        <h2>RPG Login</h2>
        <input type="text" placeholder="Usuario" onChange={e => setForm({ ...form, user: e.target.value })} style={{ margin: 5, padding: 8 }} />
        <input type="password" placeholder="Password" onChange={e => setForm({ ...form, pass: e.target.value })} style={{ margin: 5, padding: 8 }} />
        <button onClick={handleLogin} style={{ padding: '10px 20px', cursor: 'pointer' }}>Entrar</button>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </div>
    );
  }

  // Pantalla de Monitor (Solo se renderiza si room existe)
  return (
    <main style={{ padding: '20px', backgroundColor: '#000', color: '#0f0', minHeight: '100vh', fontFamily: 'monospace' }}>
      {/* Usamos Optional Chaining (?.) para evitar leer 'name' de undefined */}
      <h2>📡 Monitor de Sala: {room?.name || "Conectando..."}</h2>
      <p>ID de sesión: {room?.sessionId}</p>
      <hr style={{ borderColor: '#0f0' }} />

      <h3>👥 Jugadores detectados ({players.length}):</h3>

      <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {players.map((p) => (
          <div key={p.sessionId} style={{ border: '1px solid #0f0', padding: '15px', borderRadius: '5px' }}>
            <p><strong>SessionID:</strong> <span style={{ color: '#fff' }}>{p.sessionId}</span></p>
            <p><strong>Propiedad .name:</strong> {p.name ?? <span style={{ color: '#ff4444' }}>UNDEFINED</span>}</p>
            <p><strong>Propiedad .username:</strong> {p.username ?? <span style={{ color: '#ff4444' }}>UNDEFINED</span>}</p>
            <p><strong>Posición:</strong> X: {p.x}, Y: {p.y}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          room.leave();
          setRoom(null);
          setPlayers([]);
        }}
        style={{ marginTop: '30px', padding: '10px 20px', background: '#440000', color: '#ffaaaa', border: '1px solid #ff4444', cursor: 'pointer' }}
      >
        Desconectar
      </button>
    </main>
  );
}