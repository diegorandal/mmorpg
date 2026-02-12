// systems/MovementSystem.ts
import Phaser from "phaser";
import { Room } from "@colyseus/sdk";
import type { MyRoomState } from "@/app/(protected)/home/PlayerState";

interface MovementContext {
    scene: Phaser.Scene;
    room: Room<MyRoomState>;
    playerEntities: { [id: string]: any };
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    joystickBase?: Phaser.GameObjects.Arc;
    joystickThumb?: Phaser.GameObjects.Arc;
    isDragging: boolean;
    sendRate: number;
    moveTimer: number;
    updatePlayerAnimation: (entity: any, dx: number, dy: number) => void;
    updateHealthBar: (id: string) => void;
    updateAura: (entity: any) => void;
}

export class MovementSystem {

    private ctx: MovementContext;

    constructor(ctx: MovementContext) {
        this.ctx = ctx;
    }

    update(delta: number) {

        const {
            room,
            playerEntities,
            cursors,
            joystickBase,
            joystickThumb,
            isDragging,
            sendRate,
            updatePlayerAnimation,
            updateHealthBar,
            updateAura
        } = this.ctx;

        if (!room) return;

        const myId = room.sessionId;
        const myEntity = playerEntities[myId];
        if (!myEntity) return;

        let dx = 0;
        let dy = 0;
        let moved = false;
        const speed = 4;

        // 🎮 INPUT
        if (isDragging && joystickThumb && joystickBase) {
            dx = (joystickThumb.x - joystickBase.x) / 50;
            dy = (joystickThumb.y - joystickBase.y) / 50;
            moved = Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1;
        } else {
            if (cursors.left.isDown) dx = -1;
            else if (cursors.right.isDown) dx = 1;

            if (cursors.up.isDown) dy = -1;
            else if (cursors.down.isDown) dy = 1;

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

        updatePlayerAnimation(myEntity, dx, dy);

        myEntity.label.setPosition(myEntity.sprite.x, myEntity.sprite.y - 55);

        updateHealthBar(myId);
        updateAura(myEntity);

        // 📡 ENVÍO AL SERVER
        this.ctx.moveTimer += delta;

        if (this.ctx.moveTimer >= sendRate) {
            room.send("move", {
                x: Math.floor(myEntity.sprite.x),
                y: Math.floor(myEntity.sprite.y),
                direction: myEntity.currentDir || 'down',
                lookx: myEntity.lookDir.x,
                looky: myEntity.lookDir.y,
            });

            this.ctx.moveTimer = 0;
        }

        // 👥 OTROS JUGADORES (Interpolación)
        for (const id in playerEntities) {

            if (id === myId) continue;

            const entity = playerEntities[id];

            const diffX = entity.serverX - entity.sprite.x;
            const diffY = entity.serverY - entity.sprite.y;

            const STOP_EPSILON = 1;
            entity.isMoving = Math.abs(diffX) > STOP_EPSILON || Math.abs(diffY) > STOP_EPSILON;

            updatePlayerAnimation(
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

            updateHealthBar(id);
        }
    }
}