import Phaser from 'phaser';
import { Room } from '@colyseus/sdk';
import type { MyRoomState } from '@/app/(protected)/home/PlayerState';

export class MainScene extends Phaser.Scene {
    private room!: Room<MyRoomState>;
    private playerEntities: { [sessionId: string]: any } = {};
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private joystickBase?: Phaser.GameObjects.Arc;
    private joystickThumb?: Phaser.GameObjects.Arc;
    private isDragging: boolean = false;
    private moveTimer: number = 0;
    private readonly SEND_RATE = 100;

    preload(): void {
        // Cargamos el spritesheet desde /public/npc30.png
        this.load.spritesheet('player', '/npc30.png', { frameWidth: 16, frameHeight: 24 });
    }

    create(): void {
        const roomInstance = this.registry.get('room') as Room<MyRoomState>;
        this.room = roomInstance;
        this.cursors = this.input.keyboard!.createCursorKeys();

        this.cameras.main.setBounds(0, 0, 2000, 2000);
        this.physics.world.setBounds(0, 0, 2000, 2000);

        // Definición de animaciones según tus índices
        this.anims.create({
            key: 'walk-down',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 2 }),
            frameRate: 10, repeat: -1
        });
        this.anims.create({
            key: 'walk-left',
            frames: this.anims.generateFrameNumbers('player', { start: 3, end: 5 }),
            frameRate: 10, repeat: -1
        });
        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('player', { start: 6, end: 8 }),
            frameRate: 10, repeat: -1
        });
        this.anims.create({
            key: 'walk-up',
            frames: this.anims.generateFrameNumbers('player', { start: 9, end: 11 }),
            frameRate: 10, repeat: -1
        });

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
                if (!playersData[sessionId]) this.removePlayer(sessionId);
            }
        });

        this.setupJoystick();
    }

    private setupJoystick() {
        const x = 120;
        const y = window.innerHeight - 120;
        this.joystickBase = this.add.circle(x, y, 60, 0xffffff, 0.2).setScrollFactor(0).setDepth(1000);
        this.joystickThumb = this.add.circle(x, y, 30, 0xffffff, 0.5).setScrollFactor(0).setDepth(1001);

        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            if (Phaser.Math.Distance.Between(p.x, p.y, x, y) < 80) this.isDragging = true;
        });

        this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
            if (!this.isDragging || !this.joystickBase || !this.joystickThumb) return;
            const angle = Phaser.Math.Angle.Between(x, y, p.x, p.y);
            const dist = Math.min(Phaser.Math.Distance.Between(x, y, p.x, p.y), 50);
            this.joystickThumb.x = x + Math.cos(angle) * dist;
            this.joystickThumb.y = y + Math.sin(angle) * dist;
        });

        this.input.on('pointerup', () => {
            this.isDragging = false;
            if (this.joystickThumb) { this.joystickThumb.x = x; this.joystickThumb.y = y; }
        });
    }

    private addPlayer(data: any, sessionId: string) {
        // Usamos el sprite animado 'player'
        const sprite = this.physics.add.sprite(data.x, data.y, 'player');

        sprite.setScale(2);

        // Ajustamos el cuerpo de físicas para que coincida con el nuevo tamaño
        sprite.body?.setSize(16, 16); // Cuerpo de colisión (opcional)
        sprite.body?.setOffset(0, 8);  // Ajuste para que los pies toquen el suelo

        const label = this.add.text(data.x, data.y - 45, data.name || "Anon", {
            fontSize: '14px', backgroundColor: 'rgba(0,0,0,0.5)'
        }).setOrigin(0.5);

        this.playerEntities[sessionId] = {
            sprite, label, serverX: data.x, serverY: data.y, hp: data.hp
        };

        if (sessionId === this.room.sessionId) {
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

    // Función para manejar la lógica de qué animación poner
    private updatePlayerAnimation(sprite: Phaser.Physics.Arcade.Sprite, dx: number, dy: number) {
        if (Math.abs(dx) > Math.abs(dy)) {
            sprite.anims.play(dx > 0 ? 'walk-right' : 'walk-left', true);
        } else if (Math.abs(dy) > 0.1) {
            sprite.anims.play(dy > 0 ? 'walk-down' : 'walk-up', true);
        } else {
            sprite.anims.stop();
        }
    }

    update(time: number, delta: number): void {
        if (!this.room) return;
        const myId = this.room.sessionId;
        const myEntity = this.playerEntities[myId];
        if (!myEntity) return;

        let moved = false;
        let dx = 0;
        let dy = 0;
        const speed = 4;

        // 1. Control Local (Joystick o Teclado)
        if (this.isDragging && this.joystickThumb && this.joystickBase) {
            dx = (this.joystickThumb.x - this.joystickBase.x) / 50;
            dy = (this.joystickThumb.y - this.joystickBase.y) / 50;
            moved = Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1;
        } else {
            if (this.cursors.left.isDown) dx = -1;
            else if (this.cursors.right.isDown) dx = 1;
            if (this.cursors.up.isDown) dy = -1;
            else if (this.cursors.down.isDown) dy = 1;
            moved = dx !== 0 || dy !== 0;
        }

        if (moved) {
            myEntity.sprite.x += dx * speed;
            myEntity.sprite.y += dy * speed;
            this.updatePlayerAnimation(myEntity.sprite, dx, dy);
            myEntity.label.setPosition(myEntity.sprite.x, myEntity.sprite.y - 30);

            this.moveTimer += delta;
            if (this.moveTimer >= this.SEND_RATE) {
                this.room.send("move", { x: Math.floor(myEntity.sprite.x), y: Math.floor(myEntity.sprite.y) });
                this.moveTimer = 0;
            }
        } else {
            myEntity.sprite.anims.stop();
        }

        // 2. Jugadores Remotos
        for (const id in this.playerEntities) {
            if (id === myId) continue;
            const entity = this.playerEntities[id];

            // Calculamos la dirección del movimiento para la animación antes de interpolar
            const diffX = entity.serverX - entity.sprite.x;
            const diffY = entity.serverY - entity.sprite.y;

            if (Math.abs(diffX) > 1 || Math.abs(diffY) > 1) {
                this.updatePlayerAnimation(entity.sprite, diffX, diffY);
                entity.sprite.x = Phaser.Math.Linear(entity.sprite.x, entity.serverX, 0.15);
                entity.sprite.y = Phaser.Math.Linear(entity.sprite.y, entity.serverY, 0.15);
            } else {
                entity.sprite.anims.stop();
            }
            entity.label.setPosition(entity.sprite.x, entity.sprite.y - 30);
        }
    }
}