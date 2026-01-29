'use client'; // Importante: Phaser solo corre en el cliente

import { useEffect, useRef } from 'react';

export default function Home() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Importamos Phaser dinámicamente para evitar errores de SSR
    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default;

      // Configuración básica del "Hola Mundo"
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: '100%',
        height: '100%',
        parent: gameContainerRef.current || undefined,
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 300 } },
        },
        scene: {
          preload: function (this: Phaser.Scene) {
            this.load.setBaseURL('https://labs.phaser.io');
            this.load.image('sky', 'assets/skies/space3.png');
            this.load.image('logo', 'assets/sprites/phaser3-logo.png');
            this.load.image('red', 'assets/particles/red.png');
          },
          create: function (this: Phaser.Scene) {
            this.add.image(400, 300, 'sky');

            const particles = this.add.particles(0, 0, 'red', {
              speed: 100,
              scale: { start: 1, end: 0 },
              blendMode: 'ADD'
            });

            const logo = this.physics.add.image(400, 100, 'logo');
            logo.setVelocity(100, 200);
            logo.setBounce(1, 1);
            logo.setCollideWorldBounds(true);

            particles.startFollow(logo);
          }
        }
      };

      if (!gameInstance.current) {
        gameInstance.current = new Phaser.Game(config);
      }
    };

    initPhaser();

    // Limpieza al desmontar el componente
    return () => {
      gameInstance.current?.destroy(true);
      gameInstance.current = null;
    };
  }, []);

  return (
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0 }}>
      <div ref={gameContainerRef} style={{ width: '100%', height: '100%' }} />
    </main>
  );
}