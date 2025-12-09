import * as Phaser from 'phaser';
import Preload from './scenes/Preload';
import Splash1 from './scenes/Splash1';
import Splash2 from './scenes/Splash2';
import Splash3 from './scenes/Splash3';
import Splash4 from './scenes/Splash4';
import Splash5 from './scenes/Splash5';
import MainMenu from './scenes/MainMenu';
import OptionsMenu from './scenes/OptionsMenu';
import HowToPlay from './scenes/HowToPlay';
import Leaderboard from './scenes/Leaderboard';
import CharacterSelect from './scenes/CharacterSelect';
import Game from './scenes/Game';
import GameOver from './scenes/GameOver';

// Scaled up resolution
const BASE_W = 640;
const BASE_H = 960;

export function createGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: BASE_W,
    height: BASE_H,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    render: {
      pixelArt: true,
      antialias: false,
      roundPixels: true
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 4800 }, // Less floaty gravity
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_HORIZONTALLY, // Only center horizontally, not vertically
      width: BASE_W,
      height: BASE_H,
      parent: parent,
      fullscreenTarget: parent,
      expandParent: false,
      autoRound: true // Round pixel values for crisp rendering
    },
    input: {
      keyboard: true,
      mouse: true,
      touch: true,
      gamepad: false,
      activePointers: 1
    },
    scene: [Preload, Splash1, Splash2, Splash3, Splash4, Splash5, MainMenu, OptionsMenu, HowToPlay, Leaderboard, CharacterSelect, Game, GameOver],
    backgroundColor: '#2c5f2d' // GBA green background
  };

  const game = new Phaser.Game(config);
  
  // Force disable text smoothing on the canvas context
  game.events.once('ready', () => {
    const canvas = game.canvas as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      (ctx as any).imageSmoothingEnabled = false;
      (ctx as any).webkitImageSmoothingEnabled = false;
      (ctx as any).mozImageSmoothingEnabled = false;
      (ctx as any).msImageSmoothingEnabled = false;
    }
  });

  return game;
}
