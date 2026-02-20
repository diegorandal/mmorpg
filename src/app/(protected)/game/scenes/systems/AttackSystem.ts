import Phaser from "phaser";
import { Room } from "@colyseus/sdk";
import type { MyRoomState } from "@/app/(protected)/home/PlayerState";

interface AttackContext {
    room: Room<MyRoomState>;
    playerEntities: any;
    myCurrentWeaponType: number;
    attackNumber: number;
    attackCooldowns: { [key: string]: number };
    attackSpeeds: { [key: string]: number };
    time: Phaser.Time.Clock;
    playAttackOnce: (entity: any, msg: any) => void;
    clearTarget?: () => void;
    currentTargetId: string;
}

export function handleAttack(ctx: AttackContext) {
    const {room, playerEntities, myCurrentWeaponType, attackNumber, attackCooldowns, attackSpeeds, time, playAttackOnce, clearTarget, currentTargetId} = ctx;

     if (!room || !playerEntities[room.sessionId]) return;
    const myEntity = playerEntities[room.sessionId];

    if (myCurrentWeaponType === 0) return;

    myEntity.weapon = myCurrentWeaponType;
    myEntity.attack = attackNumber;

    // cooldown local
    const key = `${myCurrentWeaponType}-${myEntity.attack}`;
    const now = time.now;
    if (!attackCooldowns[key]) attackCooldowns[key] = 0;
    if (now < attackCooldowns[key]) return;
    const cooldownTime = attackSpeeds[key] || 500; // default 500ms
    attackCooldowns[key] = now + cooldownTime;
    
    const targets: string[] = [];
    let attackX = 0;
    let attackY = 0;
    let distanceOffset = 0;
    let attackRadius = 0;

    // SWORD ATTACK 1
    if (myCurrentWeaponType === 1 && attackNumber === 1) {

        // Configuración del área de impacto
        distanceOffset = 32; // Distancia desde el jugador hacia adelante
        attackRadius = 32;   // Radio del área de impacto
        // Calculamos el centro del ataque usando el vector lookDir
        attackX = myEntity.sprite.x + (myEntity.lookDir.x * distanceOffset);
        attackY = myEntity.sprite.y + (myEntity.lookDir.y * distanceOffset);
        
        for (const id in playerEntities) {
            if (id === room.sessionId) continue;
            const enemy = playerEntities[id];
            const dist = Phaser.Math.Distance.Between(attackX, attackY, enemy.sprite.x, enemy.sprite.y);
            if (dist <= attackRadius) {targets.push(id);}
        }

    }
    
    // SWORD ATTACK 2 — ESTOCADA
    if (myCurrentWeaponType === 1 && attackNumber === 2) {

        const stabLength = 60;   // largo del rectángulo
        const stabWidth = 24;    // ancho del rectángulo

        const originX = myEntity.sprite.x;
        const originY = myEntity.sprite.y;

        const dirX = myEntity.lookDir.x;
        const dirY = myEntity.lookDir.y;

        // Seguridad: si por alguna razón lookDir es 0,0 no atacamos
        if (dirX === 0 && dirY === 0) return;

        // Ángulo real del vector de dirección
        const angle = Math.atan2(dirY, dirX);

        for (const id in playerEntities) {
            if (id === room.sessionId) continue;
            const enemy = playerEntities[id];
            // Vector jugador → enemigo
            const dx = enemy.sprite.x - originX;
            const dy = enemy.sprite.y - originY;
            // Rotamos el punto al sistema local del ataque
            const localX = dx * Math.cos(-angle) - dy * Math.sin(-angle);
            const localY = dx * Math.sin(-angle) + dy * Math.cos(-angle);
            // Rectángulo alineado al eje X positivo
            if (localX >= 0 && localX <= stabLength && Math.abs(localY) <= stabWidth / 2) targets.push(id);
        }

        // Punto final visual del ataque
        attackX = originX + dirX * stabLength;
        attackY = originY + dirY * stabLength;

    }
    
    // BOW ATTACK 1
    if (myCurrentWeaponType === 2 && attackNumber === 1) {
        const arrowRange = 300; // Alcance máximo de la flecha
        const arrowWidth = 20;  // "Grosor" de la trayectoria (margen de acierto)

        let closestTargetId: string | null = null;
        let minDistance = arrowRange;

        // El origen de la flecha
        const startX = myEntity.sprite.x;
        const startY = myEntity.sprite.y;

        for (const id in playerEntities) {
            if (id === room.sessionId) continue;
            const enemy = playerEntities[id];

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
            const victim = playerEntities[closestTargetId];
            attackX = victim.sprite.x;
            attackY = victim.sprite.y;
        } else {
            // Si no hay objetivo, el punto de impacto es el final del rango
            attackX = startX + myEntity.lookDir.x * arrowRange;
            attackY = startY + myEntity.lookDir.y * arrowRange;
        }

    }

    // BOW with TARGET (W2 A2)
    if (myCurrentWeaponType === 2 && attackNumber === 2) {
        const target = playerEntities[currentTargetId];
        // 1. Validar que el objetivo realmente existe y está vivo
        if (!currentTargetId || !target || target.isDead) return;
        // 2. Asignar datos del objetivo
        targets.push(currentTargetId);
        attackX = target.sprite.x;
        attackY = target.sprite.y;
        // 3. (Opcional) Girar al jugador hacia el objetivo antes de enviar el mensaje
        const dx = attackX - myEntity.sprite.x;
        const dy = attackY - myEntity.sprite.y;
        const angle = Math.atan2(dy, dx);
        // Esto ayuda a que la animación de disparo coincida visualmente
        myEntity.lookDir.x = Math.cos(angle);
        myEntity.lookDir.y = Math.sin(angle);
        // 4. Limpiar el apuntado
        ctx.clearTarget?.();
    }

    // WAND ATTACK 1
    if (myCurrentWeaponType === 3 && attackNumber === 1) {

        // Configuración del área de impacto
        distanceOffset = 64; // Distancia desde el jugador hacia adelante
        attackRadius = 80;   // Radio del área de impacto
        // Calculamos el centro del ataque usando el vector lookDir
        attackX = myEntity.sprite.x + (myEntity.lookDir.x * distanceOffset);
        attackY = myEntity.sprite.y + (myEntity.lookDir.y * distanceOffset);

        for (const id in playerEntities) {
            if (id === room.sessionId) continue;
            const enemy = playerEntities[id];
            const dist = Phaser.Math.Distance.Between(attackX, attackY, enemy.sprite.x, enemy.sprite.y);
            if (dist <= attackRadius) { targets.push(id); }
        }

    }

    // WAND 2 with TARGET (W3 A2)
    if (myCurrentWeaponType === 3 && attackNumber === 2) {
        const target = playerEntities[currentTargetId];
        // 1. Validar que el objetivo realmente existe y está vivo
        if (!currentTargetId || !target || target.isDead) return;
        // 2. Asignar datos del objetivo
        targets.push(currentTargetId);
        attackX = target.sprite.x;
        attackY = target.sprite.y;
        // 3. (Opcional) Girar al jugador hacia el objetivo antes de enviar el mensaje
        const dx = attackX - myEntity.sprite.x;
        const dy = attackY - myEntity.sprite.y;
        const angle = Math.atan2(dy, dx);
        // Esto ayuda a que la animación de disparo coincida visualmente
        myEntity.lookDir.x = Math.cos(angle);
        myEntity.lookDir.y = Math.sin(angle);
        // 4. Limpiar el apuntado
        ctx.clearTarget?.();
    }


    // SPELL ATTACK 1
    if (myCurrentWeaponType === 4 && attackNumber === 1) {
        
        attackRadius = 100; // Radio amplio alrededor del jugador
        attackX = myEntity.sprite.x;
        attackY = myEntity.sprite.y;

        for (const id in playerEntities) {
            if (id === room.sessionId) continue;
            const enemy = playerEntities[id];
            const dist = Phaser.Math.Distance.Between(attackX, attackY, enemy.sprite.x, enemy.sprite.y);
            if (dist <= attackRadius) targets.push(id);
        }

    }

    // ENVÍO AL SERVIDOR
    room.send("attack", { weaponType: myCurrentWeaponType, attackNumber: myEntity.attack, position: { x: Math.floor(attackX), y: Math.floor(attackY) }, direction: { x: myEntity.lookDir.x, y: myEntity.lookDir.y }, targets: targets });

    playAttackOnce(myEntity, {
        weaponType: myCurrentWeaponType,
        attackNumber: myEntity.attack,
        position: { x: Math.floor(attackX), y: Math.floor(attackY) },
        direction: { x: myEntity.lookDir.x, y: myEntity.lookDir.y }, 
        targets: targets
    });

}