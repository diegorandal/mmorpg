import Phaser from 'phaser';
import { Room } from '@colyseus/sdk';
import { MyRoomState, Player } from '@/app/(protected)/home/PlayerState';

export class MainScene extends Phaser.Scene {
    private room!: Room<MyRoomState>;
    private playerEntities: {
        [sessionId: string]: {
            sprite: Phaser.Physics.Arcade.Sprite,
            label: Phaser.GameObjects.Text,
            serverX: number,
            serverY: number
        }
    } = {};
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor() {
        super('MainScene');
    }

    preload(): void {
        this.load.image('ball', 'https://labs.phaser.io/assets/sprites/shinyball.png');
    }

    create(): void {
        const roomInstance = this.registry.get('room') as Room;
        this.room = roomInstance;

        // 1. Escuchar nuevos jugadores
        this.room.onMessage("player_joined", (data) => {
            this.addPlayer(data, data.id);
        });

        // 2. Escuchar movimientos
        this.room.onMessage("player_moved", (data) => {
            const entity = this.playerEntities[data.id];
            if (entity) {
                // Actualizamos posición objetivo para la interpolación
                entity.serverX = data.x;
                entity.serverY = data.y;
            }
        });

        // 2. Escuchar movimientos
        this.room.onMessage("player_chat", (data) => {
            console.log(`${data.playerName} says: ${data.message}`);
        });

        // 3. Escuchar desconexiones
        this.room.onMessage("player_left", (data) => {
            this.removePlayer(data.id);
        });
    }

    private addPlayer(player: Player, sessionId: string) {
        // Crear visuales
        const sprite = this.physics.add.sprite(player.x, player.y, 'ball');
        const label = this.add.text(player.x, player.y - 30, player.name || "...", {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.playerEntities[sessionId] = {
            sprite, label, serverX: player.x, serverY: player.y
        };

        // 2. Escuchar cambios en el jugador usando decoradores (onChange)
        (player as any).onChange(() => {
            const entity = this.playerEntities[sessionId];
            if (entity) {
                if (player.name) entity.label.setText(player.name);

                // Solo interpolamos si es un jugador remoto
                if (sessionId !== this.room.sessionId) {
                    entity.serverX = player.x;
                    entity.serverY = player.y;
                }
            }
        });
    }

    private removePlayer(sessionId: string) {
        const entity = this.playerEntities[sessionId];
        if (entity) {
            entity.sprite.destroy();
            entity.label.destroy();
            delete this.playerEntities[sessionId];
        }
    }

    update(): void {
        if (!this.room || !this.playerEntities[this.room.sessionId]) return;

        const myEntity = this.playerEntities[this.room.sessionId];
        const speed = 5;
        let moved = false;

        // Movimiento local (Predicción del cliente)
        if (this.cursors.left.isDown) { myEntity.sprite.x -= speed; moved = true; }
        else if (this.cursors.right.isDown) { myEntity.sprite.x += speed; moved = true; }
        if (this.cursors.up.isDown) { myEntity.sprite.y -= speed; moved = true; }
        else if (this.cursors.down.isDown) { myEntity.sprite.y += speed; moved = true; }

        if (moved) {
            myEntity.label.setPosition(myEntity.sprite.x, myEntity.sprite.y - 30);

            // Enviar posición al servidor (Redondeado para evitar floats infinitos)
            this.room.send("move", {
                x: Math.floor(myEntity.sprite.x),
                y: Math.floor(myEntity.sprite.y)
            });
        }

        // 3. Interpolación para suavizar el movimiento de los demás
        for (let id in this.playerEntities) {
            if (id === this.room.sessionId) continue;
            const entity = this.playerEntities[id];

            // Suavizamos el movimiento hacia la posición que dice el servidor
            entity.sprite.x = Phaser.Math.Linear(entity.sprite.x, entity.serverX, 0.15);
            entity.sprite.y = Phaser.Math.Linear(entity.sprite.y, entity.serverY, 0.15);
            entity.label.setPosition(entity.sprite.x, entity.sprite.y - 30);
        }
    }
}