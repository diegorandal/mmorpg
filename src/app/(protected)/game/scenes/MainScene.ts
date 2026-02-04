import Phaser from 'phaser';
import { Room } from '@colyseus/sdk';
import type { MyRoomState } from '@/app/(protected)/home/PlayerState';

export class MainScene extends Phaser.Scene {
    private room!: Room<MyRoomState>;
    private playerEntities: { [sessionId: string]: any } = {};
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private collisionLayer?: Phaser.Tilemaps.TilemapLayer;
    private joystickBase?: Phaser.GameObjects.Arc;
    private joystickThumb?: Phaser.GameObjects.Arc;
    private isDragging: boolean = false;
    private moveTimer: number = 0;
    private readonly SEND_RATE = 100;

    preload(): void {
        const BASE_URL = 'https://randalrpg.onepixperday.xyz';
        const version = Date.now(); // Genera un número único basado en el tiempo

        this.load.crossOrigin = 'anonymous';

        for (let i = 1; i <= 10; i++) {
            // Al añadir ?v=... la URL es "nueva" para el navegador
            this.load.spritesheet(`char_${i}`, `${BASE_URL}/npc${i}.png?v=${version}`, {
                frameWidth: 16,
                frameHeight: 24
            });
        }

        this.load.image('tileset-image', `${BASE_URL}/tileset.png?v=${version}`);
        this.load.json('mapData', `${BASE_URL}/map.json?v=${version}`);
    }

