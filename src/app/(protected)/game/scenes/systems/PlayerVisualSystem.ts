import Phaser from "phaser";
import { MainScene } from "../MainScene";

export class PlayerVisualSystem {

    constructor(private scene: MainScene) { }

    update() {
        // aquí podemos actualizar cosas visuales globales si hace falta
    }

    updatePlayerAnimation(entity: any, dx: number, dy: number) {
        const id = entity.characterId;
        const sprite = entity.sprite;

        if (entity.isDead) return;

        if (sprite.anims.currentAnim?.key.includes("attack") && sprite.anims.isPlaying) {
            return;
        }

        const newDir = this.getDirectionName(dx, dy);
        if (newDir) entity.currentDir = newDir;

        const dir = entity.currentDir || "down";

        const weaponType = entity.weapon || 0;
        const weaponMap: any = {
            0: "",
            1: "sword-",
            2: "bow-",
            3: "wand-",
            4: "spell-",
        };

        const weaponPrefix = weaponMap[weaponType] || "";

        const isMoving = Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1;
        const action = isMoving ? "walk" : `${weaponPrefix}idle`;

        const animKey = `${action}-${dir}-${id}`;

        if (sprite.anims.currentAnim?.key !== animKey) {
            sprite.anims.play(animKey, true);
        }
    }

    playAttackOnce(entity: any, msg: any) {
        
        const dir = entity.currentDir || "down";
        const weaponMap: any = {
            1: "sword-attack",
            2: "bow-attack",
            3: "wand-attack",
            4: "spell-attack",
        };

        const animKey = `${weaponMap[msg.weaponType]}-${dir}-${entity.characterId}`;
        entity.sprite.anims.play(animKey, true);

        // FX
        if (msg.weaponType === 1 && msg.attackNumber === 2) this.playRapierFX(entity);
        if (msg.weaponType === 2 && msg.attackNumber === 1) this.playArrowFX(entity);
        if (msg.weaponType === 3 && msg.attackNumber === 1) this.playWandFX(entity);
        if (msg.weaponType === 4 && msg.attackNumber === 1) this.playSpellFX(entity);
        
    }

    updateAura(entity: any) {
        if (!entity.glow) return;

        const pot = Math.max(entity.pot || 0, 0);
        const strength = Phaser.Math.Clamp(pot / 250, 0, 8);

        entity.glow.outerStrength = strength;
        entity.glow.innerStrength = strength * 0.5;
        entity.glow.color = 0xffffff;
    }

    updateHealthBar(entity: any) {

        if (!entity?.label || !entity?.hpBar) return;

        const { label, hpBar, hp } = entity;
        const fullWidth = label.displayWidth + 2;
        const hpPercent = Phaser.Math.Clamp(hp / 100, 0, 1);
        const currentWidth = fullWidth * hpPercent;
        const barX = label.x - fullWidth / 2;
        const barY = label.y - 6;

        hpBar.clear();

        hpBar.fillStyle(0x888888, 0.2);
        hpBar.fillRect(barX, barY, fullWidth, label.displayHeight);

        let color = 0x00ff00;
        if (hpPercent < 0.3) color = 0xff0000;
        else if (hpPercent < 0.6) color = 0xffff00;

        hpBar.fillStyle(color, 0.2);
        hpBar.fillRect(barX, barY, currentWidth, label.displayHeight);

        hpBar.setDepth(label.depth - 1);
    }

    showDamageText(x: number, y: number, amount: number) {
        const damageLabel = this.scene.add.text(
            x,
            y - 20,
            `-${amount}`,
            {
                fontSize: "20px",
                color: "#ff0000",
                fontStyle: "bold",
                stroke: "#000000",
                strokeThickness: 4,
            }
        )
            .setOrigin(0.5)
            .setDepth(3000);

        this.scene.tweens.add({
            targets: damageLabel,
            y: y - 80,
            alpha: 0,
            duration: 800,
            ease: "Cubic.out",
            onComplete: () => damageLabel.destroy(),
        });
    }
    
    private playRapierFX(entity: any) {

        const length = 80;

        const startX = entity.sprite.x;
        const startY = entity.sprite.y;

        const endX = startX + entity.lookDir.x * length;
        const endY = startY + entity.lookDir.y * length;

        // Línea principal
        const slash = this.scene.add.graphics()
            .setDepth(entity.sprite.depth + 20);

        slash.lineStyle(4, 0xffffff, 1);
        slash.beginPath();
        slash.moveTo(startX, startY);
        slash.lineTo(endX, endY);
        slash.strokePath();

        // Glow extra (línea interior más fina)
        slash.lineStyle(2, 0xb0f0ff, 1);
        slash.beginPath();
        slash.moveTo(startX, startY);
        slash.lineTo(endX, endY);
        slash.strokePath();

        // Animación rápida
        this.scene.tweens.add({
            targets: slash,
            alpha: 0.5,
            duration: 100,
            ease: "Cubic.out",
            onComplete: () => {
                slash.destroy();
            }
        });
    }

    private playArrowFX(entity: any) {
        const attackX = entity.sprite.x + entity.lookDir.x * 300;
        const attackY = entity.sprite.y + entity.lookDir.y * 300;

        const arrow = this.scene.add
            .image(entity.sprite.x, entity.sprite.y, "arrow")
            .setOrigin(0.5)
            .setDepth(entity.sprite.depth + 10)
            .setScale(3);

        arrow.rotation = Phaser.Math.Angle.Between(
            entity.sprite.x,
            entity.sprite.y,
            attackX,
            attackY
        );

        this.scene.tweens.add({
            targets: arrow,
            x: attackX,
            y: attackY,
            duration: 250,
            ease: "Linear",
            onComplete: () => arrow.destroy(),
        });
    }

    private playWandFX(entity: any) {
        const attackX = entity.sprite.x + entity.lookDir.x * 64;
        const attackY = entity.sprite.y + entity.lookDir.y * 64;

        const magicCircle = this.scene.add.circle(
            attackX,
            attackY,
            10,
            0x00ffff,
            0.5
        );

        this.scene.tweens.add({
            targets: magicCircle,
            radius: 80,
            alpha: 0,
            duration: 250,
            ease: "Cubic.out",
            onComplete: () => magicCircle.destroy(),
        });
    }

    private playSpellFX(entity: any) {
        const aura = this.scene.add.circle(
            entity.sprite.x,
            entity.sprite.y,
            5,
            0xbf40bf,
            0.6
        );

        this.scene.tweens.add({
            targets: aura,
            radius: 100,
            alpha: 0,
            duration: 500,
            ease: "Cubic.out",
            onComplete: () => aura.destroy(),
        });
    }

    private getDirectionName(dx: number, dy: number): string {
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return "";

        let angle = Phaser.Math.RadToDeg(
            Phaser.Math.Angle.Between(0, 0, dx, dy)
        );

        if (angle < 0) angle += 360;

        if (angle >= 337.5 || angle < 22.5) return "right";
        if (angle < 67.5) return "down-right";
        if (angle < 112.5) return "down";
        if (angle < 157.5) return "down-left";
        if (angle < 202.5) return "left";
        if (angle < 247.5) return "up-left";
        if (angle < 292.5) return "up";
        return "up-right";
    }
}