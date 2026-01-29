'use client'; // Importante: Phaser solo corre en el cliente

import { useEffect, useRef } from 'react';
import './global.css';


export default function Home() {
  const gameContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: Phaser.Game | null = null;

    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default;
      const { getGameConfig } = await import('../game/PhaserGame');

      if (gameContainerRef.current) {
        game = new Phaser.Game(getGameConfig(gameContainerRef.current.id));
      }
    };

    initPhaser();

    return () => {
      game?.destroy(true);
    };
  }, []);

  return (
    <main style={{ width: '100vw', height: '100vh', backgroundColor: '#000' }}>
      <div id="game-container" ref={gameContainerRef} />
    </main>
  );
}