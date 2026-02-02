import Phaser from 'phaser';
import { Room } from '@colyseus/sdk';
// Importamos solo como tipo para TS, no dependemos de su lógica interna
import type { MyRoomState } from '@/app/(protected)/home/PlayerState';

export class MainScene extends Phaser.Scene {
    private room!: Room<MyRoomState>;
    private playerEntities: { [sessionId: string]: any } = {};
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    create(): void {
        const roomInstance = this.registry.get('room') as Room<MyRoomState>;
        this.room = roomInstance;
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Escuchamos CUALQUIER cambio en el estado
        this.room.onStateChange((state) => {
            // Convertimos el mapa de jugadores a un objeto plano de JS
            // Esto elimina la dependencia de onAdd/onChange
            const playersData = state.players.toJSON();

            // 1. Sincronizar jugadores existentes y nuevos
            for (const sessionId in playersData) {
                const data = playersData[sessionId];

                if (!this.playerEntities[sessionId]) {
                    this.addPlayer(data, sessionId);
                } else {
                    this.updatePlayer(data, sessionId);
                }
            }

            // 2. Eliminar jugadores que ya no están en el JSON
            for (const sessionId in this.playerEntities) {
                if (!playersData[sessionId]) {
                    this.removePlayer(sessionId);
                }
            }
        });
    }

    private addPlayer(data: any, sessionId: string) {
        const sprite = this.physics.add.sprite(data.x, data.y, 'ball');
        const label = this.add.text(data.x, data.y - 30, data.name || "...", { fontSize: '14px' }).setOrigin(0.5);

        this.playerEntities[sessionId] = {
            sprite,
            label,
            serverX: data.x,
            serverY: data.y,
            hp: data.hp
        };
    }

    private updatePlayer(data: any, sessionId: string) {
        const entity = this.playerEntities[sessionId];
        if (!entity) return;

        // Actualizamos HP, Nombre, etc.
        entity.hp = data.hp;
        if (data.name) entity.label.setText(data.name);

        // Si es un jugador remoto, guardamos posición para interpolar en el update()
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

    update(): void {
        if (!this.room) return;

        // Movimiento local (Predicción)
        const myId = this.room.sessionId;
        const myEntity = this.playerEntities[myId];
        if (myEntity) {
            let moved = false;
            if (this.cursors.left.isDown) { myEntity.sprite.x -= 5; moved = true; }
            if (this.cursors.right.isDown) { myEntity.sprite.x += 5; moved = true; }
            if (this.cursors.up.isDown) { myEntity.sprite.y -= 5; moved = true; }
            if (this.cursors.down.isDown) { myEntity.sprite.y += 5; moved = true; }

            if (moved) {
                myEntity.label.setPosition(myEntity.sprite.x, myEntity.sprite.y - 30);
                this.room.send("move", { x: Math.floor(myEntity.sprite.x), y: Math.floor(myEntity.sprite.y) });
            }
        }

        // Interpolación de remotos
        for (const id in this.playerEntities) {
            if (id === myId) continue;
            const entity = this.playerEntities[id];
            entity.sprite.x = Phaser.Math.Linear(entity.sprite.x, entity.serverX, 0.2);
            entity.sprite.y = Phaser.Math.Linear(entity.sprite.y, entity.serverY, 0.2);
            entity.label.setPosition(entity.sprite.x, entity.sprite.y - 30);
        }
    }
}