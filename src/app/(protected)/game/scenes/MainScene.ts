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
        const roomInstance = this.registry.get('room') as Room<MyRoomState>;
        if (!roomInstance) return;
        this.room = roomInstance;
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Esperamos al estado inicial
        this.room.onStateChange.once((state) => {

            // Usamos 'as any' para evitar el error de TS, 
            // pero la lógica sigue siendo la de los decoradores.
            const players = state.players as any;

            players.onAdd((player: Player, sessionId: string) => {
                this.addPlayer(player, sessionId);
            });

            players.onRemove((player: Player, sessionId: string) => {
                this.removePlayer(sessionId);
            });
        });
    }

    private addPlayer(player: Player, sessionId: string) {
        const sprite = this.physics.add.sprite(player.x, player.y, 'ball');
        const label = this.add.text(player.x, player.y - 30, player.name || "...", {
            fontSize: '14px', color: '#ffffff'
        }).setOrigin(0.5);

        this.playerEntities[sessionId] = {
            sprite, label, serverX: player.x, serverY: player.y
        };

        // Escuchar cambios individuales en el jugador (HP, X, Y, etc.)
        (player as any).onChange(() => {
            const entity = this.playerEntities[sessionId];
            if (entity) {
                if (player.name) entity.label.setText(player.name);

                // Si no soy yo, guardo la posición para interpolar
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

        if (this.cursors.left.isDown) { myEntity.sprite.x -= speed; moved = true; }
        else if (this.cursors.right.isDown) { myEntity.sprite.x += speed; moved = true; }
        if (this.cursors.up.isDown) { myEntity.sprite.y -= speed; moved = true; }
        else if (this.cursors.down.isDown) { myEntity.sprite.y += speed; moved = true; }

        if (moved) {
            myEntity.label.setPosition(myEntity.sprite.x, myEntity.sprite.y - 30);
            this.room.send("move", {
                x: Math.floor(myEntity.sprite.x),
                y: Math.floor(myEntity.sprite.y)
            });
        }

        // Interpolación lineal para otros jugadores
        for (let id in this.playerEntities) {
            if (id === this.room.sessionId) continue;
            const entity = this.playerEntities[id];
            entity.sprite.x = Phaser.Math.Linear(entity.sprite.x, entity.serverX, 0.2);
            entity.sprite.y = Phaser.Math.Linear(entity.sprite.y, entity.serverY, 0.2);
            entity.label.setPosition(entity.sprite.x, entity.sprite.y - 30);
        }
    }
}