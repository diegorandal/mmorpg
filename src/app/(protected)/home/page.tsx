'use client';

import { useEffect, useRef, useState } from 'react';
import * as Colyseus from 'colyseus.js';

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
  const roomRef = useRef<Colyseus.Room | null>(null);

  const handleLogin = async () => {
    const client = new Colyseus.Client('wss://randalmmorpg.duckdns.org');
    const joinedRoom = await client.joinOrCreate('my_room');

    roomRef.current = joinedRoom;
    setRoom(joinedRoom);

    joinedRoom.onStateChange.once((state: any) => {
      const playersMap = state.players;

      playersMap.onAdd((player: any, sessionId: string) => {
        setPlayers((prev) => ({
          ...prev,
          [sessionId]: {
            sessionId,
            name: player.name ?? '',
            x: player.x ?? 0,
            y: player.y ?? 0,
            lastMessage: player.lastMessage ?? '',
          },
        }));
      });

      playersMap.onChange((player: any, sessionId: string) => {
        setPlayers((prev) => ({
          ...prev,
          [sessionId]: {
            sessionId,
            username: player.username ?? '',
            name: player.name ?? '',
            x: player.x ?? 0,
            y: player.y ?? 0,
            lastMessage: player.lastMessage ?? '',
          },
        }));
      });

      playersMap.onRemove((_: any, sessionId: string) => {
        setPlayers((prev) => {
          const copy = { ...prev };
          delete copy[sessionId];
          return copy;
        });
      });
    });
  };

  useEffect(() => {
    return () => {
      roomRef.current?.leave();
    };
  }, []);

  if (!room) {
    return <button onClick={handleLogin}>Entrar</button>;
  }

  return (
    <div>
      <h2>Jugadores</h2>
      {Object.values(players).map((p) => (
        <div key={p.sessionId}>
          {p.name} ({p.x},{p.y})
        </div>
      ))}
    </div>
  );
}
