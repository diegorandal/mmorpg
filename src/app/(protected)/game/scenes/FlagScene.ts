import Phaser from 'phaser';
import { Room } from '@colyseus/sdk';
import type { FlagRoomState } from '@/app/(protected)/home/FlagState';
import { handleAttack } from "./systems/AttackSystem";
import { MovementSystem } from "./systems/MovementSystem";
import { PlayerVisualSystem } from './systems/PlayerVisualSystem';

export class FlagScene extends Phaser.Scene {
    
    // #region declaraciones
    public room!: Room<FlagRoomState>;
    private movementSystem!: MovementSystem;
    private visualSystem!: PlayerVisualSystem;
    public sfx!: Phaser.Sound.BaseSound;
    public playerEntities: { [sessionId: string]: any } = {};
    private portalEntities: { [id: string]: Phaser.GameObjects.Container } = {};
    public cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private collisionLayer?: Phaser.Tilemaps.TilemapLayer;
    public joystickBase?: Phaser.GameObjects.Arc;
    public joystickThumb?: Phaser.GameObjects.Image;
    private deathOverlay?: Phaser.GameObjects.Rectangle;
    private deathButton?: Phaser.GameObjects.Text;
    public isDragging: boolean = false;
    public moveTimer: number = 0;
    private attackButton?: Phaser.GameObjects.Arc;
    private weapon0?: Phaser.GameObjects.Image;
    private weapon1?: Phaser.GameObjects.Image;
    private weapon2?: Phaser.GameObjects.Image;
    private weapon3?: Phaser.GameObjects.Image;
    private weapon4?: Phaser.GameObjects.Image;
    private potion?: Phaser.GameObjects.Image;
    private attackDragStartX = 0;
    private attackDragStartY = 0;
    private attackDragSelect = 1;
    public joystickPointerId: number | null = null;
    private attackPointerId: number | null = null;
    public isJoystickDragging = false;
    private weaponSelectorRing?: Phaser.GameObjects.Arc;
    private currentTargetId: string | null = null;
    private targetCircle?: Phaser.GameObjects.Arc;
    public myCurrentWeaponType: number = 0;
    public readonly SEND_RATE = 100;
    private potText?: Phaser.GameObjects.Text;
    private hpText?: Phaser.GameObjects.Text;
    private playersText?: Phaser.GameObjects.Text;
    private dianaText?: Phaser.GameObjects.Text;
    private attackCooldowns: { [key: string]: number } = {};
    private portalCheckCooldown = 0;
    private attackSpeeds: { [key: string]: number } = {
        "1-1": 250, "1-2": 400, "1-3": 600, // sword
        "2-1": 350, "2-2": 500, "2-3": 900, // bow
        "3-1": 450, "3-2": 550, "3-3": 800, // wand
        "4-1": 700, "4-2": 600, "4-3": 900, // spell
    };
    private directionIndicator?: Phaser.GameObjects.Triangle;
    private showDirectionIndicator: boolean = true;
    private attackButtonsUI: { [key: number]: Phaser.GameObjects.Image } = {};
    private potToShow = 0;
    public flagEntity?: Phaser.Physics.Arcade.Sprite;

    // #region preload
    preload(): void {

        //PROGRESO

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. Crear los elementos gráficos de la barra
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0xd1851f, 1);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        // 2. Crear texto de carga
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
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
        const version = "0.1.2";

        this.load.crossOrigin = 'anonymous';

