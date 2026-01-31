'use client';

import { useEffect, useRef, useState } from 'react';
import * as Colyseus from 'colyseus.js';
import './global.css';
import type { PlayerState } from './PlayerState';

interface IPlayerMonitor {
  sessionId: string;
  name: string;
  x: number;
  y: number;
  lastMessage: string;
}

export default function Home() {
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [players, setPlayers] = useState<Record<string, IPlayerMonitor>>({});
  const [form, setForm] = useState({ user: '', pass: '' });
  const [error, setError] = useState('');

  const roomRef = useRef<Colyseus.Room | null>(null);

  const handleLogin = async () => {
    try {
      setError('');

      const client = new Colyseus.Client(
        'wss://randalmmorpg.duckdns.org'
      );

      const joinedRoom = await client.joinOrCreate('my_room', {
        username: form.user,
        password: form.pass,
      });

      roomRef.current = joinedRoom;
      setRoom(joinedRoom);

      joinedRoom.onStateChange.once((state) => {
        const playersMap = state.players;

        // ADD
        playersMap.onAdd((player: PlayerState, sessionId: string) => {
          setPlayers((prev) => ({
            ...prev,
            [sessionId]: {
              sessionId,
              name: player.name,
              x: player.x,
              y: player.y,
              lastMessage: player.lastMessage,
            },
          }));
        });

        // CHANGE (FORMA CORRECTA)
        playersMap.onChange((player: PlayerState, sessionId: string) => {
          setPlayers((prev) => ({
            ...prev,
            [sessionId]: {
              sessionId,
              name: player.name,
              x: player.x,
              y: player.y,
              lastMessage: player.lastMessage,
            },
          }));
        });

        // REMOVE
        playersMap.onRemove((_: PlayerState, sessionId: string) => {
          setPlayers((prev) => {
            const copy = { ...prev };
            delete copy[sessionId];
            return copy;
          });
        });
      });
    } catch (e: unknown) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : 'Error al conectar'
      );
    }
  };

  useEffect(() => {
    return () => {
      roomRef.current?.leave();
    };
  }, []);

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
          onChange={(e) =>
            setForm((f) => ({ ...f, user: e.target.value }))
          }
        />
        <input
          type="password"
          placeholder="Password"
          onChange={(e) =>
            setForm((f) => ({ ...f, pass: e.target.value }))
          }
        />

        <button onClick={handleLogin}>Entrar</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    );
  }

  const playerList = Object.values(players);

  return (
    <main
      style={{
        padding: 20,
        background: '#000',
        color: '#0f0',
        minHeight: '100vh',
        fontFamily: 'monospace',
      }}
    >
      <h2>📡 Sala: {room.name}</h2>
      <p>Session ID: {room.sessionId}</p>

      <h3>👥 Jugadores ({playerList.length})</h3>

      {playerList.map((p) => (
        <div key={p.sessionId}>
          <p>
            ({p.name}) → {p.x},{p.y}
          </p>
        </div>
      ))}
    </main>
  );
}
