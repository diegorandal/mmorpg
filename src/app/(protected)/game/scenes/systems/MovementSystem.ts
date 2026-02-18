// systems/MovementSystem.ts
import Phaser from "phaser";
import { MainScene } from "../MainScene";
import { PlayerVisualSystem } from "./PlayerVisualSystem";

export class MovementSystem {

    constructor(
        private scene: MainScene,
        private visualSystem: PlayerVisualSystem
    ) { }

    update(delta: number) {

        const room = this.scene.room;

        const myId = room.sessionId;
        const myEntity = this.scene.playerEntities[myId];
        if (!myEntity) return;

        let dx = 0;
        let dy = 0;
        let moved = false;
        const speed = 4;

        // 🎮 INPUT
        if (this.scene.joystickPointerId !== null && this.scene.joystickThumb && this.scene.joystickBase){
            dx = (this.scene.joystickThumb.x - this.scene.joystickBase.x) / 50;
            dy = (this.scene.joystickThumb.y - this.scene.joystickBase.y) / 50;
            moved = Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1;
        } else {
            if (this.scene.cursors.left.isDown) dx = -1;
            else if (this.scene.cursors.right.isDown) dx = 1;

            if (this.scene.cursors.up.isDown) dy = -1;
            else if (this.scene.cursors.down.isDown) dy = 1;

            moved = dx !== 0 || dy !== 0;
        }

        // 🧱 FÍSICA
        myEntity.sprite.body.setVelocity(dx * speed * 60, dy * speed * 60);

        if (moved) {
            const len = Math.sqrt(dx * dx + dy * dy);
            myEntity.lookDir.x = dx / len;
            myEntity.lookDir.y = dy / len;
        }

        // 🎞 ANIMACIÓN
        myEntity.sprite.setDepth(myEntity.sprite.y);
        myEntity.label.setDepth(myEntity.sprite.y + 1);

        this.visualSystem.updatePlayerAnimation(myEntity, dx, dy);

        myEntity.label.setPosition(myEntity.sprite.x, myEntity.sprite.y - 55);

        this.visualSystem.updateHealthBar(myEntity);
        this.visualSystem.updateAura(myEntity);

        // 📡 ENVÍO AL SERVER
        this.scene.moveTimer += delta;

        if (this.scene.moveTimer >= this.scene.SEND_RATE) {
            this.scene.room.send("move", {
                x: Math.floor(myEntity.sprite.x),
                y: Math.floor(myEntity.sprite.y),
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

            const diffX = entity.serverX - entity.sprite.x;
            const diffY = entity.serverY - entity.sprite.y;

            const STOP_EPSILON = 1;
            entity.isMoving = Math.abs(diffX) > STOP_EPSILON || Math.abs(diffY) > STOP_EPSILON;

            this.visualSystem.updatePlayerAnimation(
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

            this.visualSystem.updateHealthBar(id);
        }
    }
}