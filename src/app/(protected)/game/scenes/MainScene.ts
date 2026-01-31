import Phaser from 'phaser';
import { Room } from 'colyseus.js';

// Definimos los tipos exactos de las propiedades del jugador
interface IPlayer {
    name: string;
    x: number;
    y: number;
    lastMessage: string;
    // Tipamos 'listen' para que el valor (V) sea del tipo de la propiedad (K)
    listen<K extends keyof IPlayer>(
        prop: K,
        callback: (value: IPlayer[K], previousValue?: IPlayer[K]) => void
    ): () => void;

    onChange: (callback: () => void) => void;
}

export class MainScene extends Phaser.Scene {
    private room!: Room;
    private playerEntities: {
        [sessionId: string]: {
            sprite: Phaser.Physics.Arcade.Sprite,
            label: Phaser.GameObjects.Text
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

        if (!roomInstance) {
            console.error("No room instance found in registry");
            return;
        }

        this.room = roomInstance;
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Escuchamos la adición de jugadores
        this.room.state.players.onAdd((player: IPlayer, sessionId: string) => {
            const sprite = this.physics.add.sprite(player.x, player.y, 'ball');

            const label = this.add.text(player.x, player.y - 30, player.name || "...", {
                fontSize: '14px',
                color: '#ffffff'
            }).setOrigin(0.5);

            this.playerEntities[sessionId] = { sprite, label };

            // Escuchas tipadas: el compilador sabrá que 'newX' es number y 'newName' es string
            player.listen("x", (newX: number) => {
                sprite.x = newX;
                label.x = newX;
            });

            player.listen("y", (newY: number) => {
                sprite.y = newY;
                label.y = newY - 30;
            });

            player.listen("name", (newName: string) => {
                label.setText(newName);
            });
        });

        this.room.state.players.onRemove((_: IPlayer, sessionId: string) => {
            const entity = this.playerEntities[sessionId];
            if (entity) {
                entity.sprite.destroy();
                entity.label.destroy();
                delete this.playerEntities[sessionId];
            }
        });
    }

    update(): void {
        if (!this.room) return;

        const myEntity = this.playerEntities[this.room.sessionId];
        if (!myEntity) return;

        const speed = 4;
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown) vx -= speed;
        else if (this.cursors.right.isDown) vx += speed;

        if (this.cursors.up.isDown) vy -= speed;
        else if (this.cursors.down.isDown) vy += speed;

        if (vx !== 0 || vy !== 0) {
            this.room.send("move", {
                x: myEntity.sprite.x + vx,
                y: myEntity.sprite.y + vy
            });
        }
    }
}