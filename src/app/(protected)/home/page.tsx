'use client';

import { useEffect, useState } from 'react';
import * as Colyseus from "colyseus.js";
import './global.css';

// 1. Definimos el contrato de datos del Jugador según tu Schema
interface IPlayerState {
  username?: string;
  name?: string;
  x: number;
  y: number;
  lastMessage: string;
}

// 2. Definimos cómo luce el ID de sesión junto con los datos del jugador
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
      const client = new Colyseus.Client("wss://randalmmorpg.duckdns.org");

      // Especificamos que la Room manejará un estado genérico
      const joinedRoom = await client.joinOrCreate("my_room", {
        username: form.user,
        password: form.pass
      });

      // Escuchamos cambios en el estado
      joinedRoom.onStateChange((state) => {
        const playersArray: IPlayerMonitor[] = [];

        // Colyseus usa MapSchema, que se puede recorrer con forEach
        state.players.forEach((player: IPlayerState, sessionId: string) => {
          playersArray.push({
            sessionId,
            username: player.username,
            name: player.name,
            x: player.x,
            y: player.y,
            lastMessage: player.lastMessage
          });
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
    <main style={{ padding: '20px', backgroundColor: '#000', color: '#0f0', minHeight: '100vh', fontFamily: 'monospace' }}>
      <h2>📡 Monitor de Sala: {room.name}</h2>
      <p>ID de sesión: {room.sessionId}</p>
      <hr style={{ borderColor: '#0f0' }} />

      <h3>👥 Jugadores detectados ({players.length}):</h3>

      <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {players.map((p) => (
          <div key={p.sessionId} style={{ border: '1px solid #0f0', padding: '15px', borderRadius: '5px' }}>
            <p><strong>SessionID:</strong> <span style={{ color: '#fff' }}>{p.sessionId}</span></p>

            {/* Visualización clara de qué propiedad está llegando */}
            <p><strong>Propiedad .name:</strong> {p.name !== undefined ?
              <span style={{ color: '#fff' }}>{p.name}</span> :
              <span style={{ color: '#ff4444' }}>UNDEFINED</span>}
            </p>

            <p><strong>Propiedad .username:</strong> {p.username !== undefined ?
              <span style={{ color: '#fff' }}>{p.username}</span> :
              <span style={{ color: '#ff4444' }}>UNDEFINED</span>}
            </p>

            <p><strong>Posición:</strong> X: {p.x}, Y: {p.y}</p>
            <p><strong>Último Mensaje:</strong> {p.lastMessage || "(vacio)"}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => room.leave()}
        style={{ marginTop: '30px', padding: '10px 20px', background: '#440000', color: '#ffaaaa', border: '1px solid #ff4444', cursor: 'pointer' }}
      >
        Desconectar y volver
      </button>
    </main>
  );
}