'use client';

import { useEffect, useRef, useState } from 'react';
import * as Colyseus from '@colyseus/sdk';
import './global.css';

/* ============================
   Tipos
============================ */

interface IPlayerState {
  name: string;
  x: number;
  y: number;
  lastMessage: string;
}

interface IPlayerMonitor extends IPlayerState {
  sessionId: string;
}

/* ============================
   Página
============================ */

export default function Home() {
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [players, setPlayers] = useState<Record<string, IPlayerMonitor>>({});
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

      /* ============================
         LISTENERS CORRECTOS
      ============================ */

      joinedRoom.onStateChange.once((state) => {
        const playersMap = state.players;

        // Cuando entra un jugador
        playersMap.onAdd((player, sessionId) => {
          const build = (): IPlayerMonitor => ({
            sessionId,
            name: player.name ?? '',
            x: player.x ?? 0,
            y: player.y ?? 0,
            lastMessage: player.lastMessage ?? '',
          });

          setPlayers((prev) => ({
            ...prev,
            [sessionId]: build(),
          }));

          // Cambios en ese jugador
          player.onChange(() => {
            setPlayers((prev) => ({
              ...prev,
              [sessionId]: build(),
            }));
          });
        });

        // Cuando sale un jugador
        playersMap.onRemove((_, sessionId) => {
          setPlayers((prev) => {
            const copy = { ...prev };
            delete copy[sessionId];
            return copy;
          });
        });
      });
    } catch (e: unknown) {
      console.error('Error en login:', e);
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
     Login UI
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
          type="text"
          placeholder="Usuario"
          onChange={(e) =>
            setForm((f) => ({ ...f, user: e.target.value }))
          }
          style={{ margin: 5, padding: 8 }}
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) =>
            setForm((f) => ({ ...f, pass: e.target.value }))
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
     Monitor UI
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
        {playerList.map((p) => (
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
              <strong>Name:</strong>{' '}
              {p.name || <span style={{ color: '#f44' }}>EMPTY</span>}
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




/*
'use client';

import { useEffect } from 'react';
import * as Colyseus from '@colyseus/sdk';

export default function Page() {
  useEffect(() => {
    let room: Colyseus.Room | null = null;

    const run = async () => {
      try {
        console.log('🚀 Creando cliente…');

        const client = new Colyseus.Client(
          'wss://randalmmorpg.duckdns.org'
        );

        console.log('🔐 Join room…');

        room = await client.joinOrCreate('my_room', {username: 'debug', password: 'debug'});

        console.log('✅ Conectado');
        console.log('ROOM:', room);
        console.log('SESSION:', room.sessionId);

        // Log de CUALQUIER cambio de estado
        room.onStateChange((state) => {
          console.log('🧠 STATE CHANGE');
          console.log(state);
        });

        // Log crudo del mapa players
        room.onStateChange.once((state) => {
          console.log('🗺 players map:', state.players);

          state.players.onAdd((value, key) => {
            console.log('➕ PLAYER ADD');
            console.log('key:', key);
            console.log('value:', value);
            console.log('value keys:', Object.keys(value as any));
          });

          state.players.onChange((value, key) => {
            console.log('✏️ PLAYER CHANGE');
            console.log('key:', key);
            console.log('value:', value);
          });

          state.players.onRemove((value, key) => {
            console.log('❌ PLAYER REMOVE');
            console.log('key:', key);
            console.log('value:', value);
          });
        });
      } catch (err) {
        console.error('💥 ERROR', err);
      }
    };

    run();

    return () => {
      if (room) {
        console.log('👋 Leaving room');
        room.leave();
      }
    };
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#0f0',
        padding: 20,
        fontFamily: 'monospace',
      }}
    >
      <h2>Colyseus Debug</h2>
      <p>Mirá la consola del navegador 👀</p>
    </main>
  );
}
*/