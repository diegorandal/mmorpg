import Phaser from 'phaser';
import { Room } from 'colyseus.js';

export class MainScene extends Phaser.Scene {
    private room!: Room;
    private playerEntities: { [sessionId: string]: { sprite: Phaser.Physics.Arcade.Sprite, label: Phaser.GameObjects.Text } } = {};
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor() {
        super('MainScene');
    }

    preload(): void {
        this.load.image('ball', 'https://labs.phaser.io/assets/sprites/shinyball.png');
    }

    create(): void {
        // Recuperamos la sala que guardamos en el registry de React
        this.room = this.registry.get('room');
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Escuchamos cuando alguien entra (incluyéndonos)
        this.room.state.players.onAdd((player: any, sessionId: string) => {
            // Crear Sprite
            const sprite = this.physics.add.sprite(player.x, player.y, 'ball');

            // Crear Texto del nombre
            const label = this.add.text(player.x, player.y + 30, player.name, {
                fontSize: '14px',
                color: '#ffffff',
                backgroundColor: '#000000aa'
            }).setOrigin(0.5);

            this.playerEntities[sessionId] = { sprite, label };

            // Escuchar cambios de posición de este jugador específico
            player.onChange(() => {
                sprite.x = player.x;
                sprite.y = player.y;
                label.x = player.x;
                label.y = player.y + 30;
            });
        });

        // Escuchamos cuando alguien sale
        this.room.state.players.onRemove((player: any, sessionId: string) => {
            if (this.playerEntities[sessionId]) {
                this.playerEntities[sessionId].sprite.destroy();
                this.playerEntities[sessionId].label.destroy();
                delete this.playerEntities[sessionId];
            }
        });
    }

    update(): void {
        if (!this.room) return;

        // Movimiento básico: enviamos al servidor nuestra intención de movernos
        // En un RPG real, aquí calcularías la velocidad
        let moveData = { x: 0, y: 0, moving: false };
        const myPlayer = this.playerEntities[this.room.sessionId]?.sprite;

        if (myPlayer) {
            const speed = 4;
            let vx = 0;
            let vy = 0;

            if (this.cursors.left.isDown) vx -= speed;
            if (this.cursors.right.isDown) vx += speed;
            if (this.cursors.up.isDown) vy -= speed;
            if (this.cursors.down.isDown) vy += speed;

            if (vx !== 0 || vy !== 0) {
                // Enviamos la nueva posición al servidor
                this.room.send("move", { x: myPlayer.x + vx, y: myPlayer.y + vy });
            }
        }
    }
}