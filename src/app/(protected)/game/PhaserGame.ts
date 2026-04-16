import Phaser from 'phaser';

export const getGameConfig = (containerId: string, initialScene: typeof Phaser.Scene | typeof Phaser.Scene[]): Phaser.Types.Core.GameConfig => ({

    scale: {mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: '100%', height: '100%'},
    input: {activePointers: 3},
    pixelArt: true, 
    antialias: false,
    parent: containerId,
    type: Phaser.AUTO,
    width: '100%',
    height: '100%',
    physics: {default: 'arcade', arcade: {gravity: { x: 0, y: 0 }, debug: false}},
    audio: {disableWebAudio: false},
    scene: initialScene   

});