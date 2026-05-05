export class LogSystem extends Phaser.GameObjects.Container {

    private messages: Phaser.GameObjects.Text[] = [];
    private readonly maxMessages: number = 5;
    private readonly messageLifetime: number = 3000;

    constructor(scene: Phaser.Scene) {

        // Posicionamiento para Mobile: Esquina inferior izquierda, 
        // ajustado para no tapar controles virtuales si los tienes.
        super(scene, 20, window.innerHeight - 180);

        scene.add.existing(this);
        this.setScrollFactor(0); // Importante: Que no se mueva con la cámara
        this.setDepth(10000);      // Siempre por encima del mapa y jugadores
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
            // El mensaje 0 es el más nuevo (abajo), los demás suben
            // Usamos -index para que los viejos "suban"
            this.scene.tweens.add({
                targets: msg,
                y: -index * 22, // 22px de separación entre líneas
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