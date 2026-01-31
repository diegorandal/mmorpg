'use client';

import { useEffect, useRef, useState } from 'react';
import * as Colyseus from 'colyseus.js';
import './global.css';

/* ============================
   Tipos planos (DTO)
============================ */

interface PlayerDTO {
  name: string;
  x: number;
  y: number;
  lastMessage: string;
}

interface PlayerMonitor extends PlayerDTO {
  sessionId: string;
}

/* ============================
   Type Guard (CLAVE)
============================ */

function isPlayerDTO(value: unknown): value is PlayerDTO {
  if (typeof value !== 'object' || value === null) return false;

  const v = value as Record<string, unknown>;

  return (
    typeof v.name === 'string' &&
    typeof v.x === 'number' &&
    typeof v.y === 'number' &&
    typeof v.lastMessage === 'string'
  );
}

/* ============================
   Página
============================ */

export default function Home() {
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [players, setPlayers] = useState<Record<string, PlayerMonitor>>({});
  const [form, setForm] = useState({ user: '', pass: '' });
  const [error, setError] = useState('');

  const roomRef = useRef<Colyseus.Room | null>(null);

  /* ============================
     Login
  ============================ */

  const handleLogin = async () => {
    try {
      setError('');

      const client = new Colyseus.Client('wss://randalmmorpg.duckdns.org');

      const joinedRoom = await client.joinOrCreate('my_room', {
        username: form.user,
        password: form.pass,
      });

      roomRef.current = joinedRoom;
      setRoom(joinedRoom);

      joinedRoom.onStateChange.once((state: unknown) => {
        const s = state as Record<string, unknown>;
        const playersMap = s.players as {
          onAdd: (cb: (player: unknown, sessionId: string) => void) => void;
          onChange: (cb: (player: unknown, sessionId: string) => void) => void;
          onRemove: (cb: (_: unknown, sessionId: string) => void) => void;
        };

        /* ===== Player ADD ===== */

        playersMap.onAdd((player: unknown, sessionId: string) => {
          if (!isPlayerDTO(player)) return;

          setPlayers(prev => ({
            ...prev,
            [sessionId]: {
              sessionId,
              ...player,
            },
          }));
        });

        /* ===== Player CHANGE ===== */

        playersMap.onChange((player: unknown, sessionId: string) => {
          if (!isPlayerDTO(player)) return;

          setPlayers(prev => ({
            ...prev,
            [sessionId]: {
              sessionId,
              ...player,
            },
          }));
        });

        /* ===== Player REMOVE ===== */

        playersMap.onRemove((_: unknown, sessionId: string) => {
          setPlayers(prev => {
            const copy = { ...prev };
            delete copy[sessionId];
            return copy;
          });
        });
      });
    } catch (e: unknown) {
      console.error('Login error:', e);
      setError(e instanceof Error ? e.message : 'Error al conectar');
    }
  };

  /* ============================
     Cleanup
  ============================ */

  useEffect(() => {
    return () => {
      roomRef.current?.leave();
      roomRef.current = null;
    };
  }, []);

  /* ============================
     LOGIN UI
  ============================ */

  if (!room) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#222',
          color: 'white',
        }}
      >
        <h2>RPG Login</h2>

        <input
          placeholder="Usuario"
          onChange={e =>
            setForm(f => ({ ...f, user: e.target.value }))
          }
          style={{ margin: 5, padding: 8 }}
        />

        <input
          type="password"
          placeholder="Password"
          onChange={e =>
            setForm(f => ({ ...f, pass: e.target.value }))
          }
          style={{ margin: 5, padding: 8 }}
        />

        <button
          onClick={handleLogin}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Entrar
        </button>

        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    );
  }

  /* ============================
     MONITOR UI
  ============================ */

  const playerList = Object.values(players);

  return (
    <main
      style={{
        padding: '20px',
        backgroundColor: '#000',
        color: '#0f0',
        minHeight: '100vh',
        fontFamily: 'monospace',
      }}
    >
      <h2>📡 Sala: {room.name}</h2>
      <p>Session ID: {room.sessionId}</p>

      <hr style={{ borderColor: '#0f0' }} />

      <h3>👥 Jugadores ({playerList.length})</h3>

      <div
        style={{
          display: 'grid',
          gap: '15px',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        }}
      >
        {playerList.map(p => (
          <div
            key={p.sessionId}
            style={{
              border: '1px solid #0f0',
              padding: '12px',
              borderRadius: '6px',
            }}
          >
            <p>
              <strong>Session:</strong>{' '}
              <span style={{ color: '#fff' }}>{p.sessionId}</span>
            </p>
            <p>
              <strong>Name:</strong> {p.name}
            </p>
            <p>
              <strong>Pos:</strong> {p.x}, {p.y}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          room.leave();
          setRoom(null);
          setPlayers({});
        }}
        style={{
          marginTop: '30px',
          padding: '10px 20px',
          background: '#440000',
          color: '#ffaaaa',
          border: '1px solid #ff4444',
          cursor: 'pointer',
        }}
      >
        Desconectar
      </button>
    </main>
  );
}
