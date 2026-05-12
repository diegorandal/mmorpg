import Phaser from "phaser";
import { MainScene } from "../MainScene";
import { FlagScene } from "../FlagScene";
import { PlayerVisualSystem } from "./PlayerVisualSystem";

export class MovementSystem {

    constructor(
        private scene: MainScene | FlagScene,
        private visualSystem: PlayerVisualSystem
    ) { }

    update(delta: number) {
        const room = this.scene.room;
        const myId = room.sessionId;
        const myEntity = this.scene.playerEntities[myId];
        if (!myEntity || myEntity.isDead) return;

        let currentSpeed = 3.84;
        if (this.scene.myCurrentWeaponType !== 0) currentSpeed = 3.2;

        let dx = 0;
        let dy = 0;
        let moved = false;
        const maxRadius = 50;

        // 🕹️ LÓGICA DE INPUT (Joystick)
        if (this.scene.joystickPointerId !== null && this.scene.joystickThumb && this.scene.joystickBase) {
            const rawDx = this.scene.joystickThumb.x - this.scene.joystickBase.x;
            const rawDy = this.scene.joystickThumb.y - this.scene.joystickBase.y;
            dx = rawDx / maxRadius;
            dy = rawDy / maxRadius;
            const magnitude = Math.hypot(dx, dy);
            if (magnitude < 0.1) {
                dx = 0; dy = 0;
            } else {
                const clamped = Math.min(magnitude, 1);
                dx = (dx / magnitude) * clamped;
                dy = (dy / magnitude) * clamped;
            }
            moved = dx !== 0 || dy !== 0;
        } 

        // 🧱 FÍSICA: Ahora aplicamos velocidad al BODY del CONTAINER
        const myBody = myEntity.container.body as Phaser.Physics.Arcade.Body;
        myBody.setVelocity(dx * currentSpeed * 60, dy * currentSpeed * 60);

        if (moved) {
            const len = Math.sqrt(dx * dx + dy * dy);
            myEntity.lookDir.x = dx / len;
            myEntity.lookDir.y = dy / len;
        }

        // Ya no necesitamos setPosition para el label o hpBar porque son hijos del container
        myEntity.container.setDepth(myEntity.container.y);
        this.visualSystem.updatePlayerAnimation(myEntity, dx, dy);
        this.visualSystem.updateHealthBar(myEntity);
        this.visualSystem.updateAura(myEntity);
        this.visualSystem.updateDefenceCircle(myEntity);

        // 📡 ENVÍO AL SERVER
        this.scene.moveTimer += delta;
        if (this.scene.moveTimer >= this.scene.SEND_RATE) {
            this.scene.room.send("move", {
                x: Math.floor(myEntity.container.x), // Coordenada del container
                y: Math.floor(myEntity.container.y),
                direction: myEntity.currentDir || 'down',
                lookx: myEntity.lookDir.x,
                looky: myEntity.lookDir.y,
            });
            this.scene.moveTimer = 0;
        }

        // 👥 OTROS JUGADORES (Interpolación)
        for (const id in this.scene.playerEntities) {
            if (id === myId) continue;
            const entity = this.scene.playerEntities[id];
            if (entity.isDead) continue;

            // Interpolamos la posición del CONTAINER
            const diffX = entity.serverX - entity.container.x;
            const diffY = entity.serverY - entity.container.y;

            const STOP_EPSILON = 1;
            entity.isMoving = Math.abs(diffX) > STOP_EPSILON || Math.abs(diffY) > STOP_EPSILON;

            this.visualSystem.updatePlayerAnimation(
                entity,
                entity.isMoving ? diffX : 0,
                entity.isMoving ? diffY : 0,
            );

            if (entity.isMoving) {
                entity.container.x = Phaser.Math.Linear(entity.container.x, entity.serverX, 0.4);
                entity.container.y = Phaser.Math.Linear(entity.container.y, entity.serverY, 0.4);
            } else {
                entity.container.x = entity.serverX;
                entity.container.y = entity.serverY;
            }

            entity.container.setDepth(entity.container.y);
            this.visualSystem.updateHealthBar(entity);
            this.visualSystem.updateDefenceCircle(entity);
        }
    }
}