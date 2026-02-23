import Phaser from 'phaser';
import { Room } from '@colyseus/sdk';
import type { MyRoomState } from '@/app/(protected)/home/PlayerState';
import { handleAttack } from "./systems/AttackSystem";
import { MovementSystem } from "./systems/MovementSystem";
import { PlayerVisualSystem } from './systems/PlayerVisualSystem';

export class MainScene extends Phaser.Scene {
    
    // #region declaraciones
    public room!: Room<MyRoomState>;
    private movementSystem!: MovementSystem;
    private visualSystem!: PlayerVisualSystem;
    public playerEntities: { [sessionId: string]: any } = {};
    public cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private collisionLayer?: Phaser.Tilemaps.TilemapLayer;
    public joystickBase?: Phaser.GameObjects.Arc;
    public joystickThumb?: Phaser.GameObjects.Arc;
    private attackArc?: Phaser.GameObjects.Graphics;
    private weaponButton?: Phaser.GameObjects.Arc;
    private weaponLabel?: Phaser.GameObjects.Text;
    private deathOverlay?: Phaser.GameObjects.Rectangle;
    private deathButton?: Phaser.GameObjects.Text;
    private spaceKey!: Phaser.Input.Keyboard.Key;
    private key1Key!: Phaser.Input.Keyboard.Key;
    private key2Key!: Phaser.Input.Keyboard.Key;
    private key3Key!: Phaser.Input.Keyboard.Key;
    private key4Key!: Phaser.Input.Keyboard.Key;
    public isDragging: boolean = false;
    public moveTimer: number = 0;
    private attackButton?: Phaser.GameObjects.Arc;
    private weapon0?: Phaser.GameObjects.Arc;
    private weapon1?: Phaser.GameObjects.Arc;
    private weapon2?: Phaser.GameObjects.Arc;
    private weapon3?: Phaser.GameObjects.Arc;
    private weapon4?: Phaser.GameObjects.Arc;
    private potion?: Phaser.GameObjects.Arc;
    private weapon0Text?: Phaser.GameObjects.Text;
    private weapon1Text?: Phaser.GameObjects.Text;
    private weapon2Text?: Phaser.GameObjects.Text;
    private weapon3Text?: Phaser.GameObjects.Text;
    private weapon4Text?: Phaser.GameObjects.Text;
    private potionText?: Phaser.GameObjects.Text;
    private attackDragStartX = 0;
    private attackDragStartY = 0;
    private attackDragSelect = 1;
    public joystickPointerId: number | null = null;
    private attackPointerId: number | null = null;
    public isJoystickDragging = false;
    private weaponSelectorRing?: Phaser.GameObjects.Arc;
    private currentTargetId: string | null = null;
    private targetCircle?: Phaser.GameObjects.Arc;
    private myCurrentWeaponType: number = 0;
    public readonly SEND_RATE = 100;
    private potText?: Phaser.GameObjects.Text;
    private hpText?: Phaser.GameObjects.Text;
    private playersText?: Phaser.GameObjects.Text;
    private attackCooldowns: { [key: string]: number } = {};
    private attackSpeeds: { [key: string]: number } = {
        "1-1": 250,
        "2-1": 250,
        "3-1": 500,
        "4-1": 750,
    };
    // #endregion

    // #region preload
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

    // #region Create
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

        // hud 
        this.potText = this.add.text(this.scale.width / 2, 20, `💰 ${this.room.state.players.get(this.room.sessionId)?.pot || 0}`, { fontSize: '18px', backgroundColor: 'rgba(96, 96, 96, 0.20)', padding: { x: 10, y: 5 }, }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10000);
        this.hpText = this.add.text(20, 20, `❤ ${this.room.state.players.get(this.room.sessionId)?.hp || 0}`, {fontSize: '18px', backgroundColor: 'rgba(96, 96, 96, 0.20)', padding: { x: 10, y: 5 },}).setScrollFactor(0).setDepth(10000);
        this.playersText = this.add.text(this.scale.width - 20, 20, `👥 ${this.room.state.players.size}`, {fontSize: '18px', backgroundColor: 'rgba(96, 96, 96, 0.20)', padding: { x: 10, y: 5 }}).setOrigin(1, 0).setScrollFactor(0).setDepth(10000);

