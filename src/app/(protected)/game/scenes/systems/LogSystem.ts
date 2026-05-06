export class LogSystem extends Phaser.GameObjects.Container {

    private messages: Phaser.GameObjects.Text[] = [];
    private readonly maxMessages: number = 10;
    private readonly messageLifetime: number = 3000;

    constructor(scene: Phaser.Scene) {

        super(scene, 16, window.innerHeight - 250);
        scene.add.existing(this);
        this.setScrollFactor(0);
        this.setDepth(10000);
    }

    public addLog(text: string) {
        // Estilo visual similar a Minecraft
        const style: Phaser.Types.GameObjects.Text.TextStyle = {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: 'rgba(136, 136, 136, 0.2)', 
            padding: { x: 4, y: 2 }
        };

        const newMessage = this.scene.add.text(0, 0, text, style);

        // Añadir al inicio del array y al contenedor
        this.messages.unshift(newMessage);
        this.add(newMessage);

        // Actualizar posiciones de todos los mensajes
        this.updatePositions();

        // Si excedemos el límite, eliminamos el más viejo (el último del array)
        if (this.messages.length > this.maxMessages) {
            const oldMsg = this.messages.pop();
            if (oldMsg) oldMsg.destroy();
        }

        // Lógica de desvanecimiento
        this.scene.time.delayedCall(this.messageLifetime, () => {
            if (newMessage.active) {
                this.scene.tweens.add({
                    targets: newMessage,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => {
                        this.removeMessage(newMessage);
                    }
                });
            }
        });
    }

    private updatePositions() {
        this.messages.forEach((msg, index) => {
            this.scene.tweens.add({
                targets: msg,
                y: -index * 16, // separacion
                duration: 150,
                ease: 'Power1'
            });
        });
    }

    private removeMessage(msg: Phaser.GameObjects.Text) {
        const index = this.messages.indexOf(msg);
        if (index > -1) {
            this.messages.splice(index, 1);
        }
        msg.destroy();
    }
}