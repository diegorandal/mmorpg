import type { FlagRoomState } from '@/app/(protected)/home/FlagState';
import { PortalType } from '@/app/(protected)/home/Portal';
import { Room } from "@colyseus/sdk";

export class PortalsConstellation {

    private state: FlagRoomState;
    private scene: Phaser.Scene;
    private graphics: Phaser.GameObjects.Graphics;
    private size: number;
    private worldWidth: number;
    private worldHeight: number;

    constructor(
        state: FlagRoomState,
        scene: Phaser.Scene,
        x: number,
        y: number,
        size: number,
        worldWidth: number,
        worldHeight: number
    ) {
        this.state = state;
        this.scene = scene;
        this.size = size;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;

        this.graphics = scene.add.graphics();
        this.graphics.setScrollFactor(0); // fijo en UI
        this.graphics.setDepth(1000);
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

        // líneas
        this.state.portals.forEach(portal => {
            if (portal.type === PortalType.TELEPORT && portal.targetPortalId){
                const target = this.state.portals.get(portal.targetPortalId);
                if (target) {
                    const a = this.normalize(portal.x, portal.y);
                    const b = this.normalize(this.state.portals.get(portal.targetPortalId).x, this.state.portals.get(portal.targetPortalId).y);
                    this.graphics.lineStyle(1, 0x6a5acd, 0.5);
                    this.graphics.strokeLineShape(new Phaser.Geom.Line(a.x, a.y, b.x, b.y));
                }
            }
        });

        // círculos
        this.state.portals.forEach(portal => {
            const pos = this.normalize(portal.x, portal.y);
            const color = portal.type === PortalType.TELEPORT ? 0x6a5acd : 0xff4444;
            this.graphics.fillStyle(color, 0.5);
            this.graphics.fillCircle(pos.x, pos.y, 2.5);
        });

    }
}
