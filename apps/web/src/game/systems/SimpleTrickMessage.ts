// Simplified trick message display - single reusable text object
export class SimpleTrickMessage {
  private scene: Phaser.Scene;
  private messageText!: Phaser.GameObjects.Text;
  private starText!: Phaser.GameObjects.Text;
  private messageTimer?: Phaser.Time.TimerEvent;
  private messageY: number = 300;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Create a single reusable text object for trick name
    this.messageText = this.scene.add.text(320, this.messageY, '', {
      fontSize: '24px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 4
    });
    this.messageText.setOrigin(0.5);
    this.messageText.setDepth(110);
    this.messageText.setScrollFactor(0);
    this.messageText.setVisible(false);
    
    // Create text for star count (white, below trick name)
    this.starText = this.scene.add.text(320, this.messageY + 35, '', {
      fontSize: '18px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',  // White color for stars
      stroke: '#000000',
      strokeThickness: 4
    });
    this.starText.setOrigin(0.5);
    this.starText.setDepth(110);
    this.starText.setScrollFactor(0);
    this.starText.setVisible(false);
  }
  
  showMessage(text: string, duration: number = 1500, stars?: number) {
    // Clear any existing timer
    if (this.messageTimer) {
      this.messageTimer.remove();
      this.messageTimer = undefined;
    }
    
    // Update and show trick name
    this.messageText.setText(text);
    this.messageText.setVisible(true);
    this.messageText.setAlpha(1);
    
    // Update and show star count if provided
    if (stars && stars > 0) {
      this.starText.setText(`+${stars} STAR${stars > 1 ? 'S' : ''}`);
      this.starText.setVisible(true);
      this.starText.setAlpha(1);
    } else {
      this.starText.setVisible(false);
    }
    
    // Simple pop animation for both texts
    this.messageText.setScale(0);
    this.starText.setScale(0);
    this.scene.tweens.add({
      targets: [this.messageText, this.starText],
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
    
    // Hide after duration
    this.messageTimer = this.scene.time.addEvent({
      delay: duration,
      callback: () => {
        this.scene.tweens.add({
          targets: [this.messageText, this.starText],
          alpha: 0,
          scale: 0.8,
          duration: 200,
          onComplete: () => {
            this.messageText.setVisible(false);
            this.starText.setVisible(false);
          }
        });
      }
    });
  }
  
  // For compatibility with existing code
  addMessage(title: string, stars?: number) {
    // Pass stars as separate parameter for two-line display
    this.showMessage(title, 1500, stars);
  }
  
  // Stub methods for compatibility
  addPriorityMessage(title: string, description: string, duration?: number) {
    this.showMessage(title, duration || 3000);
  }
  
  addPowerUpMessage(imageName: string) {
    let text = imageName;
    if (imageName === 'power_metal') text = 'Metal Boot!';
    if (imageName === 'power_fire') text = 'Fire Taco!';
    if (imageName === 'power_crystal') text = 'Crystal Magnet!';
    this.showMessage(text);
  }
  
  update(time: number, delta: number) {
    // No-op for simplified version
  }
  
  processComboState(comboState: any) {
    if (comboState.status === 'active') {
      this.showMessage(`COMBO x${comboState.multiplier}!`);
    }
  }
  
  onComboEnded(event: any) {
    const starsEarned = event.starsEarned || 0;
    if (starsEarned > 0) {
      this.showMessage(`COMBO! +${starsEarned} STARS`);
    }
  }
  
  destroy() {
    if (this.messageTimer) {
      this.messageTimer.remove();
    }
    if (this.messageText) {
      this.messageText.destroy();
    }
    if (this.starText) {
      this.starText.destroy();
    }
  }
  
  // Add cleanup method for compatibility
  cleanup() {
    this.destroy();
  }
}