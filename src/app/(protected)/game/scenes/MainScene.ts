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

        //PROGRESO

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. Crear los elementos gráficos de la barra
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        // 2. Crear texto de carga
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Cargando...',
            style: { font: '20px monospace', color: '#ffffff' }
        }).setOrigin(0.5);

        const percentText = this.make.text({
            x: width / 2,
            y: height / 2,
            text: '0%',
            style: { font: '18px monospace', color: '#ffffff' }
        }).setOrigin(0.5);

        // 3. Escuchar los eventos de progreso de Phaser
        this.load.on('progress', (value: number) => {
            // value es un número entre 0 y 1
            percentText.setText(Math.floor(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        // 4. Limpiar al terminar
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });

        const BASE_URL = 'https://randalrpg.onepixperday.xyz';
        const version = Date.now(); // Genera un número único basado en el tiempo
        // ?v=${version} << agregar para evitar cache --- IGNORE ---
        this.load.crossOrigin = 'anonymous';
        // Dentro de preload()
        for (let i = 1; i <= 10; i++) {
            this.load.spritesheet(`char_${i}`, `${BASE_URL}/npc${i}.png?v=${version}`, {
                frameWidth: 32, // Ancho de un frame
                frameHeight: 32 // Alto de un frame
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
            
            layer.setScale(3);

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
        const worldWidth = data.mapWidth * data.tileSize * 3;
        const worldHeight = data.mapHeight * data.tileSize * 3;
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        // 1. Guardamos la referencia de la sala y configuramos controles
        this.room = roomInstance;
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // 2. Creamos animaciones específicas para cada personaje
        const directions = ['down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left', 'down-left'];
        const actions = {
            'idle': [0, 1],
            'walk': [2, 3, 4],
            'sword-idle': [5, 6],
            'sword-attack': [7, 8],
            'bow-attack': [9, 10],
            'bow-idle': [11, 12],
            'wand-idle': [13, 14],
            'wand-attack': [15],
            'spell-idle': [16, 17],
            'spell-attack': [18],
            'hurt': [19, 20, 21],
            'death': [22, 23]
        };
        for (let i = 1; i <= 10; i++) {
            directions.forEach((dir, row) => {
                Object.entries(actions).forEach(([actionName, frames]) => {
                    this.anims.create({
                        key: `${actionName}-${dir}-${i}`,
                        frames: this.anims.generateFrameNumbers(`char_${i}`, {
                            // Calculamos el frame real: (fila * total_columnas) + columna_animacion
                            frames: frames.map(f => (row * 24) + f)
                        }),
                        frameRate: actionName.includes('attack') ? 15 : 8,
                        repeat: actionName.includes('attack') ? 0 : -1 // Ataques no repiten
                    });
                });
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
    
    // Nueva función para obtener la dirección según dx y dy
    private getDirectionName(dx: number, dy: number): string {
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return '';

        // Calculamos el ángulo en radianes y lo pasamos a grados (0 a 360)
        let angle = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(0, 0, dx, dy));
        if (angle < 0) angle += 360;
        // Dividimos el círculo en 8 sectores de 45 grados cada uno.
        // Desplazamos 22.5 grados para que las direcciones principales 
        // (Arriba, Abajo, etc.) queden en el centro de su porción.
        if (angle >= 337.5 || angle < 22.5)   return 'right';
        if (angle >= 22.5  && angle < 67.5)   return 'down-right';
        if (angle >= 67.5  && angle < 112.5)  return 'down';
        if (angle >= 112.5 && angle < 157.5)  return 'down-left';
        if (angle >= 157.5 && angle < 202.5)  return 'left';
        if (angle >= 202.5 && angle < 247.5)  return 'up-left';
        if (angle >= 247.5 && angle < 292.5)  return 'up';
        if (angle >= 292.5 && angle < 337.5)  return 'up-right';
        return 'down'; // Por defecto
    }

    // Nueva función de gestión de animaciones
    private updatePlayerAnimation(entity: any, dx: number, dy: number, attackType: number) {
        const id = entity.characterId;
        const sprite = entity.sprite;

        // Si hay una animación de ataque reproduciéndose, no hacemos nada (prioridad)
        if (sprite.anims.currentAnim && sprite.anims.currentAnim.key.includes('attack') && sprite.anims.isPlaying) {
            return;
        }

        // Actualizar dirección actual si hay movimiento
        const newDir = this.getDirectionName(dx, dy);
        if (newDir) entity.currentDir = newDir;
        const dir = entity.currentDir || 'down';

        // Determinar acción
        let action = 'idle';
        if (attackType > 0) {
            const attackMap: any = { 1: 'sword-attack', 2: 'bow-attack', 3: 'wand-attack', 4: 'spell-attack' };
            action = attackMap[attackType];
        } else if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            action = 'walk';
        } else {
            // Idle dinámico según el arma equipada (opcional, si quieres que el idle cambie)
            const idleMap: any = { 0: 'idle', 1: 'sword-idle', 2: 'bow-idle', 3: 'wand-idle', 4: 'spell-idle' };
            // Si tienes el tipo de arma actual en el estado del jugador, úsalo aquí
            action = idleMap[0];
        }

        const animKey = `${action}-${dir}-${id}`;
        if (sprite.anims.currentAnim?.key !== animKey) {
            sprite.anims.play(animKey, true);
        }
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

        sprite.setScale(3); 

        sprite.setDepth(2); 
        const hitboxW = 8;
        const hitboxH = 8;

        const offsetX = (16 - hitboxW) / 2; // Centrado automático
        const offsetY = 24; // Empujamos el hitbox hacia la base del sprite

        sprite.body?.setSize(hitboxW, hitboxH);
        sprite.body?.setOffset(offsetX, offsetY);

        if (this.collisionLayer) this.physics.add.collider(sprite, this.collisionLayer);
   
        const label = this.add.text(data.x, data.y - 32, data.name, {
            fontSize: '14px', backgroundColor: 'rgba(96, 96, 96, 0.24)'
        }).setOrigin(0.5);
        
        label.setDepth(2);

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

    update(time: number, delta: number): void {
        if (!this.room) return;
        const myId = this.room.sessionId;
        const myEntity = this.playerEntities[myId];
        const attackType = myEntity.attack || 0;
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

        if (moved || attackType > 0 || true) {
            
            myEntity.sprite.body.setVelocity(dx * speed * 60, dy * speed * 60);

            // Pasamos la entidad completa para que la animación sepa el ID
            this.updatePlayerAnimation(myEntity, dx, dy, attackType);

            myEntity.label.setPosition(myEntity.sprite.x, myEntity.sprite.y - 32);

            this.moveTimer += delta;
            if (this.moveTimer >= this.SEND_RATE) {
                this.room.send("move", { x: Math.floor(myEntity.sprite.x), y: Math.floor(myEntity.sprite.y) });
                this.moveTimer = 0;
            }
        }

        for (const id in this.playerEntities) {
            if (id === myId) continue;
            const entity = this.playerEntities[id];
            const diffX = entity.serverX - entity.sprite.x;
            const diffY = entity.serverY - entity.sprite.y;

            if (Math.abs(diffX) > 1 || Math.abs(diffY) > 1) {
                this.updatePlayerAnimation(entity, diffX, diffY, entity.attack || 0);
                entity.sprite.x = Phaser.Math.Linear(entity.sprite.x, entity.serverX, 0.15);
                entity.sprite.y = Phaser.Math.Linear(entity.sprite.y, entity.serverY, 0.15);
            } else {
                entity.sprite.anims.stop();
            }
            entity.label.setPosition(entity.sprite.x, entity.sprite.y - 45);
        }
    }
}
