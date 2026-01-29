import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
    // 1. Definimos los tipos específicos
    // Para imágenes con física usamos Arcade.Sprite o Arcade.Image
    private player!: Phaser.Physics.Arcade.Sprite;

    constructor() {
        super('MainScene');
    }

    preload(): void {
        this.load.image('ball', 'https://labs.phaser.io/assets/sprites/shinyball.png');
    }

    create(): void {
        // 2. Inicializamos el objeto con física
        // Usamos "this.physics.add.sprite" para obtener un objeto con cuerpo físico
        this.player = this.physics.add.sprite(400, 300, 'ball');

        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);

    }

    update(): void {

    }
}