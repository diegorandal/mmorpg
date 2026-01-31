'use client';

import { useEffect, useRef, useState } from 'react';
import * as Colyseus from 'colyseus.js';
import { Schema } from '@colyseus/schema';

/* =========================
   Tipos locales (React)
========================= */

interface PlayerView {
  sessionId: string;
  name: string;
  x: number;
  y: number;
}

/* =========================
   Página
========================= */

export default function Page() {
  const roomRef = useRef<Colyseus.Room | null>(null);

  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [players, setPlayers] = useState<Record<string, PlayerView>>({});
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>(
    'idle'
  );
  const [error, setError] = useState<string>('');

  /* =========================
     Conexión
  ========================= */

  const connect = async () => {
    try {
      setError('');
      setStatus('connecting');

      const client = new Colyseus.Client(
        'wss://randalmmorpg.duckdns.org'
      );

      const joinedRoom = await client.joinOrCreate('my_room', {
        username: 'test',
        password: 'test',
      });

      roomRef.current = joinedRoom;
      setRoom(joinedRoom);
      setStatus('connected');

      /* =========================
         STATE LISTENERS
      ========================= */

      joinedRoom.onStateChange.once((state) => {
        // MAPA DE PLAYERS
        state.players.onAdd((player: Schema, sessionId: string) => {
          console.log('onAdd', sessionId);

          const build = (): PlayerView => ({
            sessionId,
            name:
              // @ts-ignore — schema runtime
              (player as any).name ?? 'Cargando…',
            x:
              // @ts-ignore
              (player as any).x ?? 0,
            y:
              // @ts-ignore
              (player as any).y ?? 0,
          });

          // Estado inicial
          setPlayers((prev) => ({
            ...prev,
            [sessionId]: build(),
          }));

          // Cambios posteriores
          // @ts-ignore
          player.onChange(() => {
            setPlayers((prev) => ({
              ...prev,
              [sessionId]: build(),
            }));
          });
        });

        state.players.onRemove((_, sessionId: string) => {
          console.log('onRemove', sessionId);
          setPlayers((prev) => {
            const copy = { ...prev };
            delete copy[sessionId];
            return copy;
          });
        });
      });
    } catch (e) {
      console.error(e);
      setError('Error al conectar');
      setStatus('idle');
    }
  };

  /* =========================
     Cleanup
  ========================= */

  useEffect(() => {
    return () => {
      roomRef.current?.leave();
      roomRef.current = null;
    };
  }, []);

  /* =========================
     UI
  ========================= */

  if (status === 'idle') {
    return (
      <main style={styles.center}>
        <button onClick={connect} style={styles.button}>
          Conectar
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </main>
    );
  }

  if (status === 'connecting') {
    return (
      <main style={styles.center}>
        <p>Conectando…</p>
      </main>
    );
  }

  const list = Object.values(players);

  return (
    <main style={styles.main}>
      <h2>🟢 Conectado</h2>
      <p>Room: {room?.name}</p>
      <p>Session: {room?.sessionId}</p>

      <hr />

      <h3>👥 Jugadores ({list.length})</h3>

      {list.map((p) => (
        <div key={p.sessionId} style={styles.card}>
          <p>
            <strong>Session:</strong> {p.sessionId}
          </p>
          <p>
            <strong>Nombre:</strong> {p.name || 'Cargando…'}
          </p>
          <p>
            <strong>Pos:</strong> {p.x}, {p.y}
          </p>
        </div>
      ))}

      <button
        style={{ ...styles.button, marginTop: 20 }}
        onClick={() => {
          roomRef.current?.leave();
          setRoom(null);
          setPlayers({});
          setStatus('idle');
        }}
      >
        Desconectar
      </button>
    </main>
  );
}

/* =========================
   Estilos
========================= */

const styles: Record<string, React.CSSProperties> = {
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#111',
    color: '#0f0',
  },
  main: {
    minHeight: '100vh',
    padding: 20,
    background: '#000',
    color: '#0f0',
    fontFamily: 'monospace',
  },
  button: {
    padding: '10px 20px',
    cursor: 'pointer',
  },
  card: {
    border: '1px solid #0f0',
    padding: 10,
    marginBottom: 10,
  },
};
