export class EmojiSystem {

    private scene: Phaser.Scene;
    private emojis: Array<
        Phaser.GameObjects.Text |
        Phaser.GameObjects.Arc
    > = [];
    private onEmojiClick: (emoji: string) => void;
    private readonly RADIUS = 180;
//    private readonly EMOJIS = ['😀', '😉', '🙄', '🤣', '😘', '😮', '😛', '🤑', '🙁', '😭', '👻', '💀', '💩', '👀', '🤩', '😎', '🤨', '👍', '🖐', '💰',];

//    private readonly EMOJIS = ['😀', '😉', '🙄', '🤣', '😘', '😮', '😛', '🤑', '🙁', '😭', '💀', '🤩', '😎', '🤨', '👍', '🖐',];

    private readonly EMOJIS = ['😀', '😉', '🙄', '🤣'];

    constructor(scene: Phaser.Scene, onEmojiClick: (emoji: string) => void) {

        this.scene = scene;
        this.onEmojiClick = onEmojiClick;

        const cx = scene.scale.width / 2;
        const cy = scene.scale.height / 2;

        const total = this.EMOJIS.length;

        for (let i = 0; i < total; i++) {

            const angle = (i / total) * Math.PI * 2;

            const x = cx + Math.cos(angle) * this.RADIUS;
            const y = cy + Math.sin(angle) * this.RADIUS;

            const hit = scene.add.circle(x, y, 28, 0xffffff, 0.15)
                .setScrollFactor(0)
                .setDepth(10000)
                .setInteractive()
                .setVisible(false);

            const text = scene.add.text(x, y, this.EMOJIS[i], { fontSize: '24px' })
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(10001)
                .setVisible(false);

            hit.on('pointerdown', () => {
                this.onEmojiClick(this.EMOJIS[i]);
                this.hide();
            });

            this.emojis.push(hit);
            this.emojis.push(text);
        }
    }

    public show() {

        this.emojis.forEach(obj => obj.setVisible(true));
        
    }

    public hide() {

        this.emojis.forEach(obj => obj.setVisible(false));
    }
}