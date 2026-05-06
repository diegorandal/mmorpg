export class EmojiSystem extends Phaser.GameObjects.Container {
    private readonly RADIUS = 120;
    private readonly EMOJIS = [
        '😀', '😂', '🔥', '⚔️', '🛡️', '💀', '🚩', '💰',
        '❤️', '⚡', '🤖', '👑', '👋', '🎯', '🧪', '💨'
    ];

    constructor(scene: Phaser.Scene) {
        const { width, height } = scene.scale;
        super(scene, width / 2, height / 2);

        this.createEmojiCircle();

        // Configuración inicial
        this.setScrollFactor(0);
        this.setDepth(10000);
        this.setVisible(false);

        scene.add.existing(this);
    }

    private createEmojiCircle() {
        const totalEmojis = this.EMOJIS.length;

        for (let i = 0; i < totalEmojis; i++) {
            const angle = (i / totalEmojis) * Math.PI * 2; // [cite: 4]
            const x = Math.cos(angle) * this.RADIUS;       // [cite: 5]
            const y = Math.sin(angle) * this.RADIUS;       // [cite: 5]

            // Fondo circular del botón
            const bg = this.scene.add.circle(x, y, 16, 0x000000, 0.6)
                .setStrokeStyle(2, 0xffffff);

            const emojiText = this.scene.add.text(x, y, this.EMOJIS[i], {
                fontSize: '20px'
            }).setOrigin(0.5);

            bg.setInteractive({ useHandCursor: true });

            bg.on('pointerdown', () => {
                this.handleEmojiClick(this.EMOJIS[i]);
            });

            this.add([bg, emojiText]);
        }
    }

    // Método para mostrar el menú
    public show() {
        this.setVisible(true);
        this.iterate((child: any) => {
            if (child.input) child.setInteractive();
        });
    }

    // Método para ocultar el menú
    public hide() {
        this.setVisible(false);
        this.iterate((child: any) => {
            if (child.input) child.disableInteractive();
        });
    }

    private handleEmojiClick(emoji: string) {
 
        // this.scene.room.send("chat_emoji", { emoji });

        this.hide(); // En lugar de destroy(), ahora solo ocultamos
    }
}