    create(): void {

        const roomInstance = this.registry.get('room') as Room<MyRoomState>;
        
        // configuramos el mapa
        const data = this.cache.json.get('mapData');

        const map = this.make.tilemap({
            tileWidth: data.tileSize,
            tileHeight: data.tileSize,
            width: data.mapWidth,
            height: data.mapHeight
        });
        const tileset = map.addTilesetImage('tileset-image', 'tileset-image');

        // 5. Recorrer las capas del JSON e inyectarlas en Phaser
        data.layers.forEach((layerData: any) => {
           
            const layer = map.createBlankLayer(layerData.name, tileset!);

            if (!layer) return;

            layerData.tiles.forEach((tile: any) => {
                const t = layer.putTileAt(parseInt(tile.id), tile.x, tile.y);
                if (layerData.name === "Collisions") t.setCollision(true);
            });
            
            layer.setScale(4);

            // GESTIÓN DE PROFUNDIDAD Y COLISIONES
            switch (layerData.name) {
                case "terrain":
                    layer.setDepth(0);
                    break;
                case "decor":
                    layer.setDepth(1);
                    break;
                case "trees":
                    layer.setDepth(3); // Por encima de los jugadores
                    break;
                case "Collisions":
                    layer.setDepth(4);
                    layer.setCollision(0); // O el ID que uses para muros
                    this.collisionLayer = layer;
                    layer.setAlpha(0); // Lo hacemos invisible para que no tape el arte
                    break;
            }
            
        });

        // Ajustamos los límites del mundo según el tamaño del mapa
        const worldWidth = data.mapWidth * data.tileSize;
        const worldHeight = data.mapHeight * data.tileSize;
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        // 1. Guardamos la referencia de la sala y configuramos controles
        this.room = roomInstance;
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // 2. Creamos animaciones específicas para cada personaje
        for (let i = 1; i <= 10; i++) {
            const key = `char_${i}`;
            this.anims.create({
                key: `walk-down-${i}`,
                frames: this.anims.generateFrameNumbers(key, { start: 0, end: 2 }),
                frameRate: 10, repeat: -1
            });
            this.anims.create({
                key: `walk-left-${i}`,
                frames: this.anims.generateFrameNumbers(key, { start: 3, end: 5 }),
                frameRate: 10, repeat: -1
            });
            this.anims.create({
                key: `walk-right-${i}`,
                frames: this.anims.generateFrameNumbers(key, { start: 6, end: 8 }),
                frameRate: 10, repeat: -1
            });
            this.anims.create({
                key: `walk-up-${i}`,
                frames: this.anims.generateFrameNumbers(key, { start: 9, end: 11 }),
                frameRate: 10, repeat: -1
            });
        }

        this.room.state.players.forEach((player, sessionId) => {
            this.addPlayer(player, sessionId);
        });

        // 2. Sincronización en Tiempo Real:
        this.room.onStateChange((state) => {
            // Detectar nuevos
            state.players.forEach((player, sessionId) => {
                if (!this.playerEntities[sessionId]) {
                    this.addPlayer(player, sessionId);
                } else {
                    this.updatePlayer(player, sessionId);
                }
            });
            // Detectar los que se fueron
            for (const sessionId in this.playerEntities) {
                if (!state.players.has(sessionId)) {
                    this.removePlayer(sessionId);
                }
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
        // 3. Obtenemos el ID del character y asignamos su textura
        const charId = data.character || 1;
        const sprite = this.physics.add.sprite(data.x, data.y, `char_${charId}`);

        sprite.setScale(3); // Bajamos un poco la escala ya que el tile es de 16px
        sprite.setDepth(2); // <--- IMPORTANTE: Entre Decor y Trees
        // 2. Ajustamos hitbox basándonos en los 16x24 originales
        // Queremos que la colisión sea un cuadrado de 10x10 en la base
        const hitboxW = 8;
        const hitboxH = 8;
        const offsetX = (16 - hitboxW) / 2; // Centrado automático
        const offsetY = 16; // Empujamos el hitbox hacia la base del sprite
        sprite.body?.setSize(hitboxW, hitboxH);
        sprite.body?.setOffset(offsetX, offsetY);

        if (this.collisionLayer) this.physics.add.collider(sprite, this.collisionLayer);
   
        const label = this.add.text(data.x, data.y - 32, data.name, {
            fontSize: '14px', backgroundColor: 'rgba(96, 96, 96, 0.24)'
        }).setOrigin(0.5);

        // 4. Guardamos el characterId para saber qué animación llamar después
        this.playerEntities[sessionId] = {sprite, label, characterId: charId, serverX: data.x, serverY: data.y, hp: data.hp};
        if (sessionId === this.room.sessionId) this.cameras.main.startFollow(sprite, true, 0.1, 0.1);
        
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

    // 5. Ajustamos para usar el ID del personaje en el nombre de la animación
    private updatePlayerAnimation(entity: any, dx: number, dy: number) {
        const sprite = entity.sprite;
        const id = entity.characterId;
        if (Math.abs(dx) > Math.abs(dy)) {sprite.anims.play(dx > 0 ? `walk-right-${id}` : `walk-left-${id}`, true);
        } else if (Math.abs(dy) > 0.1) {sprite.anims.play(dy > 0 ? `walk-down-${id}` : `walk-up-${id}`, true);
        } else {sprite.anims.stop();}
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
            
            myEntity.sprite.body.setVelocity(dx * speed * 60, dy * speed * 60);

            // Pasamos la entidad completa para que la animación sepa el ID
            this.updatePlayerAnimation(myEntity, dx, dy);
            myEntity.label.setPosition(myEntity.sprite.x, myEntity.sprite.y - 32);

            this.moveTimer += delta;
            if (this.moveTimer >= this.SEND_RATE) {
                this.room.send("move", { x: Math.floor(myEntity.sprite.x), y: Math.floor(myEntity.sprite.y) });
                this.moveTimer = 0;
            }
        } else {
            myEntity.sprite.anims.stop();
            myEntity.sprite.body.setVelocity(0, 0);
        }

        for (const id in this.playerEntities) {
            if (id === myId) continue;
            const entity = this.playerEntities[id];
            const diffX = entity.serverX - entity.sprite.x;
            const diffY = entity.serverY - entity.sprite.y;

            if (Math.abs(diffX) > 1 || Math.abs(diffY) > 1) {
                this.updatePlayerAnimation(entity, diffX, diffY);
                entity.sprite.x = Phaser.Math.Linear(entity.sprite.x, entity.serverX, 0.15);
                entity.sprite.y = Phaser.Math.Linear(entity.sprite.y, entity.serverY, 0.15);
            } else {
                entity.sprite.anims.stop();
            }
            entity.label.setPosition(entity.sprite.x, entity.sprite.y - 45);
        }
    }
}
