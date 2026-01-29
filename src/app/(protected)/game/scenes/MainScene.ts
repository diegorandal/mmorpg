// src/game/scenes/MainScene.ts
import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
    private player: any;

    constructor() {
        super('MainScene'); // Nombre de la escena
    }

    preload() {
        // Carga de imágenes/sprites
        this.load.image('logo', 'https://labs.phaser.io/assets/sprites/phaser3-logo.png');
    }

    create() {
        // Se ejecuta una vez al inicio
        this.player = this.physics.add.image(400, 300, 'logo');
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(1, 1);
        this.player.setVelocity(200, 200);

        this.add.text(10, 10, 'World App Game - Verificado', { color: '#00ff00' });
    }

    update(time: number, delta: number) {
        // Bucle del juego (60 FPS)
        // Aquí va la lógica de movimiento, inputs, etc.
    }
}