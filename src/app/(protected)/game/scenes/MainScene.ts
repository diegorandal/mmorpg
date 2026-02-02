import Phaser from 'phaser';
import { Room } from '@colyseus/sdk';
import type { MyRoomState } from '@/app/(protected)/home/PlayerState';

export class MainScene extends Phaser.Scene {
    private room!: Room<MyRoomState>;
    private playerEntities: { [sessionId: string]: any } = {};
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    // Variables para el Joystick
    private joystickBase?: Phaser.GameObjects.Arc;
    private joystickThumb?: Phaser.GameObjects.Arc;
    private isDragging: boolean = false;
    private moveTimer: number = 0;
    private readonly SEND_RATE = 100; // Enviar cada 100ms

    preload(): void {
        this.load.image('ball', 'https://labs.phaser.io/assets/sprites/shinyball.png');
    }

    create(): void {
        const roomInstance = this.registry.get('room') as Room<MyRoomState>;
        this.room = roomInstance;
        this.cursors = this.input.keyboard!.createCursorKeys();

        // 1. Configuración de Cámara inicial
        this.cameras.main.setBounds(0, 0, 2000, 2000); // Ajusta al tamaño de tu mapa
        this.physics.world.setBounds(0, 0, 2000, 2000);

        // 2. Escuchar cambios de estado
        this.room.onStateChange((state) => {
            const playersData = state.players.toJSON();

            for (const sessionId in playersData) {
                const data = playersData[sessionId];
                if (!this.playerEntities[sessionId]) {
                    this.addPlayer(data, sessionId);
                } else {
                    this.updatePlayer(data, sessionId);
                }
            }

            for (const sessionId in this.playerEntities) {
                if (!playersData[sessionId]) {
                    this.removePlayer(sessionId);
                }
            }
        });

        // 3. Crear Joystick Virtual (UI)
        this.setupJoystick();
    }

    private setupJoystick() {
        const x = 120;
        const y = window.innerHeight - 120;

        // Base del joystick (Círculo exterior)
        this.joystickBase = this.add.circle(x, y, 60, 0xffffff, 0.2)
            .setScrollFactor(0)
            .setDepth(1000);

        // Botón del joystick (Círculo interior)
        this.joystickThumb = this.add.circle(x, y, 30, 0xffffff, 0.5)
            .setScrollFactor(0)
            .setDepth(1001);

        // Eventos táctiles
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, x, y);
            if (dist < 80) this.isDragging = true;
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!this.isDragging || !this.joystickBase || !this.joystickThumb) return;

            const angle = Phaser.Math.Angle.Between(x, y, pointer.x, pointer.y);
            const dist = Phaser.Math.Distance.Between(x, y, pointer.x, pointer.y);
            const maxDist = 50;

            const finalDist = Math.min(dist, maxDist);
            this.joystickThumb.x = x + Math.cos(angle) * finalDist;
            this.joystickThumb.y = y + Math.sin(angle) * finalDist;
        });

        this.input.on('pointerup', () => {
            this.isDragging = false;
            if (this.joystickThumb) {
                this.joystickThumb.x = x;
                this.joystickThumb.y = y;
            }
        });
    }

    private addPlayer(data: any, sessionId: string) {
        const sprite = this.physics.add.sprite(data.x, data.y, 'ball');
        const label = this.add.text(data.x, data.y - 30, data.name || "Anon", {
            fontSize: '14px',
            backgroundColor: 'rgba(0,0,0,0.5)'
        }).setOrigin(0.5);

        this.playerEntities[sessionId] = {
            sprite,
            label,
            serverX: data.x,
            serverY: data.y,
            hp: data.hp
        };

        if (sessionId === this.room.sessionId) {
            // Suavizado de cámara (Lerp: 0.1)
            this.cameras.main.startFollow(sprite, true, 0.1, 0.1);
        }
    }

    private updatePlayer(data: any, sessionId: string) {
        const entity = this.playerEntities[sessionId];
        if (!entity) return;

        entity.hp = data.hp;
        if (data.name) entity.label.setText(data.name);

        if (sessionId !== this.room.sessionId) {
            entity.serverX = data.x;
            entity.serverY = data.y;
        }
    }

    private removePlayer(sessionId: string) {
        const entity = this.playerEntities[sessionId];
        if (entity) {
            entity.sprite.destroy();
            entity.label.destroy();
            delete this.playerEntities[sessionId];
        }
    }

    update(time: number, delta: number): void {
        if (!this.room) return;

        const myId = this.room.sessionId;
        const myEntity = this.playerEntities[myId];
        if (!myEntity) return;

        let moved = false;
        const speed = 4;

        // Prioridad 1: Joystick
        if (this.isDragging && this.joystickThumb && this.joystickBase) {
            const dx = (this.joystickThumb.x - this.joystickBase.x) / 50;
            const dy = (this.joystickThumb.y - this.joystickBase.y) / 50;

            myEntity.sprite.x += dx * speed;
            myEntity.sprite.y += dy * speed;
            moved = true;
        }
        // Prioridad 2: Teclado (Desktop fallback)
        else {
            if (this.cursors.left.isDown) { myEntity.sprite.x -= speed; moved = true; }
            else if (this.cursors.right.isDown) { myEntity.sprite.x += speed; moved = true; }
            if (this.cursors.up.isDown) { myEntity.sprite.y -= speed; moved = true; }
            else if (this.cursors.down.isDown) { myEntity.sprite.y += speed; moved = true; }
        }

        if (moved) {
            myEntity.label.setPosition(myEntity.sprite.x, myEntity.sprite.y - 30);

            // Throttling: Enviar posición al servidor con frecuencia controlada
            this.moveTimer += delta;
            if (this.moveTimer >= this.SEND_RATE) {
                this.room.send("move", {
                    x: Math.floor(myEntity.sprite.x),
                    y: Math.floor(myEntity.sprite.y)
                });
                this.moveTimer = 0;
            }
        }

        // Interpolación de remotos (Suavizado de red)
        for (const id in this.playerEntities) {
            if (id === myId) continue;
            const entity = this.playerEntities[id];
            entity.sprite.x = Phaser.Math.Linear(entity.sprite.x, entity.serverX, 0.15);
            entity.sprite.y = Phaser.Math.Linear(entity.sprite.y, entity.serverY, 0.15);
            entity.label.setPosition(entity.sprite.x, entity.sprite.y - 30);
        }
    }
}