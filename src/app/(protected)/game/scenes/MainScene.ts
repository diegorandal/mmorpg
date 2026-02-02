import Phaser from 'phaser';
import { Room } from '@colyseus/sdk';

// Definimos la interfaz del jugador según tu Schema de Colyseus
interface IPlayer {
    name: string;
    x: number;
    y: number;
    hp: number;
    level: number;
    lastMessage: string;
    // Tipado para los listeners de Colyseus SDK 2026
    listen<K extends keyof IPlayer>(
        prop: K,
        callback: (value: IPlayer[K], previousValue?: IPlayer[K]) => void
    ): () => void;
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
        // Usamos un asset externo para pruebas
        this.load.image('ball', 'https://labs.phaser.io/assets/sprites/shinyball.png');
    }

    create(): void {
        const roomInstance = this.registry.get('room') as Room;

        if (!roomInstance) {
            console.error("No se encontró la instancia de la sala en el registry");
            return;
        }

        this.room = roomInstance;
        this.cursors = this.input.keyboard!.createCursorKeys();

        console.log("🎮 Conectado a la sala:", this.room.name);

        // --- SOLUCIÓN AL ERROR: Esperar a que el estado esté listo ---
        this.room.onStateChange.once((state) => {

            // 1. Manejar jugadores que entran (o que ya estaban)
            state.players.onAdd((player: IPlayer, sessionId: string) => {
                this.createPlayerEntity(player, sessionId);
            });

            // 2. Manejar jugadores que salen
            state.players.onRemove((player: IPlayer, sessionId: string) => {
                this.removePlayerEntity(sessionId);
            });
        });
    }

    private createPlayerEntity(player: IPlayer, sessionId: string) {
        console.log(`Añadiendo entidad: ${sessionId}`);

        // Función para inicializar el sprite y texto
        const setupVisuals = (name: string) => {
            if (this.playerEntities[sessionId]) return;

            const sprite = this.physics.add.sprite(player.x, player.y, 'ball');
            const label = this.add.text(player.x, player.y - 30, name, {
                fontSize: '14px',
                color: '#ffffff',
                backgroundColor: '#00000088'
            }).setOrigin(0.5);

            this.playerEntities[sessionId] = { sprite, label };

            // Listeners de movimiento (solo para otros jugadores, el nuestro es local)
            if (sessionId !== this.room.sessionId) {
                player.listen("x", (newX) => {
                    sprite.x = newX;
                    label.x = newX;
                });
                player.listen("y", (newY) => {
                    sprite.y = newY;
                    label.y = newY - 30;
                });
            }
        };

        // Si el nombre no está listo (por lag de DB), esperamos a que cambie
        if (!player.name) {
            const unbind = player.listen("name", (newName) => {
                if (newName) {
                    setupVisuals(newName);
                    unbind();
                }
            });
        } else {
            setupVisuals(player.name);
        }
    }

    private removePlayerEntity(sessionId: string) {
        const entity = this.playerEntities[sessionId];
        if (entity) {
            entity.sprite.destroy();
            entity.label.destroy();
            delete this.playerEntities[sessionId];
            console.log(`Entidad eliminada: ${sessionId}`);
        }
    }

    update(): void {
        if (!this.room || !this.playerEntities[this.room.sessionId]) return;

        const myEntity = this.playerEntities[this.room.sessionId];
        const speed = 5;
        let moved = false;

        // Movimiento Local (Predicción)
        if (this.cursors.left.isDown) { myEntity.sprite.x -= speed; moved = true; }
        else if (this.cursors.right.isDown) { myEntity.sprite.x += speed; moved = true; }

        if (this.cursors.up.isDown) { myEntity.sprite.y -= speed; moved = true; }
        else if (this.cursors.down.isDown) { myEntity.sprite.y += speed; moved = true; }

        if (moved) {
            // Actualizar etiqueta localmente
            myEntity.label.setPosition(myEntity.sprite.x, myEntity.sprite.y - 30);

            // Notificar al servidor
            this.room.send("move", {
                x: Math.floor(myEntity.sprite.x),
                y: Math.floor(myEntity.sprite.y)
            });
        }
    }
}