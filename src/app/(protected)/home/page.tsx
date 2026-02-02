'use client';

import { useEffect } from 'react';
import * as Colyseus from 'colyseus.js';

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
