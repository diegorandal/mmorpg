export class EmojiSystem extends Phaser.GameObjects.Container {
    private readonly RADIUS = 120;
    private readonly EMOJIS = [
        '😀', '😂', '🔥', '⚔️', '🛡️', '💀', '🚩', '💰',
        '❤️', '⚡', '🤖', '👑', '👋', '🎯', '🧪', '💨'
    ];

    constructor(scene: Phaser.Scene) {
        const { width, height } = scene.scale;
        super(scene, width / 2, height / 2);

        scene.add.existing(this);

        this.createEmojiCircle();

        // Configuración inicial
        this.setScrollFactor(0);
        this.setDepth(10000);
        this.setVisible(false);

    }

    private createEmojiCircle() {
        const totalEmojis = this.EMOJIS.length;

        for (let i = 0; i < totalEmojis; i++) {

            const angle = (i / totalEmojis) * Math.PI * 2; // [cite: 4]
            const x = Math.cos(angle) * this.RADIUS;       // [cite: 5]
            const y = Math.sin(angle) * this.RADIUS;       // [cite: 5]

            // Fondo circular del botón
            //const bg = this.scene.add.circle(x, y, 24, 0xffffff, 0.2).setStrokeStyle(2, 0xd1851f, 0.5);
            //const emojiText = this.scene.add.text(x, y, this.EMOJIS[i], {fontSize: '24px'}).setOrigin(0.5);

            const emojiText = new Phaser.GameObjects.Text(
                this.scene,
                x,
                y,
                this.EMOJIS[i],
                { fontSize: '24px' }
            ).setOrigin(0.5);
            emojiText.setInteractive();
            emojiText.on('pointerdown', () => {this.handleEmojiClick(this.EMOJIS[i]);});

            this.add([emojiText]);

        }
    }

    public show() {
        this.setVisible(true);
    }

    public hide() {
        this.setVisible(false);
    }

    private handleEmojiClick(emoji: string) {
 
        // this.scene.room.send("chat_emoji", { emoji });

        this.hide(); // En lugar de destroy(), ahora solo ocultamos

    }
}