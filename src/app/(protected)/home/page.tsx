'use client';

import { useEffect, useRef, useState } from 'react';
import * as Colyseus from "colyseus.js";
import './global.css';

export default function Home() {
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [players, setPlayers] = useState<any[]>([]); // Para mostrar la lista en pantalla
  const [form, setForm] = useState({ user: '', pass: '' });
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const client = new Colyseus.Client("wss://randalmmorpg.duckdns.org");
      const joinedRoom = await client.joinOrCreate("my_room", {
        username: form.user,
        password: form.pass
      });

      // Escuchar cambios en el estado para actualizar React
      joinedRoom.onStateChange((state) => {
        const playersArray: any[] = [];
        state.players.forEach((player: any, sessionId: string) => {
          playersArray.push({ id: sessionId, ...player });
        });
        setPlayers(playersArray);
      });

      setRoom(joinedRoom);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al conectar");
    }
  };

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
    <main style={{ padding: '20px', backgroundColor: '#000', color: '#0f0', height: '100vh', fontFamily: 'monospace' }}>
      <h2>📡 Monitor de Sala: {room.name}</h2>
      <p>ID de sesión: {room.sessionId}</p>
      <hr />

      <h3>👥 Jugadores en el Estado:</h3>
      {players.length === 0 && <p>Esperando sincronización de jugadores...</p>}

      <div style={{ display: 'grid', gap: '10px' }}>
        {players.map((p) => (
          <div key={p.id} style={{ border: '1px solid #0f0', padding: '10px' }}>
            <p><strong>SessionID:</strong> {p.id}</p>
            {/* Aquí es donde veremos si existe 'name' o 'username' */}
            <p><strong>Propiedad .name:</strong> {p.name !== undefined ? String(p.name) : <span style={{ color: 'red' }}>undefined</span>}</p>
            <p><strong>Propiedad .username:</strong> {p.username !== undefined ? String(p.username) : <span style={{ color: 'red' }}>undefined</span>}</p>
            <p><strong>Posición:</strong> X: {p.x}, Y: {p.y}</p>
            <pre style={{ fontSize: '10px', color: '#888' }}>
              JSON crudo: {JSON.stringify(p)}
            </pre>
          </div>
        ))}
      </div>

      <button
        onClick={() => room.leave()}
        style={{ marginTop: '20px', padding: '10px', background: 'red', color: 'white', border: 'none', cursor: 'pointer' }}
      >
        Desconectar
      </button>
    </main>
  );
}