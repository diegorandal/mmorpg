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
    private attackText?: Phaser.GameObjects.Text;
    private weaponButton?: Phaser.GameObjects.Arc;
    private weaponLabel?: Phaser.GameObjects.Text;
    private deathOverlay?: Phaser.GameObjects.Rectangle;
    private deathButton?: Phaser.GameObjects.Text;
    private spaceKey!: Phaser.Input.Keyboard.Key;
    private key1Key!: Phaser.Input.Keyboard.Key;
    private key2Key!: Phaser.Input.Keyboard.Key;
    private key3Key!: Phaser.Input.Keyboard.Key;
    private key4Key!: Phaser.Input.Keyboard.Key;
    private isDragging: boolean = false;
    private moveTimer: number = 0;
    private attackButton?: Phaser.GameObjects.Arc;
    //private isAttacking: boolean = false;
    private myCurrentWeaponType: number = 0;
    private readonly SEND_RATE = 100;
    private hpText?: Phaser.GameObjects.Text;

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
        for (let i = 1; i <= 18; i++) {
            this.load.spritesheet(`char_${i}`, `${BASE_URL}/npc${i}.png?v=${version}`, {
                frameWidth: 32, // Ancho de un frame
                frameHeight: 32 // Alto de un frame
            });
        }
        this.load.image('tileset-image', `${BASE_URL}/tileset.png?v=${version}`);
        this.load.json('mapData', `${BASE_URL}/map.json?v=${version}`);
        this.load.image('arrow', `${BASE_URL}/arrow.png?v=${version}`);
    }

    create(): void {

        const roomInstance = this.registry.get('room') as Room<MyRoomState>;
        
        // configuramos el mapa
        const data = this.cache.json.get('mapData');
        const map = this.make.tilemap({tileWidth: data.tileSize, tileHeight: data.tileSize, width: data.mapWidth, height: data.mapHeight});
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
                    layer.setDepth(4000); // Por encima de los jugadores
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
        const actionsConfig = {
            'idle':         { frames: [0, 1],       rate: 4,  repeat: -1 }, 
            'sword-idle':   { frames: [5, 6],       rate: 4, repeat: -1 },
            'bow-idle':     { frames: [11, 12],     rate: 4, repeat: -1 },
            'wand-idle':    { frames: [13, 14],     rate: 4, repeat: -1 },
            'spell-idle':   { frames: [16, 17],     rate: 4, repeat: -1 },
            'walk':         { frames: [2, 3, 4],    rate: 10, repeat: -1 }, 
            'sword-attack': { frames: [7, 8],       rate: 10, repeat: 0  }, 
            'bow-attack':   { frames: [9, 10],      rate: 10, repeat: 0  },
            'wand-attack':  { frames: [15],         rate: 5,  repeat: 0  },
            'spell-attack': { frames: [18],         rate: 5,  repeat: 0  },
            'hurt':         { frames: [19, 20, 21], rate: 20, repeat: 0  },
            'death':        { frames: [22, 23],     rate: 4,  repeat: 0  }
        };

        for (let i = 1; i <= 18; i++) {
            const charKey = `char_${i}`;
            directions.forEach((dir, row) => {
                Object.entries(actionsConfig).forEach(([actionName, config]) => {
                    this.anims.create({
                        key: `${actionName}-${dir}-${i}`,
                        frames: this.anims.generateFrameNumbers(charKey, {
                            frames: config.frames.map(f => (row * 24) + f)
                        }),
                        frameRate: config.rate,
                        repeat: config.repeat
                    });
                });
            });
        }

        this.room.state.players.forEach((player, sessionId) => {
            this.addPlayer(player, sessionId);
        });

        // 1. Escuchar eventos de ataque desde el servidor
        this.room.onMessage("playerAttack", (msg) => {
            if (msg.sessionId === this.room.sessionId) return;
            const entity = this.playerEntities[msg.sessionId];
            if (!entity || entity.isDead) return;
            this.playAttackOnce(entity, msg);
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

        // Etiqueta de HP fija en la esquina superior izquierda
        this.hpText = this.add.text(20, 20, `❤ ${this.room.state.players.get(this.room.sessionId)?.hp || 0}`, {
            fontSize: '18px',
            backgroundColor: 'rgba(96, 96, 96, 0.24)',
            padding: { x: 10, y: 5 },
        }).setScrollFactor(0).setDepth(10000);

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

    private showDamageText(x: number, y: number, amount: number) {
        const damageLabel = this.add.text(x, y - 20, `-${amount}`, {
            fontSize: '20px',
            color: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(3000);

        // Animación: Subir y desvanecerse
        this.tweens.add({
            targets: damageLabel,
            y: y - 80,          // Sube 60 pixeles
            alpha: 0,           // Se vuelve transparente
            duration: 800,      // Duración de 0.8 segundos
            ease: 'Cubic.out',
            onComplete: () => {
                damageLabel.destroy(); // Lo eliminamos del juego
            }
        });
    }

    // Nueva función de gestión de animaciones
    private updatePlayerAnimation(entity: any, dx: number, dy: number) {
        const id = entity.characterId;
        const sprite = entity.sprite;
        
        if (entity.isDead) return;

        // 1. Prioridad absoluta: Si la animación de ataque sigue activa, no interrumpir
        if (sprite.anims.currentAnim?.key.includes('attack') && sprite.anims.isPlaying) {
            return;
        }

        // 2. Actualizar dirección
        const newDir = this.getDirectionName(dx, dy);
        if (newDir) entity.currentDir = newDir;
        const dir = entity.currentDir || 'down';

        // 3. Arma (Aseguramos que weapon tenga un valor por defecto)
        const weaponType = entity.weapon || 0;
        const weaponMap: any = { 0: '', 1: 'sword-', 2: 'bow-', 3: 'wand-', 4: 'spell-' };
        const weaponPrefix = weaponMap[weaponType] || '';
        const attackMap: any = {1: 'sword-attack', 2: 'bow-attack', 3: 'wand-attack', 4: 'spell-attack'};

        // 4. Determinar la acción
        let action = '';

        const isMoving = Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1;
        action = isMoving ? 'walk' : `${weaponPrefix}idle`;

        // 5. Ejecutar
        const animKey = `${action}-${dir}-${id}`;

        if (sprite.anims.currentAnim?.key !== animKey) sprite.anims.play(animKey, true);

    }

    private playAttackOnce(entity: any, msg: any) {

        const dir = entity.currentDir || 'down';
        const weaponMap: any = {1: 'sword-attack', 2: 'bow-attack', 3: 'wand-attack', 4: 'spell-attack'};
        const animKey = `${weaponMap[msg.weaponType]}-${dir}-${entity.characterId}`;
        entity.sprite.anims.play(animKey, true);

        // FX aquí (flecha, aura, círculo)
        if (entity.weapon === 2) { // FX
            const attackX = entity.sprite.x + entity.lookDir.x * 300;
            const attackY = entity.sprite.y + entity.lookDir.y * 300;
            const arrow = this.add.image(entity.sprite.x, entity.sprite.y, 'arrow').setOrigin(0.5, 0.5).setDepth(entity.sprite.depth + 10).setScale(3);
            arrow.rotation = Phaser.Math.Angle.Between(entity.sprite.x, entity.sprite.y, attackX, attackY);
            this.tweens.add({ targets: arrow, x: attackX, y: attackY, duration: 50, ease: 'Linear', onComplete: () => arrow.destroy() });
        }

        if (entity.weapon === 3) { // FX
            const distanceOffset = 64; // Distancia desde el jugador hacia adelante
            const attackRadius = 80;   // Radio del área de impacto
            const attackX = entity.sprite.x + (entity.lookDir.x * distanceOffset);
            const attackY = entity.sprite.y + (entity.lookDir.y * distanceOffset);
            const magicCircle = this.add.circle(attackX, attackY, 10, 0x00ffff, 0.5); // Empieza en radio 10
            this.tweens.add({ targets: magicCircle, radius: attackRadius, alpha: 0, duration: 150, ease: 'Cubic.out', onComplete: () => magicCircle.destroy() });
        }

        if (entity.weapon === 4) { // FX
            const attackRadius = 100;   // Radio del área de impacto
            const attackX = entity.sprite.x;
            const attackY = entity.sprite.y;
            const aura = this.add.circle(attackX, attackY, 5, 0xbf40bf, 0.6).setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({ targets: aura, radius: attackRadius, alpha: 0, duration: 500, ease: 'Cubic.out', onComplete: () => aura.destroy() });
        }
    }

    private handleDeath(entity: any, sessionId: string) {
        if (entity.isDead) return;

        entity.isDead = true;

        const dir = entity.currentDir || 'down';
        const animKey = `death-${dir}-${entity.characterId}`;

        entity.sprite.setVelocity(0, 0);
        entity.sprite.anims.play(animKey, true);

        // Opcional: que no colisione más
        entity.sprite.body.enable = false;

        // Si soy yo → deshabilitar controles
        if (sessionId === this.room.sessionId) {
            this.disableControls();
            this.showDeathScreen();
        }
    }

    private disableControls() {
        this.isDragging = false;
        this.joystickBase?.setVisible(false);
        this.attackText?.setVisible(false);
        this.joystickThumb?.setVisible(false);
        this.attackButton?.setVisible(false);
        this.weaponButton?.setVisible(false);
        this.weaponLabel?.setVisible(false);
        this.input.keyboard?.removeAllKeys(true);


    }

    private handleAttack() {

        if (!this.room || !this.playerEntities[this.room.sessionId]) return;
        const myEntity = this.playerEntities[this.room.sessionId];

        if (this.myCurrentWeaponType === 0) return;

        myEntity.attack = 1; // hardcodeamos por ahora
        myEntity.weapon = this.myCurrentWeaponType;
        
        const targets: string[] = [];
        let attackX = 0;
        let attackY = 0;
        let distanceOffset = 0;
        let attackRadius = 0;

        const attack = 1;

        // SWORD ATTACK 1
        if (this.myCurrentWeaponType === 1 && myEntity.attack === 1) {

            // Configuración del área de impacto
            distanceOffset = 32; // Distancia desde el jugador hacia adelante
            attackRadius = 32;   // Radio del área de impacto
            // Calculamos el centro del ataque usando el vector lookDir
            attackX = myEntity.sprite.x + (myEntity.lookDir.x * distanceOffset);
            attackY = myEntity.sprite.y + (myEntity.lookDir.y * distanceOffset);
            
            for (const id in this.playerEntities) {
                if (id === this.room.sessionId) continue;
                const enemy = this.playerEntities[id];
                const dist = Phaser.Math.Distance.Between(attackX, attackY, enemy.sprite.x, enemy.sprite.y);
                if (dist <= attackRadius) {targets.push(id);}
            }

        }
        
        // BOW ATTACK 1
        if (this.myCurrentWeaponType === 2 && myEntity.attack === 1) {
            const arrowRange = 300; // Alcance máximo de la flecha
            const arrowWidth = 20;  // "Grosor" de la trayectoria (margen de acierto)

            let closestTargetId: string | null = null;
            let minDistance = arrowRange;

            // El origen de la flecha
            const startX = myEntity.sprite.x;
            const startY = myEntity.sprite.y;

            for (const id in this.playerEntities) {
                if (id === this.room.sessionId) continue;
                const enemy = this.playerEntities[id];

                // 1. Vector desde el jugador hacia el enemigo
                const dx = enemy.sprite.x - startX;
                const dy = enemy.sprite.y - startY;

                // 2. Proyectar el enemigo sobre la línea del vector lookDir
                // (Producto punto para saber qué tan lejos está el enemigo a lo largo de la flecha)
                const projection = dx * myEntity.lookDir.x + dy * myEntity.lookDir.y;

                // 3. Validar si el enemigo está frente a nosotros y dentro del rango
                if (projection > 0 && projection <= arrowRange) {
                    // 4. Calcular distancia perpendicular a la línea (qué tan lejos está de la trayectoria)
                    const closestX = startX + myEntity.lookDir.x * projection;
                    const closestY = startY + myEntity.lookDir.y * projection;
                    const distToLine = Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, closestX, closestY);

                    // 5. Si está dentro del "ancho" de la flecha y es el más cercano
                    if (distToLine <= arrowWidth) {
                        if (projection < minDistance) {
                            minDistance = projection;
                            closestTargetId = id;
                        }
                    }
                }
            }

            if (closestTargetId) {
                targets.push(closestTargetId);
                // La posición del impacto para el servidor será la del enemigo golpeado
                const victim = this.playerEntities[closestTargetId];
                attackX = victim.sprite.x;
                attackY = victim.sprite.y;
            } else {
                // Si no hay objetivo, el punto de impacto es el final del rango
                attackX = startX + myEntity.lookDir.x * arrowRange;
                attackY = startY + myEntity.lookDir.y * arrowRange;
            }

        }

        // WAND ATTACK 1
        if (this.myCurrentWeaponType === 3 && myEntity.attack === 1) {

            // Configuración del área de impacto
            distanceOffset = 64; // Distancia desde el jugador hacia adelante
            attackRadius = 80;   // Radio del área de impacto
            // Calculamos el centro del ataque usando el vector lookDir
            attackX = myEntity.sprite.x + (myEntity.lookDir.x * distanceOffset);
            attackY = myEntity.sprite.y + (myEntity.lookDir.y * distanceOffset);

            for (const id in this.playerEntities) {
                if (id === this.room.sessionId) continue;
                const enemy = this.playerEntities[id];
                const dist = Phaser.Math.Distance.Between(attackX, attackY, enemy.sprite.x, enemy.sprite.y);
                if (dist <= attackRadius) { targets.push(id); }
            }

        }

        // SPELL ATTACK 1
        if (this.myCurrentWeaponType === 4 && myEntity.attack === 1) {
            
            attackRadius = 100; // Radio amplio alrededor del jugador
            attackX = myEntity.sprite.x;
            attackY = myEntity.sprite.y;

            for (const id in this.playerEntities) {
                if (id === this.room.sessionId) continue;
                const enemy = this.playerEntities[id];
                const dist = Phaser.Math.Distance.Between(attackX, attackY, enemy.sprite.x, enemy.sprite.y);
                if (dist <= attackRadius) targets.push(id);
            }

        }

        // ENVÍO AL SERVIDOR
        this.room.send("attack", {weaponType: this.myCurrentWeaponType, attackNumber: attack, position: { x: Math.floor(attackX), y: Math.floor(attackY) }, direction: { x: myEntity.lookDir.x, y: myEntity.lookDir.y }, targets: targets });

        this.playAttackOnce(myEntity, {
            weaponType: this.myCurrentWeaponType,
            attackNumber: attack,
            position: { x: Math.floor(attackX), y: Math.floor(attackY) }
        });

    }

    private joystickPointer: Phaser.Input.Pointer | null = null; // Añade esta propiedad a tu clase

    private setupJoystick() {

        const x = 120;
        const margin = 120;
        const y = window.innerHeight - 120;
        const xAttack = window.innerWidth - margin;
        
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.key1Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
        this.key2Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
        this.key3Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
        this.key4Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);
        this.joystickBase = this.add.circle(x, y, 60, 0xffffff, 0.2).setScrollFactor(0).setDepth(10000);
        this.joystickThumb = this.add.circle(x, y, 30, 0xffffff, 0.5).setScrollFactor(0).setDepth(10001);
        
        // --- BOTÓN DE ATAQUE ---
        this.attackButton = this.add.circle(xAttack, y, 50, 0xff0000, 0.3)
            .setScrollFactor(0).setDepth(10000)
            .setInteractive();

        this.attackText = this.add.text(xAttack, y, 'ATK', {fontSize: '20px', color: '#fff'}).setOrigin(0.5).setScrollFactor(0).setDepth(10001);

        this.attackButton.on('pointerdown', () => {
            this.handleAttack();
            this.attackButton?.setFillStyle(0xff0000, 0.6);
        });
        this.attackButton.on('pointerup', () => {
            this.attackButton?.setFillStyle(0xff0000, 0.3);
        });


        // --- BOTÓN DE CAMBIO DE ARMA ---
        const xWeapon = window.innerWidth - 70; // Un poco más a la derecha que el de ataque
        const yWeapon = window.innerHeight - 220; // Por encima del botón de ataque

        this.weaponButton = this.add.circle(xWeapon, yWeapon, 35, 0x00ff00, 0.3).setScrollFactor(0).setDepth(10000).setInteractive();

        this.weaponLabel = this.add.text(xWeapon, yWeapon, 'NONE', {fontSize: '16px', color: '#fff', fontStyle: 'bold'}).setOrigin(0.5).setScrollFactor(0).setDepth(10001);

        this.weaponButton.on('pointerdown', () => {
            // 1. Ciclar el valor localmente (0 -> 1 -> 2 -> 3 -> 4 -> 0)
            this.myCurrentWeaponType = (this.myCurrentWeaponType + 1) % 5;

            // 2. Actualizar el texto del botón
            const names = ['NONE', 'SWORD', 'BOW', 'WAND', 'SPELL'];
            this.weaponLabel.setText(names[this.myCurrentWeaponType]);
            
            // 3. ENVIAR AL SERVIDOR para que todos vean el cambio
            // Asegúrate de tener un mensaje "changeWeapon" en tu servidor
            this.room.send("changeWeapon", { weapon: this.myCurrentWeaponType });

            // Feedback visual al tocar
            this.weaponButton.setFillStyle(0x00ff00, 0.6);
        });

        this.weaponButton.on('pointerup', () => {
            this.weaponButton.setFillStyle(0x00ff00, 0.3);
        });

        // --- LÓGICA DE MULTITOUCH PARA JOYSTICK ---
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            // Si el toque es en la derecha, ignoramos (es para el botón de ataque)
            if (p.x > window.innerWidth / 2) return;

            if (Phaser.Math.Distance.Between(p.x, p.y, x, y) < 80) {
                this.isDragging = true;
                this.joystickPointer = p; // <--- Guardamos qué dedo mueve el joystick
            }
        });

        this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
            // Solo movemos el joystick si el puntero que lo mueve es el mismo que empezó
            if (!this.isDragging || this.joystickPointer?.id !== p.id) return;

            const angle = Phaser.Math.Angle.Between(x, y, p.x, p.y);
            const dist = Math.min(Phaser.Math.Distance.Between(x, y, p.x, p.y), 50);

            if (this.joystickThumb) {
                this.joystickThumb.x = x + Math.cos(angle) * dist;
                this.joystickThumb.y = y + Math.sin(angle) * dist;
            }
        });

        this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
            // Solo soltamos el joystick si el dedo que se levanta es el del joystick
            if (this.joystickPointer?.id === p.id) {
                this.isDragging = false;
                this.joystickPointer = null;
                if (this.joystickThumb) {
                    this.joystickThumb.x = x;
                    this.joystickThumb.y = y;
                }
            }
        });
    }

    private addPlayer(data: any, sessionId: string) {
        // 3. Obtenemos el ID del character y asignamos su textura
        const charId = data.character || 1;
        const sprite = this.physics.add.sprite(data.x, data.y, `char_${charId}`);

        sprite.setScale(3); 
        sprite.setDepth(sprite.y); 

        const hitboxW = 8;
        const hitboxH = 8;

        const offsetX = (32 - hitboxW) / 2; // Centrado automático
        const offsetY = 16; // Empujamos el hitbox hacia la base del sprite

        sprite.body?.setSize(hitboxW, hitboxH);
        sprite.body?.setOffset(offsetX, offsetY);

        if (this.collisionLayer) this.physics.add.collider(sprite, this.collisionLayer);
   
        const label = this.add.text(data.x, data.y - 40, data.name, {
            fontSize: '14px', backgroundColor: 'rgba(96, 96, 96, 0.24)'
        }).setOrigin(0.5);
        
        label.setDepth(2);

        // 4. Guardamos el characterId para saber qué animación llamar después
        this.playerEntities[sessionId] = { sprite, label, characterId: charId, serverX: data.x, serverY: data.y, hp: data.hp, isMoving: false, isDead: false, lookDir: { x: 0, y: 1 }};
        if (sessionId === this.room.sessionId) this.cameras.main.startFollow(sprite, true, 0.1, 0.1);
        
    }

    private updatePlayer(data: any, sessionId: string) {
        const entity = this.playerEntities[sessionId];
        if (!entity) return;

        // --- DETECCIÓN DE DAÑO ---
        if (data.hp !== undefined && data.hp < entity.hp) {
            const damageTaken = entity.hp - data.hp;
            this.showDamageText(entity.sprite.x, entity.sprite.y, damageTaken);

        }

        // --- DETECCIÓN DE MUERTE ---
        if (data.hp !== undefined && data.hp <= 0 && entity.hp > 0) {
            this.handleDeath(entity, sessionId);
        }

        entity.hp = data.hp;
        entity.weapon = data.weapon;
        entity.lookDir.x = data.lookx;
        entity.lookDir.y = data.looky;

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

        const myState = this.room.state.players.get(myId);
        if (myState) {
            if (myState.hp < myEntity.hp) this.showDamageText(myEntity.sprite.x, myEntity.sprite.y, myEntity.hp - myState.hp);
            if (myState.hp <= 0 && myEntity.hp > 0) {
                this.handleDeath(myEntity, myId);
            }
            myEntity.weapon = myState.weapon;
            myEntity.hp = myState.hp;
        }

        // --- ATAQUE POR TECLADO ---
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.handleAttack();
            this.attackButton?.setFillStyle(0xff0000, 0.6);
            this.time.delayedCall(100, () => {this.attackButton?.setFillStyle(0xff0000, 0.3);});
        }
        if (Phaser.Input.Keyboard.JustDown(this.key1Key)) {
            this.myCurrentWeaponType = 1;
            this.weaponLabel?.setText('SWORD');
            this.room.send("changeWeapon", { weapon: this.myCurrentWeaponType });
        }
        if (Phaser.Input.Keyboard.JustDown(this.key2Key)) {
            this.myCurrentWeaponType = 2;
            this.weaponLabel?.setText('BOW');
            this.room.send("changeWeapon", { weapon: this.myCurrentWeaponType });
        }
        if (Phaser.Input.Keyboard.JustDown(this.key3Key)) {
            this.myCurrentWeaponType = 3;
            this.weaponLabel?.setText('WAND');
            this.room.send("changeWeapon", { weapon: this.myCurrentWeaponType });
        }
        if (Phaser.Input.Keyboard.JustDown(this.key4Key)) {
            this.myCurrentWeaponType = 4;
            this.weaponLabel?.setText('SPELL');
            this.room.send("changeWeapon", { weapon: this.myCurrentWeaponType });
        }


        // Actualizar el valor numérico del HP en la UI
        if (this.hpText) this.hpText.setText(`❤ ${myEntity.hp}`);

        // Obtenemos el tipo de ataque directamente del estado del servidor para este frame

        let dx = 0;
        let dy = 0;
        let moved = false;
        const speed = 4;

        // Lógica de entrada (Joystick o Teclado)
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

        // 1. LA FÍSICA NO SE DETIENE: El personaje se mueve aunque ataque
        myEntity.sprite.body.setVelocity(dx * speed * 60, dy * speed * 60);

        if (moved) {
            // Normalizamos el vector para tener una dirección pura
            const len = Math.sqrt(dx * dx + dy * dy);
            myEntity.lookDir.x = dx / len;
            myEntity.lookDir.y = dy / len;
        }

        // 2. LA ANIMACIÓN
        myEntity.sprite.setDepth(myEntity.sprite.y);
        myEntity.label.setDepth(myEntity.sprite.y + 1);

        this.updatePlayerAnimation(myEntity, dx, dy);
        myEntity.label.setPosition(myEntity.sprite.x, myEntity.sprite.y - 55);

        // Envío de posición al servidor
        this.moveTimer += delta;
        if (this.moveTimer >= this.SEND_RATE) {
            this.room.send("move", {
                x: Math.floor(myEntity.sprite.x), 
                y: Math.floor(myEntity.sprite.y),
                direction: myEntity.currentDir || 'down',
                lookx: myEntity.lookDir.x,
                looky: myEntity.lookDir.y,
            });
            this.moveTimer = 0;
        }

        // --- OTROS JUGADORES ---
        for (const id in this.playerEntities) {

            if (id === myId) continue;
            
            const entity = this.playerEntities[id];
            const pData = this.room.state.players.get(id);
            if (pData) entity.weapon = pData.weapon;
            const diffX = entity.serverX - entity.sprite.x;
            const diffY = entity.serverY - entity.sprite.y;
            const STOP_EPSILON = 1;
            entity.isMoving = Math.abs(diffX) > STOP_EPSILON || Math.abs(diffY) > STOP_EPSILON;

            // Animación desacoplada de la interpolación
            this.updatePlayerAnimation(
                entity,
                entity.isMoving ? diffX : 0,
                entity.isMoving ? diffY : 0,
            );

            if (entity.isMoving) {
                entity.sprite.x = Phaser.Math.Linear(entity.sprite.x, entity.serverX, 0.15);
                entity.sprite.y = Phaser.Math.Linear(entity.sprite.y, entity.serverY, 0.15);
            } else {
                entity.sprite.x = entity.serverX;
                entity.sprite.y = entity.serverY;
            }
            entity.sprite.setDepth(entity.sprite.y);
            entity.label.setDepth(entity.sprite.y + 1);

            entity.label.setPosition(entity.sprite.x, entity.sprite.y - 55);
        }
    }
    private showDeathScreen() {
        const { width, height } = this.scale;

        // 🕶 overlay oscuro
        this.deathOverlay = this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x000000,
            0.6
        )
            .setScrollFactor(0)
            .setDepth(9998);

        this.deathButton = this.add.text(
            width / 2,
            height / 2,
            'VOLVER',
            {
                fontSize: '32px',
                color: '#ffffff',
                backgroundColor: '#222222',
                padding: { x: 24, y: 14 },
            }
        )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(9999)
            .setInteractive({ useHandCursor: true });

        // hover feedback
        this.deathButton.on('pointerover', () => {
            this.deathButton?.setStyle({ backgroundColor: '#444444' });
        });

        this.deathButton.on('pointerout', () => {
            this.deathButton?.setStyle({ backgroundColor: '#222222' });
        });

        // click → salir del juego
        this.deathButton.on('pointerdown', () => {
            window.dispatchEvent(new Event('exit-game'));
        });
    }

    private exitGame() {
        window.dispatchEvent(new Event('exit-game'));
    }
}
