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
        // 1. Cargamos cada archivo con una clave única: char_1, char_2, etc.
        for (let i = 1; i <= 10; i++) {
            this.load.spritesheet(`char_${i}`, `/npc${i}.png`, { frameWidth: 16, frameHeight: 24 });
        }
        this.load.image('tiles', '/assets/tileset.png');
        this.load.json('mapData', './map.json');
    }

    create(): void {
        const roomInstance = this.registry.get('room') as Room<MyRoomState>;
        
        // configuramos el mapa
        const data = this.cache.json.get('mapData');
        if (!data) {
            console.error("No se pudo cargar el JSON del mapa");
            return;
        }
        const map = this.make.tilemap({
            tileWidth: data.tileSize,
            tileHeight: data.tileSize,
            width: data.mapWidth,
            height: data.mapHeight
        });
        const tileset = map.addTilesetImage('tileset', 'tiles');

        // 5. Recorrer las capas del JSON e inyectarlas en Phaser
        data.layers.forEach((layerData: any) => {
            // Creamos una capa vacía en Phaser por cada capa del JSON
            const layer = map.createBlankLayer(layerData.name, tileset!);

            layerData.tiles.forEach((tile: any) => {
                // Ponemos el tile en la posición x, y
                // Nota: Usamos parseInt(tile.id) porque SpriteFusion lo exporta como string
                layer?.putTileAt(parseInt(tile.id), tile.x, tile.y);
            });

            // 6. Configurar la capa de colisiones
            if (layerData.name === "Collisions") {
                // Activamos la colisión para todos los tiles existentes en esta capa
                layer?.setCollisionByExclusion([-1]);

                // Si ya tienes a tu personaje creado:
                // this.physics.add.collider(this.myPlayer, layer);

                // Opcional: Si quieres que la capa sea invisible pero que bloquee:
                layer?.setAlpha(0); 
            }

            // Ajustar profundidad (opcional)
            if (layerData.name === "terrain") {
                layer?.setDepth(0);
            } else if (layerData.name === "Collisions") {
                layer?.setDepth(1);
            }
        });

        // Ajustamos los límites del mundo según el tamaño del mapa
        const worldWidth = data.mapWidth * data.tileSize;
        const worldHeight = data.mapHeight * data.tileSize;
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        this.room = roomInstance;
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.cameras.main.setBounds(0, 0, 2000, 2000);
        this.physics.world.setBounds(0, 0, 2000, 2000);
        

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
        // Usamos onStateChange para detectar nuevos y eliminados manualmente
        this.room.onStateChange((state) => {
            // Detectar nuevos
            state.players.forEach((player, sessionId) => {
                if (!this.playerEntities[sessionId]) {
                    this.addPlayer(player, sessionId);
                } else {
                    // Actualizar posiciones de los que ya existen
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
        // Guardar referencia a las capas de colisión si las necesitas
        const collisionLayer = this.children.list.find(c => c.name === "Collisions") as Phaser.Tilemaps.TilemapLayer;

        if (collisionLayer) {
            this.physics.add.collider(sprite, collisionLayer);
        }

        sprite.setScale(2);
        sprite.body?.setSize(16, 16);
        sprite.body?.setOffset(0, 8);

        const label = this.add.text(data.x, data.y - 24, data.name, {
            fontSize: '14px', backgroundColor: 'rgba(71, 71, 71, 0.14)'
        }).setOrigin(0.5);

        // 4. Guardamos el characterId para saber qué animación llamar después
        this.playerEntities[sessionId] = {
            sprite, label, characterId: charId, serverX: data.x, serverY: data.y, hp: data.hp
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

    // 5. Ajustamos para usar el ID del personaje en el nombre de la animación
    private updatePlayerAnimation(entity: any, dx: number, dy: number) {
        const sprite = entity.sprite;
        const id = entity.characterId;

        if (Math.abs(dx) > Math.abs(dy)) {
            sprite.anims.play(dx > 0 ? `walk-right-${id}` : `walk-left-${id}`, true);
        } else if (Math.abs(dy) > 0.1) {
            sprite.anims.play(dy > 0 ? `walk-down-${id}` : `walk-up-${id}`, true);
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
            // Pasamos la entidad completa para que la animación sepa el ID
            this.updatePlayerAnimation(myEntity, dx, dy);
            myEntity.label.setPosition(myEntity.sprite.x, myEntity.sprite.y - 45);

            this.moveTimer += delta;
            if (this.moveTimer >= this.SEND_RATE) {
                this.room.send("move", { x: Math.floor(myEntity.sprite.x), y: Math.floor(myEntity.sprite.y) });
                this.moveTimer = 0;
            }
        } else {
            myEntity.sprite.anims.stop();
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