        for (let i = 1; i <= 18; i++) {
            this.load.spritesheet(`char_${i}`, `${BASE_URL}/npc${i}.png?v=${version}`, {
                frameWidth: 32, // Ancho de un frame
                frameHeight: 32 // Alto de un frame
            });
        }
        this.load.spritesheet('flag', `${BASE_URL}/flag.png?v=${version}`, {frameWidth: 16, frameHeight: 16});
        this.load.image('button-attack1', `${BASE_URL}/attacks1.png?v=${version}`);
        this.load.image('button-attack2', `${BASE_URL}/attacks2.png?v=${version}`);
        this.load.image('button-attack3', `${BASE_URL}/attacks3.png?v=${version}`);
        this.load.image('button-attack4', `${BASE_URL}/attacks4.png?v=${version}`);
        this.load.image('button-joystick', `${BASE_URL}/joystick.png?v=${version}`);
        this.load.image('button-run-image', `${BASE_URL}/button_run.png?v=${version}`);
        this.load.image('button-sword-image', `${BASE_URL}/button_sword.png?v=${version}`);
        this.load.image('button-bow-image', `${BASE_URL}/button_bow.png?v=${version}`);
        this.load.image('button-wand-image', `${BASE_URL}/button_wand.png?v=${version}`);
        this.load.image('button-spell-image', `${BASE_URL}/button_spell.png?v=${version}`);
        this.load.image('button-potion-image', `${BASE_URL}/button_potion.png?v=${version}`);
        this.load.image('tileset-image', `${BASE_URL}/tileset.png?v=${version}`);
        this.load.json('mapData', `${BASE_URL}/map.json?v=${version}`);
        this.load.image('arrow', `${BASE_URL}/arrow.png?v=${version}`);
        this.load.audioSprite('sfx', `${BASE_URL}/sounds.json?v=${version}`);

    }

    // #region Create
    create(): void {

        const roomInstance = this.registry.get('room') as Room<FlagRoomState>;

        this.sfx = this.sound.addAudioSprite('sfx');

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
                    layer.setDepth(10000); // Por encima de los jugadores
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
        this.input.addPointer(3);

        this.visualSystem = new PlayerVisualSystem(this);
        this.movementSystem = new MovementSystem(this, this.visualSystem);

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

        // Animaciones para la bandera
        this.anims.create({key: 'flag-idle', frames: this.anims.generateFrameNumbers('flag', { start: 0, end: 0 }), frameRate: 1, repeat: -1});
        this.anims.create({key: 'flag-move', frames: this.anims.generateFrameNumbers('flag', { start: 1, end: 4 }), frameRate: 8, repeat: -1});

        this.room.onLeave((code) => {

            this.showDeathScreen();
            
        });

        this.room.state.players.forEach((player, sessionId) => {
            this.addPlayer(player, sessionId);
        });

        this.room.onStateChange((state) => {
            this.updatePlayerCountUI();
        });

        // 1. Escuchar eventos de ataque desde el servidor
        this.room.onMessage("playerAttack", (msg) => {
            if (msg.sessionId === this.room.sessionId) return;
            const entity = this.playerEntities[msg.sessionId];
            if (!entity || entity.isDead) return;
            this.visualSystem.playAttackOnce(entity, msg);
        });

        // 1. Escuchar teleports
        this.room.onMessage("playerTeleport", (msg) => {

            if (msg.portalType === 'exit' && msg.sessionId === this.room.sessionId) {
                const entity = this.playerEntities[msg.sessionId];
                if (entity) {entity.isDead = true;}
                this.room.leave();
                this.showDeathScreen();
                return;
            }

            const entity = this.playerEntities[msg.sessionId];
            if (!entity || entity.isDead) return;
            // Guardamos la posición de ORIGEN antes de actualizarla
            const oldX = entity.sprite.x;
            const oldY = entity.sprite.y;
            // Actualizamos a la posición de DESTINO
            entity.serverX = msg.newX;
            entity.serverY = msg.newY;
            entity.sprite.setPosition(msg.newX, msg.newY);
            const myEntity = this.playerEntities[this.room.sessionId];
            if (msg.sessionId === this.room.sessionId) { // Si soy yo: Efectos locales y sonido siempre
                this.cameras.main.shake(150, 0.025);
                navigator.vibrate(50);
                this.cameras.main.centerOn(entity.sprite.x, entity.sprite.y);
                this.playSfx("teleport");
            } else {                 // Si es otro usuario:
                this.visualSystem.playTeleportFade(entity.sprite);
                if (myEntity) {
                    // Calculamos distancia al ORIGEN (donde estaba)
                    const distOrigin = Phaser.Math.Distance.Between(myEntity.sprite.x, myEntity.sprite.y, oldX, oldY);
                    // Calculamos distancia al DESTINO (donde apareció)
                    const distDest = Phaser.Math.Distance.Between(myEntity.sprite.x, myEntity.sprite.y, msg.newX, msg.newY);
                    // Si cualquiera de los dos puntos está cerca, disparamos el sonido
                    if (distOrigin <= 1000 || distDest <= 1000) {
                        const minContextDist = Math.min(distOrigin, distDest); // Usamos la distancia más corta para calcular el volumen (para que suene más fuerte si alguna es muy cercana)
                        const volume = 1 - (minContextDist / 1000);
                        this.playSfx("teleport", { volume: Math.max(volume, 0.1) });
                    }
                }
            }

        });

        // 2. Sincronización en Tiempo Real:
        this.room.onStateChange((state) => {
            console.log('state', state.toJSON());

            // Detectar nuevos players
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
            // PORTALES Agregar nuevos y actualizar existentes
            state.portals.forEach((portal, id) => {
                if (!this.portalEntities[id]) {
                    this.addPortal(portal, id);
                } else {
                    this.updatePortalVisual(portal, id);
                }
            });
            // Eliminar los que ya no existen
            for (const id in this.portalEntities) {
                if (!state.portals.has(id)) {
                    this.portalEntities[id].destroy();
                    delete this.portalEntities[id];
                }
            }

            // Sincronización de la Bandera
            if (state.flag) {
                console.log('state.flag', state.flag);
                if (!this.flagEntity) {
                    // Crear el sprite si es la primera vez que recibimos el estado
                    this.flagEntity = this.physics.add.sprite(state.flag.x, state.flag.y, 'flag');
                    this.flagEntity.setScale(3); // Escala consistente con tus personajes
                    this.flagEntity.setOrigin(0.5, 1);
                    this.flagEntity.setDepth(10000);
                    this.flagEntity.play('flag-idle');
                    console.log('create flag', state.flag);
                } else {
                    // Actualizar posición y profundidad para el orden visual
                    // SI ALGUIEN LA TIENE O SI ESTA SUELTA:
                    if(state.flag.keeper != "") {
                        const playerKeeper = this.playerEntities[state.flag.keeper];
                        if(playerKeeper) {
                            this.flagEntity.setPosition(playerKeeper.sprite.x, playerKeeper.sprite.y);
                            this.flagEntity.setDepth(10000);
                        }
                    } else {
                        this.flagEntity.setPosition(state.flag.x, state.flag.y);
                        this.flagEntity.setDepth(state.flag.y);
                    }                

                }
            }

        });

        // #region hud 
        this.potText = this.add.text(this.scale.width / 2, 20, `💰 ${this.formatPot(this.room.state.players.get(this.room.sessionId)?.pot)}`, { fontSize: '18px', backgroundColor: 'rgba(96, 96, 96, 0.20)', padding: { x: 10, y: 5 }, }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10000);
        this.hpText = this.add.text(20, 20, `❤ ${this.room.state.players.get(this.room.sessionId)?.hp || 0}`, {fontSize: '18px', backgroundColor: 'rgba(96, 96, 96, 0.20)', padding: { x: 10, y: 5 },}).setScrollFactor(0).setDepth(10000);
        this.playersText = this.add.text(this.scale.width - 20, 20, `👥 ${this.room.state.players.size}`, {fontSize: '18px', backgroundColor: 'rgba(96, 96, 96, 0.20)', padding: { x: 10, y: 5 }}).setOrigin(1, 0).setScrollFactor(0).setDepth(10000);
        this.dianaText = this.add.text(this.scale.width - 20, 60, '🎯', { fontSize: '18px', backgroundColor: 'rgba(96, 96, 96, 0.20)', padding: { x: 10, y: 5 } }).setOrigin(1, 0).setScrollFactor(0).setDepth(10000);

        // Un triángulo pequeño que apunta al enemigo mas cercano
        this.directionIndicator = this.add.triangle(0, 0, 0, 10, 5, 0, 10, 10, 0xff0000).setVisible(false).setDepth(10010).setScrollFactor(0);

        this.setupJoystick();

        //target circle
        this.targetCircle = this.add.circle(0, 0, 25).setVisible(false).setDepth(5);

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const objectsUnderPointer = this.input.hitTestPointer(pointer);
            // Si hay objetos y alguno es de la interfaz (profundidad alta), no procesamos el target
            const isUI = objectsUnderPointer.some((obj: any) => obj.depth >= 10000);
            if (isUI) return;
            // 2. Solo permitimos apuntar si tenemos ciertos ataques
            if (this.myCurrentWeaponType === 2 && this.attackDragSelect === 2) {
                this.checkTargetSelection(pointer);
            } else if (this.myCurrentWeaponType === 2 && this.attackDragSelect === 3) {
                this.checkTargetSelection(pointer);
            } else if (this.myCurrentWeaponType === 3 && this.attackDragSelect === 2) {
                this.checkTargetSelection(pointer);
            } else if (this.myCurrentWeaponType === 4 && this.attackDragSelect === 2) {
                this.checkTargetSelection(pointer);
            }

        });

        // UI inicial
        this.selectWeapon(0);

    }
    
    private handleDeath(entity: any, sessionId: string) {

        if (entity.isDead) return;
        entity.isDead = true;

        const dir = entity.currentDir || 'down';
        const animKey = `death-${dir}-${entity.characterId}`;

        entity.sprite.setVelocity(0, 0);
        entity.sprite.anims.play(animKey, true);

        //quitar label y hpbar
        entity.label?.setVisible(false);
        entity.hpBar?.setVisible(false);

        // Opcional: que no colisione más
        entity.sprite.body.enable = false;

        //sonido
        this.playSfx("muerte");

        // Si soy yo → deshabilitar controles
        if (sessionId === this.room.sessionId) {
            this.showDeathScreen();
        }
    }

    private disableControls() {
        this.isDragging = false;
        this.joystickThumb?.setVisible(false);
        this.attackButton?.setVisible(false);
        this.attackButton?.setActive(false);
        this.input.keyboard?.removeAllKeys(true);
        this.weapon0?.setVisible(false);
        this.weapon1?.setVisible(false);
        this.weapon2?.setVisible(false);
        this.weapon3?.setVisible(false);
        this.weapon4?.setVisible(false);
        this.potion?.setVisible(false);
        this.potion?.setActive(false);
        this.weaponSelectorRing?.setVisible(false);
        Object.values(this.attackButtonsUI).forEach(img => img.setVisible(false));

    }

    // #region Inputs
    private setupJoystick() {

        const x = 120;
        const margin = 120;
        const y = window.innerHeight - 120;
        const xAttack = window.innerWidth - margin;
        const buttonAlpha = 0.85;
        
        this.joystickBase = this.add.circle(x, y, 60, 0xffffff, 0.10)
            .setScrollFactor(0)
            .setDepth(10000);

        this.joystickThumb = this.add.image(x, y, 'button-joystick')
            .setScrollFactor(0)
            .setDepth(10001)
            .setDisplaySize(64, 64) // Ajusta el tamaño según tu asset
            .setAlpha(buttonAlpha);

        // --- BOTÓN DE ATAQUE ---
        this.attackButton = this.add.circle(xAttack, y, 50, 0xffffff, 0).setScrollFactor(0).setDepth(10000).setInteractive();
        // Crear las 4 imágenes de ataque encima del botón de interacción
        for (let i = 1; i <= 4; i++) {
            this.attackButtonsUI[i] = this.add.image(xAttack, y, `button-attack${i}`)
                .setScrollFactor(0)
                .setDepth(10001) // Por encima del círculo de interacción
                .setDisplaySize(112, 112) // Ajusta el tamaño según necesites
                .setVisible(false) // Solo la primera es visible al inicio
                .setAlpha(buttonAlpha);
        }
        this.input.setDraggable(this.attackButton);

        this.attackButton.on('dragstart', (pointer: Phaser.Input.Pointer) => {
            this.attackPointerId = pointer.id;
            this.isDragging = true;
            this.attackDragStartX = pointer.x;
            this.attackDragStartY = pointer.y;
        });
 
        this.attackButton.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (pointer.id !== this.attackPointerId) return;
            const dx = pointer.x - this.attackDragStartX;
            const dy = pointer.y - this.attackDragStartY;
            const threshold = 25;
            if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
            if (Math.abs(dx) > Math.abs(dy)) {this.attackDragSelect = dx > 0 ? 3 : 2;
            } else {this.attackDragSelect = dy < 0 ? 1 : 4;}
            this.updateAttackImg();
            this.showDiana();
        });
        
        this.attackButton.on('dragend', (pointer: Phaser.Input.Pointer) => {
            if (pointer.id !== this.attackPointerId) return;
            this.attackPointerId = null;
            this.isDragging = false;
        });

        this.attackButton.on('pointerup', () => {
            handleAttack({ room: this.room,
                 playerEntities: this.playerEntities, 
                 myCurrentWeaponType: this.myCurrentWeaponType, 
                 attackNumber: this.attackDragSelect, 
                 attackCooldowns: this.attackCooldowns, 
                 attackSpeeds: this.attackSpeeds, 
                 time: this.time, 
                 playAttackOnce: this.visualSystem.playAttackOnce.bind(this.visualSystem), 
                 clearTarget: this.clearTarget.bind(this), 
                 currentTargetId: this.currentTargetId});
        });

        // --- Botones seleccion weapon y pocion ---

        const ax = this.attackButton.x;
        const ay = this.attackButton.y;
        const r = 62; // distancia desde boton ataque
        const wsize = 30; // tamaño del botón
        const targetSize = 60;

        this.weapon0 = this.add.image(ax + r, ay - r, 'button-run-image').setScrollFactor(0).setInteractive().setDepth(10002).setDisplaySize(targetSize, targetSize).setAlpha(buttonAlpha);
        this.weapon1 = this.add.image(ax + (r * 1.40), ay, 'button-sword-image').setScrollFactor(0).setInteractive().setDepth(10002).setDisplaySize(targetSize, targetSize).setAlpha(buttonAlpha);
        this.weapon2 = this.add.image(ax + r, ay + r, 'button-bow-image').setScrollFactor(0).setInteractive().setDepth(10002).setDisplaySize(targetSize, targetSize).setAlpha(buttonAlpha);
        this.weapon3 = this.add.image(ax, ay + (r * 1.40), 'button-wand-image').setScrollFactor(0).setInteractive().setDepth(10002).setDisplaySize(targetSize, targetSize).setAlpha(buttonAlpha);        
        this.weapon4 = this.add.image(ax - r, ay + r, 'button-spell-image').setScrollFactor(0).setInteractive().setDepth(10002).setDisplaySize(targetSize, targetSize).setAlpha(buttonAlpha);
        
        this.potion = this.add.image(35, this.weapon4.y, 'button-potion-image').setScrollFactor(0).setInteractive().setDepth(10002).setDisplaySize(targetSize, targetSize).setAlpha(buttonAlpha);
        this.weaponSelectorRing = this.add.circle(-100, -100, wsize + 8).setStrokeStyle(4, 0xffff00, 0.5).setScrollFactor(0).setDepth(10001);

        this.weapon0.on('pointerdown', () => this.selectWeapon(0));
        this.weapon1.on('pointerdown', () => this.selectWeapon(1));
        this.weapon2.on('pointerdown', () => this.selectWeapon(2));
        this.weapon3.on('pointerdown', () => this.selectWeapon(3));
        this.weapon4.on('pointerdown', () => this.selectWeapon(4));

        // usar pocion
        this.potion.on('pointerdown', () => {this.room.send("useItem", { item: 1 });});

        // --- LÓGICA PARA JOYSTICK ---
        this.joystickThumb.setInteractive();     
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {

            if (pointer.x > window.innerWidth / 2) return;
            const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, x, y);
            if (dist <= 60) this.joystickPointerId = pointer.id;

        });
        
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {

            if (pointer.id !== this.joystickPointerId) return;
            const dx = pointer.x - x;
            const dy = pointer.y - y;
            const distance = Math.min(Math.hypot(dx, dy), 50);
            const angle = Math.atan2(dy, dx);
            this.joystickThumb.x = x + Math.cos(angle) * distance;
            this.joystickThumb.y = y + Math.sin(angle) * distance;
            this.potion?.setVisible(false);

        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {

            if (pointer.id !== this.joystickPointerId) return;
            this.joystickPointerId = null;
            this.joystickThumb.x = x;
            this.joystickThumb.y = y;
            this.potion?.setVisible(true);

        });

    }

    private selectWeapon(type: number) {

        const buttons = [this.weapon0, this.weapon1, this.weapon2, this.weapon3, this.weapon4];
        const active = buttons[type];
        this.myCurrentWeaponType = type;
        this.weaponSelectorRing.setPosition(active.x, active.y);
        this.tweens.add({targets: this.weaponSelectorRing, scale: { from: 0.8, to: 1.05 }, duration: 50, yoyo: true});
        if(type === 0){
            for (let i = 1; i <= 4; i++) if (this.attackButtonsUI[i]) this.attackButtonsUI[i].setVisible(false);
            this.attackButton.disableInteractive();
        } else {
            for (let i = 1; i <= 4; i++) if (this.attackButtonsUI[i]) this.attackButtonsUI[i].setVisible(i === this.attackDragSelect);
            this.attackButton.setInteractive();
        }

        this.showDiana();

        this.room.send("changeWeapon", { weapon: this.myCurrentWeaponType });

    }
    private showDiana(){

        if (this.myCurrentWeaponType === 2 && this.attackDragSelect === 2) {
            this.dianaText?.setVisible(true);
        } else if (this.myCurrentWeaponType === 2 && this.attackDragSelect === 3) {
            this.dianaText?.setVisible(true);
        } else if (this.myCurrentWeaponType === 3 && this.attackDragSelect === 2) {
            this.dianaText?.setVisible(true);
        } else if (this.myCurrentWeaponType === 4 && this.attackDragSelect === 2) {
            this.dianaText?.setVisible(true);
        } else {
            this.dianaText?.setVisible(false);
        }

    }

    // #region addPlayer
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
   
        // label con el nombre del jugador
        const label = this.add.text(data.x, data.y - 40, data.name, { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
        // barra de HP )
        const hpBar = this.add.graphics();
        // aura
        const glow = sprite.postFX.addGlow(0x00aaff, 0, 0, false);
        // circulo indica defensa
        const defenceCircle = this.add.graphics();
        defenceCircle.setVisible(false);
        defenceCircle.setDepth(sprite.depth - 1);

        // 4. Guardamos el characterId para saber qué animación llamar después
        this.playerEntities[sessionId] = { sprite, label, hpBar, defenceCircle, glow,  characterId: charId, serverX: data.x, serverY: data.y, hp: data.hp, isMoving: false, isDead: false, lookDir: { x: 0, y: 1 }};
        if (sessionId === this.room.sessionId) this.cameras.main.startFollow(sprite, true, 0.1, 0.1);

    }

    // #region updatePlayer
    private updatePlayer(data: any, sessionId: string) {
        const entity = this.playerEntities[sessionId];
        if (!entity) return;

        // --- DETECCIÓN DE DAÑO ---
        if (data.hp !== undefined && data.hp < entity.hp) {
            const damageTaken = entity.hp - data.hp;
            this.visualSystem.showDamageText(entity.sprite.x, entity.sprite.y, damageTaken);
            this.visualSystem.updateHealthBar(entity);
        }
        
        // -- DEFIENDE ---
        if (entity.defence === 1 && data.defence === 2) this.visualSystem.playDefence(entity);
        // -- POCION ---
        if (data.hp !== undefined && data.hp > entity.hp) this.visualSystem.playPotion(entity);
        // --- MUERTE ---
        if (data.hp !== undefined && data.hp <= 0 && entity.hp > 0) this.handleDeath(entity, sessionId);
        // --- CAMBIA POT ---
        if (data.pot !== undefined && entity.pot !== data.pot) {
            entity.pot = data.pot;
            this.visualSystem.updateAura(entity);
        }

        entity.hp = data.hp;
        entity.weapon = data.weapon;
        entity.lookDir.x = data.lookx;
        entity.lookDir.y = data.looky;
        entity.defence = data.defence;

        if (data.name) entity.label.setText(data.name);
        if (sessionId !== this.room.sessionId) {
            entity.serverX = data.x;
            entity.serverY = data.y;
        }

        // #region DirectionIndicator
        const myId = this.room.sessionId;
        const myEntity = this.playerEntities[myId];

        if (myEntity && !myEntity.isDead && this.showDirectionIndicator) {
            let closestEnemy: any = null;
            let minDistance = Infinity;

            // 1. Buscar el jugador (enemigo) más cercano
            for (const sessionId in this.playerEntities) {
                if (sessionId === myId) continue;

                const enemy = this.playerEntities[sessionId];
                if (enemy.isDead) continue;
                // if (enemy.characterId == 8) continue; // Carandir, NPC, MAGO

                const dist = Phaser.Math.Distance.Between(
                    myEntity.sprite.x, myEntity.sprite.y,
                    enemy.sprite.x, enemy.sprite.y
                );

                if (dist < minDistance) {
                    minDistance = dist;
                    closestEnemy = enemy;
                }
            }

            // 2. Lógica del indicador
            // Si no hay nadie cerca (distancia > 1000) y encontramos a alguien
            if (minDistance > 800 && closestEnemy) {
                
                this.directionIndicator?.setVisible(true);

                // Calcular ángulo hacia el enemigo
                const angle = Phaser.Math.Angle.Between(
                    myEntity.sprite.x, myEntity.sprite.y,
                    closestEnemy.sprite.x, closestEnemy.sprite.y
                );

                // Posicionar el indicador en un círculo alrededor del centro de la pantalla
                const centerX = this.scale.width / 2;
                const centerY = this.scale.height / 2;
                const radius = 100; // Distancia desde el centro de la pantalla

                this.directionIndicator?.setPosition(
                    centerX + Math.cos(angle) * radius,
                    centerY + Math.sin(angle) * radius
                );

                // Rotar el triángulo para que apunte hacia allá
                // Sumamos 90 grados (PI/2) porque el triángulo apunta hacia arriba por defecto
                this.directionIndicator?.setRotation(angle + Math.PI / 2);
            } else {
                // Si hay alguien cerca (< 1000) o no hay nadie en el mapa, ocultamos
                this.directionIndicator?.setVisible(false);
            }
        }

    }

    // #region removePlayer
    private removePlayer(sessionId: string) {
        const entity = this.playerEntities[sessionId];
        if (entity) {
            // Si el jugador eliminado es el que tengo como target, limpio el target
            if (this.currentTargetId === sessionId) {
                this.currentTargetId = null;
                this.targetCircle?.setVisible(false);
            }
            entity.sprite.destroy();
            entity.label.destroy();
            entity.hpBar.destroy();
            entity.glow.destroy();
            delete this.playerEntities[sessionId];
        }
    }

    // #region update
    update(time: number, delta: number): void {

        if (!this.room) return;

        const myId = this.room.sessionId;
        const myEntity = this.playerEntities[myId];
        if (!myEntity || myEntity.isDead) return;

        const myState = this.room.state.players.get(myId);

        // 🧠 STATE SYNC (Health / Death)
        if (myState) {
            if (myState.hp < myEntity.hp) {
                this.visualSystem.updateHealthBar(myEntity);
                this.visualSystem.showDamageText(
                    myEntity.sprite.x,
                    myEntity.sprite.y,
                    myEntity.hp - myState.hp
                );

            }

            if(myState.hp > myEntity.hp){
                this.visualSystem.playPotion(myEntity);
            }

            if (myState.hp <= 0 && myEntity.hp > 0) {
                navigator.vibrate(100);
                this.handleDeath(myEntity, myId);
            }

            myEntity.weapon = myState.weapon;
            myEntity.hp = myState.hp;
        }

        // 🖥 UI
        
        if (this.hpText) this.hpText.setText(`❤ ${myEntity.hp}`);
        if (myState?.pot !== undefined) {
            const targetPot = myState.pot;
            // Si hay diferencia entre lo que mostramos y lo que tiene el servidor
            if (this.potToShow !== targetPot) {
                const diff = Math.abs(targetPot - this.potToShow);
                let increment = 0;
                // Lógica de 3 escalas
                if (diff > 1000) {increment = 100;} 
                else if (diff > 100) {increment = 10;} 
                else {increment = 1;}
                // Aplicamos el incremento/decremento
                if (this.potToShow < targetPot) {
                    this.potToShow = Math.min(this.potToShow + increment, targetPot);
                    this.potText?.setScale(1.2).setTint(0xffff00); // efecto 
                } else {
                    this.potToShow = Math.max(this.potToShow - increment, targetPot);
                }
                if (this.potToShow === targetPot) { // Si ya llegó al objetivo, devolvemos la escala a la normalidad
                    this.potText?.setScale(1).clearTint();
                }
                // Actualizamos el texto con el valor intermedio
                this.potText?.setText(`💰 ${this.formatPot(this.potToShow)}`);
            }
        }

        // 🎯 TARGET
        if (this.currentTargetId) {
            const target = this.playerEntities[this.currentTargetId];

            // 1. Validar que el objetivo exista y esté vivo
            if (!target || target.isDead) {
                this.currentTargetId = null;
                this.targetCircle?.setVisible(false);
            } else {
                // 2. Validar visibilidad en cámara
                const isVisible = this.cameras.main.worldView.contains(target.sprite.x, target.sprite.y);

                // 3. Validar que sigas con el arma/ataque correcto (opcional, por si cambias)
                const hasRightEquip = (this.myCurrentWeaponType === 2 && this.attackDragSelect === 2) ||
                    (this.myCurrentWeaponType === 2 && this.attackDragSelect === 3) ||
                    (this.myCurrentWeaponType === 3 && this.attackDragSelect === 2) ||
                    (this.myCurrentWeaponType === 4 && this.attackDragSelect === 2);

                if (!isVisible || !hasRightEquip) {
                    this.currentTargetId = null;
                    this.targetCircle?.setVisible(false);
                } else {
                    // 4. Actualizar posición del círculo
                    this.targetCircle?.setPosition(target.sprite.x, target.sprite.y + 10);
                    this.targetCircle?.setVisible(true);
                    // 5. W2A3 agranda circulo
                    if (this.myCurrentWeaponType === 2 && this.attackDragSelect === 3){
                        this.targetCircle?.setRadius(75);
                        this.targetCircle?.setFillStyle(0xff0000, 0.10)
                    } else {
                        this.targetCircle?.setRadius(25);
                        this.targetCircle?.setFillStyle(0xff0000, 0.10)
                    }
                }
            }
        }

        // --- PORTAL PROXIMITY CHECK ---
        this.checkPortalCollision(time);

        // 🚶 MOVEMENT SYSTEM
        this.movementSystem.update(delta);

    }

    // #region Portals

    private addPortal(portal: any, id: string) {

        const container = this.add.container(portal.x, portal.y);
        container.setDepth(2);

        const graphics = this.add.graphics();
        graphics.setBlendMode(Phaser.BlendModes.ADD);

        container.add(graphics);

        // Dibujar por primera vez
        const color = portal.type === 'exit'
            ? 0xff4444
            : 0x6a5acd;

        this.drawPortal(graphics, color);

        // Guardamos el tipo actual para detectar cambios futuros
        container.setData("type", portal.type);

        // Animaciones
        this.tweens.add({
            targets: container,
            angle: 360,
            duration: 2000,
            repeat: -1,
            ease: "Linear"
        });

        this.tweens.add({
            targets: container,
            scale: 1.1,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.portalEntities[id] = container;
    }

    private updatePortalVisual(portal: any, id: string) {

        const container = this.portalEntities[id];
        if (!container) return;
        
        container.setVisible(portal.active);

        // Si no cambió el tipo → no redibujamos
        if (container.getData("type") === portal.type) return;

        container.setData("type", portal.type);

        const graphics = container.list[0] as Phaser.GameObjects.Graphics;
        if (!graphics) return;

        const color = portal.type === "exit"
            ? 0xff4444
            : 0x6a5acd;

        this.drawPortal(graphics, color);
    }

    private drawPortal(graphics: Phaser.GameObjects.Graphics, color: number) {
        const radius = 24;
        const sides = 7;

        graphics.clear();
        graphics.fillStyle(color, 0.3);
        graphics.lineStyle(2, color, 0.5);

        graphics.beginPath();

        for (let i = 0; i < sides; i++) {
            const angle = Phaser.Math.DegToRad((360 / sides) * i - 90);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) graphics.moveTo(x, y);
            else graphics.lineTo(x, y);
        }

        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();
    }

    private checkPortalCollision(time: number) {

        const myId = this.room.sessionId;
        const myEntity = this.playerEntities[myId];
        if (!myEntity) return;

        // Cooldown anti spam (3000ms)
        if (time < this.portalCheckCooldown) return;

        const px = myEntity.sprite.x;
        const py = myEntity.sprite.y;
        const radius = 24;
        const radiusSq = radius * radius;

        let foundPortal: string | null = null;

        for (const id in this.portalEntities) {
            const portal = this.portalEntities[id];
            portal.setAlpha(1);
            const dx = px - portal.x;
            const dy = py - (portal.y - 16);
            const distSq = dx * dx + dy * dy;
            if (distSq <= radiusSq) {
                foundPortal = id;
                break;
            }
        }

        if (foundPortal) {
            this.portalCheckCooldown = time + 3000;
            this.room.send("enterPortal", { portalId: foundPortal });

            for (const id in this.portalEntities) {
                const portal = this.portalEntities[id];
                portal.setAlpha(0.5);
            }

        } 

    }

    private updatePlayerCountUI() {
        const count = this.room.state.players.size;
        this.playersText?.setText(`👥 ${count}`);
    }

    private updateAttackImg() {

        // Recorremos las 4 imágenes y solo mostramos la seleccionada
        for (let i = 1; i <= 4; i++) if (this.attackButtonsUI[i]) this.attackButtonsUI[i].setVisible(i === this.attackDragSelect);

    }

    private clearTarget(): void {
        this.currentTargetId = null;
        if (this.targetCircle) {
            this.targetCircle.setVisible(false);
        }
    }

    private checkTargetSelection(pointer: Phaser.Input.Pointer) {
        const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        let foundTarget = false;

        for (const sessionId in this.playerEntities) {
            if (sessionId === this.room.sessionId) continue; // No apuntarse a uno mismo

            const entity = this.playerEntities[sessionId];
            if (entity.isDead) continue;

            // Comprobar si el clic está dentro del sprite del jugador
            if (entity.sprite.getBounds().contains(worldPoint.x, worldPoint.y)) {
                this.currentTargetId = sessionId;
                this.targetCircle?.setVisible(true);
                foundTarget = true;
                break;
            }
        }

        // Si clicamos en el suelo (y no en un jugador), quitamos el target
        if (!foundTarget) {
            this.currentTargetId = null;
            this.targetCircle?.setVisible(false);
        }
    }

    private showDeathScreen() {

        const { width, height } = this.scale;

        this.disableControls();

        this.room.state.players.forEach((player, sessionId) => {
            this.removePlayer(sessionId);
        });

        // 🕶 overlay oscuro
        this.deathOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setScrollFactor(0).setDepth(10009);

        this.deathButton = this.add.text(
            width / 2, height / 2, 'HOME',
            { fontSize: '32px', color: '#ffffff', backgroundColor: '#222222', padding: { x: 24, y: 14 },}
        ).setOrigin(0.5).setScrollFactor(0).setDepth(10010).setInteractive({ useHandCursor: true });

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

    playSfx(sprite: string, config?: Phaser.Types.Sound.SoundConfig) {
        this.sound.playAudioSprite("sfx", sprite, config);
    }
    
    private formatPot(pot: number): string {
        return (pot / 1000000).toFixed(6);
    }

}
