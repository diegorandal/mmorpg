'use client';

import { useEffect, useRef, useState } from "react";
import * as Colyseus from "colyseus.js";

interface Player {
  name: string;
  x: number;
  y: number;
  hp: number;
  level: number;
  lastMessage: string;
}

interface PlayerView extends Player {
  sessionId: string;
}

export default function Home() {
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [players, setPlayers] = useState<Record<string, PlayerView>>({});
  const roomRef = useRef<Colyseus.Room | null>(null);

  const handleLogin = async () => {
    const client = new Colyseus.Client("wss://randalmmorpg.duckdns.org");
    const joined = await client.joinOrCreate("my_room", {
      username: "test",
      password: "test",
    });

    roomRef.current = joined;
    setRoom(joined);

    // ✅ ACCESO DIRECTO AL STATE
    const state = joined.state as any;

    // 🔥 ESTO SÍ FUNCIONA
    state.players.onAdd((player: any, sessionId: string) => {
      console.log("ON ADD PLAYER:", player);

      setPlayers(prev => ({
        ...prev,
        [sessionId]: {
          sessionId,
          name: player.name,
          x: player.x,
          y: player.y,
          hp: player.hp,
          level: player.level,
          lastMessage: player.lastMessage,
        },
      }));
    });

    state.players.onChange((player: any, sessionId: string) => {
      setPlayers(prev => ({
        ...prev,
        [sessionId]: {
          sessionId,
          name: player.name,
          x: player.x,
          y: player.y,
          hp: player.hp,
          level: player.level,
          lastMessage: player.lastMessage,
        },
      }));
    });

    state.players.onRemove((_: any, sessionId: string) => {
      setPlayers(prev => {
        const copy = { ...prev };
        delete copy[sessionId];
        return copy;
      });
    });
  };

  useEffect(() => {
    let active = true;

    const connect = async () => {
      if (!active) return;
      await handleLogin();
    };

    connect();

    return () => {
      active = false;
      roomRef.current?.leave();
      roomRef.current = null;
    };
  }, []);


  if (!room) return <div>Conectando...</div>;

  return (
    <div style={{ color: "lime", background: "black", minHeight: "100vh" }}>
      <h2>Sala: {room.name}</h2>

      {Object.values(players).map(p => (
        <div key={p.sessionId}>
          <strong>{p.name}</strong> ({p.x}, {p.y})
        </div>
      ))}
    </div>
  );
}
