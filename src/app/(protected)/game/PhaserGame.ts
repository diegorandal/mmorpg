// src/game/PhaserGame.ts
import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';

export const getGameConfig = (containerId: string): Phaser.Types.Core.GameConfig => ({
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%'
    },
    input: {
        activePointers: 3 // Permite hasta 3 dedos a la vez
    },
    pixelArt: true, 
    antialias: false,
    parent: containerId,
    type: Phaser.AUTO,
    width: '100%',
    height: '100%',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 }, // RPG top-down no usa gravedad
            debug: false
        },
    },
    scene: [MainScene], // Aquí añades todas tus escenas

});