import { PortalType } from '@/app/(protected)/home/Portal';
import { Room } from "@colyseus/sdk";
import { FlagScene } from '../FlagScene';
import { MainScene } from '../MainScene';

export class PortalSystem {

    private room: Room;
    private scene: FlagScene | MainScene;
    private graphics: Phaser.GameObjects.Graphics;
    private size: number;
    private worldWidth: number;
    private worldHeight: number;
    private portalCheckCooldown = 0;

    constructor(
        room: Room,
        scene: FlagScene | MainScene,
        x: number,
        y: number,
        size: number,
        worldWidth: number,
        worldHeight: number
    ) {
        this.room = room;
        this.scene = scene;
        this.size = size;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;

        this.graphics = scene.add.graphics();
        this.graphics.setScrollFactor(0); // fijo en UI
        this.graphics.setDepth(10000);
        this.graphics.setPosition(x, y);
    }

    private normalize(x: number, y: number) {
        return {
            x: (x / this.worldWidth) * this.size,
            y: (y / this.worldHeight) * this.size
        };
    }

    public draw() {
        this.graphics.clear();

        // 1. Obtener solo los portales de tipo EXIT que estén activos
        const exitPortals = [];
        this.room.state.portals.forEach(portal => {
            if (portal.type === PortalType.EXIT && portal.active) {
                exitPortals.push(portal);
            }
        });

        // 2. Dibujar líneas consecutivas entre los EXIT
        if (exitPortals.length > 1) {
            this.graphics.lineStyle(1, 0xff4444, 0.5); // Color rojo para los EXIT

            for (let i = 0; i < exitPortals.length; i++) {
                const current = exitPortals[i];
                // El siguiente es i + 1, pero si es el último, volvemos al 0 (módulo %)
                const next = exitPortals[(i + 1) % exitPortals.length];
                const a = this.normalize(current.x, current.y);
                const b = this.normalize(next.x, next.y);

                this.graphics.strokeLineShape(new Phaser.Geom.Line(a.x, a.y, b.x, b.y));
            }
        }

        // --- Tu lógica anterior de TELEPORTS (Líneas) ---
        this.room.state.portals.forEach(portal => {
            if (portal.type === PortalType.TELEPORT && portal.targetPortalId && portal.active) {
                const target = this.room.state.portals.get(portal.targetPortalId);
                if (target) {
                    const a = this.normalize(portal.x, portal.y);
                    const b = this.normalize(target.x, target.y);
                    this.graphics.lineStyle(1, 0x6a5acd, 0.5);
                    this.graphics.strokeLineShape(new Phaser.Geom.Line(a.x, a.y, b.x, b.y));
                }
            }
        });

        // --- Tu lógica anterior de Círculos ---
        this.room.state.portals.forEach(portal => {
            if (!portal.active) return;
            const pos = this.normalize(portal.x, portal.y);
            const color = portal.type === PortalType.TELEPORT ? 0x6a5acd : 0xff4444;
            this.graphics.fillStyle(color, 0.5);
            this.graphics.fillCircle(pos.x, pos.y, 4);
        });
    }

    addPortal(portal: any, id: string) {

        const container = this.scene.add.container(portal.x, portal.y);
        container.setDepth(2);
        const graphics = this.scene.add.graphics();
        graphics.setBlendMode(Phaser.BlendModes.ADD);
        container.add(graphics);
        const color = portal.type === 'exit' ? 0xff4444 : 0x6a5acd; 
        this.drawPortal(graphics, color); // Dibujar por primera vez
        container.setData("type", portal.type); // Guardamos el tipo actual para detectar cambios futuros

        // Animaciones
        this.scene.tweens.add({targets: container, angle: 360, duration: 2000, repeat: -1, ease: "Linear"});
        this.scene.tweens.add({targets: graphics, scale: 1.1, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut"});
        
        this.scene.portalEntities[id] = container;

        // Si el portal empieza inactivo, lo ocultamos de golpe
        if (!portal.active) {
            container.setVisible(false);
            container.setScale(0);
        }

    }

    updatePortalVisual(portal: any, id: string) {
        const container = this.scene.portalEntities[id];
        if (!container) return;
        const graphics = container.list[0] as Phaser.GameObjects.Graphics;
        const color = portal.type === "exit" ? 0xff4444 : 0x6a5acd;

        // 2. Lógica para APAGAR
        if (container.visible && !portal.active) {
            // NO usamos killTweensOf para no matar el giro (angle)
            this.scene.tweens.add({
                targets: container,
                scale: 0,
                duration: 500,
                ease: "Back.in",
                overwrite: true, // Esto detiene otros tweens de SCALE, pero deja el de ANGLE vivo
                onComplete: () => {
                    container.setVisible(false);
                },
            });
        }

        // 3. Lógica para ENCENDER
        if (!container.visible && portal.active) {

            // 1. Si cambió el tipo, redibujamos (esto no afecta animaciones)
            if (container.getData("type") !== portal.type) {
                container.setData("type", portal.type);
                this.drawPortal(graphics, color);
            }

            container.setVisible(true);
            // Empezamos desde escala 0 para que el efecto "Back.out" se vea bien
            container.setScale(0);

            this.scene.tweens.add({
                targets: container,
                scale: 1,
                duration: 500,
                ease: "Back.out",
                overwrite: true, // Esto asegura que si se estaba apagando, ahora se encienda limpiamente
            });
        }
    

        // Si no cambió el tipo → no redibujamos

        /*

        const container = this.scene.portalEntities[id];
        if (!container) return;
        container.setVisible(portal.active);
        // Si no cambió el tipo → no redibujamos
        if (container.getData("type") === portal.type) return;
        container.setData("type", portal.type);
        const graphics = container.list[0] as Phaser.GameObjects.Graphics;
        if (!graphics) return;
        const color = portal.type === "exit" ? 0xff4444 : 0x6a5acd;
        this.drawPortal(graphics, color);

        */

    }

    drawPortal(graphics: Phaser.GameObjects.Graphics, color: number) {
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

    // #region checkPortalCollision
    checkPortalCollision(time: number) {

        const myId = this.room.sessionId;
        const myEntity = this.scene.playerEntities[myId];
        if (!myEntity) return;

        // Cooldown anti spam (3000ms)
        if (time < this.portalCheckCooldown) return;

        const px = myEntity.sprite.x;
        const py = myEntity.sprite.y;
        const radiusSq = 576; // 24 * 24

        let foundPortal: string | null = null;

        for (const id in this.scene.portalEntities) {
            const portal = this.scene.portalEntities[id];
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

            for (const id in this.scene.portalEntities) {
                const portal = this.scene.portalEntities[id];
                portal.setAlpha(0.5);
            }

        }

    }

}