        this.setupJoystick();

        //target circle
        this.targetCircle = this.add.circle(0, 0, 25).setStrokeStyle(2, 0xff0000, 0.5).setVisible(false).setDepth(5);

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const objectsUnderPointer = this.input.hitTestPointer(pointer);
            // Si hay objetos y alguno es de la interfaz (profundidad alta), no procesamos el target
            const isUI = objectsUnderPointer.some((obj: any) => obj.depth >= 10000);
            if (isUI) return;
            // 2. Solo permitimos apuntar si tenemos el arma 2 y ataque 2
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

    }
    
    private handleDeath(entity: any, sessionId: string) {

        if (entity.isDead) return;
        entity.isDead = true;

        const dir = entity.currentDir || 'down';
        const animKey = `death-${dir}-${entity.characterId}`;

        entity.sprite.setVelocity(0, 0);
        entity.sprite.anims.play(animKey, true);

        //quitar label y hpbar
        if (!entity?.label || !entity?.hpBar) return;
        const { label, hpBar, hp } = entity;
        label?.setVisible(false);
        hpBar?.setVisible(false);
        hp?.setVisible(false);
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
        //this.attackText?.setVisible(false);
        this.joystickThumb?.setVisible(false);
        this.attackButton?.setVisible(false);
        this.weaponButton?.setVisible(false);
        this.weaponLabel?.setVisible(false);
        this.input.keyboard?.removeAllKeys(true);
        this.weapon0?.setVisible(false);
        this.weapon1?.setVisible(false);
        this.weapon2?.setVisible(false);
        this.weapon3?.setVisible(false);
        this.weapon4?.setVisible(false);
        this.potion?.setVisible(false);
        this.weapon0Text?.setVisible(false);
        this.weapon1Text?.setVisible(false);
        this.weapon2Text?.setVisible(false);
        this.weapon3Text?.setVisible(false);
        this.weapon4Text?.setVisible(false);
        this.potionText?.setVisible(false);
        this.weaponSelectorRing?.setVisible(false);
    }

    // #region Inputs
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
        
        this.input.setDraggable(this.attackButton);

        //this.attackText = this.add.text(xAttack, y, 'ATK', {fontSize: '20px', color: '#fff'}).setOrigin(0.5).setScrollFactor(0).setDepth(10001);

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

            this.updateAttackArc();

        });
        
        this.attackButton.on('dragend', (pointer: Phaser.Input.Pointer) => {
            if (pointer.id !== this.attackPointerId) return;
            this.attackPointerId = null;
            this.attackButton?.setFillStyle(0xff0000, 0.3);
            this.isDragging = false;
            //this.attackText?.setText('ATK' + this.attackDragSelect);
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

        this.attackArc = this.add.graphics().setScrollFactor(0).setDepth(10002);

        // --- Botones seleccion weapon y pocion ---

        const ax = this.attackButton.x;
        const ay = this.attackButton.y;
        const r = 70; // distancia desde boton ataque
        const wsize = 30; // tamaño del botón

        this.weapon0 = this.add.circle(ax + r, ay - r, wsize, 0xffffff, 0.3).setScrollFactor(0).setInteractive().setDepth(10002);
        this.weapon1 = this.add.circle(ax + (r * 1.31), ay, wsize, 0xffffff, 0.3).setScrollFactor(0).setInteractive().setDepth(10002);
        this.weapon2 = this.add.circle(ax + r, ay + r, wsize, 0xffffff, 0.3).setScrollFactor(0).setInteractive().setDepth(10002);
        this.weapon3 = this.add.circle(ax, ay + (r * 1.31), wsize, 0xffffff, 0.3).setScrollFactor(0).setInteractive().setDepth(10002);
        this.weapon4 = this.add.circle(ax - r, ay + r, wsize, 0xffffff, 0.3).setScrollFactor(0).setInteractive().setDepth(10002);
        this.potion = this.add.circle(35, this.weapon4.y, wsize, 0xff0000, 0.3).setScrollFactor(0).setInteractive().setDepth(10002);

        this.weapon0Text = this.add.text(this.weapon0.x, this.weapon0.y, '🏃‍♂️', { fontSize: '32px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(10002);
        this.weapon1Text = this.add.text(this.weapon1.x, this.weapon1.y, '🗡', { fontSize: '32px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(10002);
        this.weapon2Text = this.add.text(this.weapon2.x, this.weapon2.y, '🏹', { fontSize: '32px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(10002);
        this.weapon3Text = this.add.text(this.weapon3.x, this.weapon3.y, '🧙‍♂️', { fontSize: '32px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(10002);
        this.weapon4Text = this.add.text(this.weapon4.x, this.weapon4.y, '🗣', { fontSize: '32px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(10002);
        this.potionText = this.add.text(this.potion.x, this.potion.y, '♥', { fontSize: '32px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(10002);

        this.weapon0.on('pointerdown', () => this.selectWeapon(0));
        this.weapon1.on('pointerdown', () => this.selectWeapon(1));
        this.weapon2.on('pointerdown', () => this.selectWeapon(2));
        this.weapon3.on('pointerdown', () => this.selectWeapon(3));
        this.weapon4.on('pointerdown', () => this.selectWeapon(4));
        
        this.weaponSelectorRing = this.add.circle(-100, -100, wsize + 5).setStrokeStyle(4, 0xffff00, 0.4).setScrollFactor(0).setDepth(10001);

        // --- LÓGICA PARA JOYSTICK ---
        this.joystickBase.setInteractive();
        this.joystickThumb.setInteractive();     
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {

            if (pointer.x > window.innerWidth / 2) return;

            const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, x, y);

            if (dist <= 60) {
                this.joystickPointerId = pointer.id;
            }
        });
        
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {

            if (pointer.id !== this.joystickPointerId) return;

            const dx = pointer.x - x;
            const dy = pointer.y - y;

            const distance = Math.min(Math.hypot(dx, dy), 50);
            const angle = Math.atan2(dy, dx);

            this.joystickThumb.x = x + Math.cos(angle) * distance;
            this.joystickThumb.y = y + Math.sin(angle) * distance;
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {

            if (pointer.id !== this.joystickPointerId) return;

            this.joystickPointerId = null;

            this.joystickThumb.x = x;
            this.joystickThumb.y = y;
        });

    }

    private selectWeapon(type: number) {
        const buttons = [this.weapon0, this.weapon1, this.weapon2, this.weapon3, this.weapon4];
        const active = buttons[type];
        this.myCurrentWeaponType = type;
        this.weaponSelectorRing.setPosition(active.x, active.y);
        this.tweens.add({targets: this.weaponSelectorRing, scale: { from: 0.8, to: 1.05 }, duration: 50, yoyo: true});
        this.room.send("changeWeapon", { weapon: this.myCurrentWeaponType });
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

        // 4. Guardamos el characterId para saber qué animación llamar después
        this.playerEntities[sessionId] = { sprite, label, hpBar, glow,  characterId: charId, serverX: data.x, serverY: data.y, hp: data.hp, isMoving: false, isDead: false, lookDir: { x: 0, y: 1 }};
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
        if (!data.isDefending && entity.isDefending) {
            console.log('defendio ', entity.name);
        }


        // --- DETECCIÓN DE MUERTE ---
        if (data.hp !== undefined && data.hp <= 0 && entity.hp > 0) {
            this.handleDeath(entity, sessionId);
        }
        
        entity.pot = data.pot ?? entity.pot;
        this.visualSystem.updateAura(entity);

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
        if (!myEntity) return;

        const myState = this.room.state.players.get(myId);

        // 🧠 STATE SYNC (Health / Death)
        if (myState) {
            if (myState.hp < myEntity.hp) {
                this.visualSystem.showDamageText(
                    myEntity.sprite.x,
                    myEntity.sprite.y,
                    myEntity.hp - myState.hp
                );
            }

            if (myState.hp <= 0 && myEntity.hp > 0) {
                this.handleDeath(myEntity, myId);
            }

            myEntity.weapon = myState.weapon;
            myEntity.hp = myState.hp;
        }

        // ⚔ ATAQUE
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {

            handleAttack({
                room: this.room,
                playerEntities: this.playerEntities,
                attackNumber: this.attackDragSelect,
                myCurrentWeaponType: this.myCurrentWeaponType,
                attackCooldowns: this.attackCooldowns,
                attackSpeeds: this.attackSpeeds,
                time: this.time,
                playAttackOnce: this.visualSystem.playAttackOnce.bind(this.visualSystem),
                clearTarget: this.clearTarget.bind(this),
                currentTargetId: this.currentTargetId,
            });

            this.attackButton?.setFillStyle(0xff0000, 0.6);
            this.time.delayedCall(100, () => {
                this.attackButton?.setFillStyle(0xff0000, 0.3);
            });
        }

        // 🗡 CAMBIO DE ARMA
        if (Phaser.Input.Keyboard.JustDown(this.key1Key)) this.selectWeapon(1);
        if (Phaser.Input.Keyboard.JustDown(this.key2Key)) this.selectWeapon(2);
        if (Phaser.Input.Keyboard.JustDown(this.key3Key)) this.selectWeapon(3);
        if (Phaser.Input.Keyboard.JustDown(this.key4Key)) this.selectWeapon(4);
        // 🖥 UI
        if (this.hpText) this.hpText.setText(`❤ ${myEntity.hp}`);
        if (this.potText) this.potText.setText(`💰 ${myState?.pot || 0}`);
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
                    (this.myCurrentWeaponType === 3 && this.attackDragSelect === 3) ||
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
                        this.targetCircle?.setFillStyle(0xff0000, 0.25)
                    } else {
                        this.targetCircle?.setRadius(25);
                        this.targetCircle?.setFillStyle(0xff0000, 0.5)
                    }
                }

            }
        }

        // 🚶 MOVEMENT SYSTEM
        this.movementSystem.update(delta);

    }

    private updatePlayerCountUI() {
        const count = this.room.state.players.size;
        this.playersText?.setText(`👥 ${count}`);
    }


    private updateAttackArc() {

        if (!this.attackArc || !this.attackButton) return;
        this.attackArc.clear();
        const centerX = this.attackButton.x;
        const centerY = this.attackButton.y;
        const radius = 50;
        const quarter = Math.PI / 2;
        let startAngle = 0;
        switch (this.attackDragSelect) {
            case 1: startAngle = -Math.PI * 3 / 4; break;
            case 2: startAngle = Math.PI * 3 / 4; break;
            case 3: startAngle = -Math.PI / 4; break;
            case 4: startAngle = Math.PI / 4; break;
            default: return;
        }

        this.attackArc.fillStyle(0xff5555, 0.4).beginPath().moveTo(centerX, centerY);
        this.attackArc.arc(centerX, centerY, radius, startAngle, startAngle + quarter, false);
        this.attackArc.closePath().fillPath();

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
                console.log(`Target: ${entity.label.text}`);
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

        // 🕶 overlay oscuro
        this.deathOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setScrollFactor(0).setDepth(10009);

        this.deathButton = this.add.text(
            width / 2, height / 2, 'VOLVER',
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

}
