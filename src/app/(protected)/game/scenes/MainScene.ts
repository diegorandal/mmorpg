import Phaser from 'phaser';
import { Room } from 'colyseus.js';

// Definimos la interfaz para que TypeScript sepa qué esperar del estado de Colyseus
interface IPlayer {
    name: string;
    x: number;
    y: number;
    // Los esquemas de Colyseus tienen métodos especiales como listen y onChange
    listen: (prop: string, callback: (value: any) => void) => void;
    onChange: (callback: () => void) => void;
}

export class MainScene extends Phaser.Scene {
    private room!: Room;
    private playerEntities: { [sessionId: string]: { sprite: Phaser.Physics.Arcade.Sprite, label: Phaser.GameObjects.Text } } = {};
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor() {
        super('MainScene');
    }

    preload(): void {
        // Usamos una imagen externa para pruebas rápidas
        this.load.image('ball', 'https://labs.phaser.io/assets/sprites/shinyball.png');
    }

    create(): void {
        // 1. RECUPERACIÓN SEGURA: Validamos que la sala exista en el registry
        this.room = this.registry.get('room');

        if (!this.room) {
            console.error("Error: No se encontró la instancia de la sala en el registry.");
            return;
        }

        this.cursors = this.input.keyboard!.createCursorKeys();

        // 2. ESCUCHAR CUANDO UN JUGADOR SE UNE
        this.room.state.players.onAdd((player: IPlayer, sessionId: string) => {
            console.log(`Jugador unido: ${sessionId}`, player);

            // Verificación extra para evitar el error 'name' de undefined
            const playerName = player.name || "Cargando...";

            // Crear el Sprite en la posición inicial del servidor
            const sprite = this.physics.add.sprite(player.x, player.y, 'ball');

            // Crear el Texto del nombre sobre el jugador
            const label = this.add.text(player.x, player.y - 30, playerName, {
                fontSize: '14px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);

            // Guardamos la referencia para poder moverlo o borrarlo después
            this.playerEntities[sessionId] = { sprite, label };

            // 3. SINCRONIZACIÓN DE POSICIÓN (Método listen: más eficiente que onChange)
            player.listen("x", (newX) => {
                sprite.x = newX;
                label.x = newX;
            });

            player.listen("y", (newY) => {
                sprite.y = newY;
                label.y = newY - 30;
            });

            // Si el nombre cambia dinámicamente
            player.listen("name", (newName) => {
                label.setText(newName);
            });
        });

        // 4. ESCUCHAR CUANDO UN JUGADOR SE VA
        this.room.state.players.onRemove((player: IPlayer, sessionId: string) => {
            if (this.playerEntities[sessionId]) {
                this.playerEntities[sessionId].sprite.destroy();
                this.playerEntities[sessionId].label.destroy();
                delete this.playerEntities[sessionId];
                console.log(`Jugador eliminado: ${sessionId}`);
            }
        });
    }

    update(): void {
        // 5. MOVIMIENTO (Client-Side Prediction simple)
        if (!this.room || !this.playerEntities[this.room.sessionId]) return;

        const myEntity = this.playerEntities[this.room.sessionId];
        const speed = 5;
        let vx = 0;
        let vy = 0;

        // Detectar teclas
        if (this.cursors.left.isDown) vx -= speed;
        else if (this.cursors.right.isDown) vx += speed;

        if (this.cursors.up.isDown) vy -= speed;
        else if (this.cursors.down.isDown) vy += speed;

        // Si hay movimiento, informamos al servidor
        if (vx !== 0 || vy !== 0) {
            // Enviamos la NUEVA posición deseada
            this.room.send("move", {
                x: myEntity.sprite.x + vx,
                y: myEntity.sprite.y + vy
            });

            /* NOTA: En un entorno de producción con lag, aquí moveríamos el sprite 
               localmente de inmediato y luego corregiríamos con la respuesta del servidor.
            */
        }
    }
}