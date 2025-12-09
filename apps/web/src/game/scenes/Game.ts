import * as Phaser from 'phaser';
import { ComboTracker, createComboSystem } from '../systems/combo';
import { SimpleTrickMessage } from '../systems/SimpleTrickMessage';
import { setupControls } from '../systems/controls';
import { WaveManager } from '../systems/WaveManager';
import { ChallengeManager } from '../systems/ChallengeManager';
// All visual asset imports removed - clean slate for new assets

// Define ground level constants - skater runs higher than obstacles sit
const PLAYER_GROUND_Y = 850;  // Original skater position
const OBSTACLE_GROUND_Y = 956;  // Where obstacles sit on the street
const FLYING_OBSTACLE_Y = 700;  // Y position threshold for flying obstacles (if they existed)

export default class Game extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private controls!: ReturnType<typeof setupControls>;
  private trickKey!: Phaser.Input.Keyboard.Key; // J key for tricks
  private world!: any;
  private jumpParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private selectedCharacter: 'kev' | 'stacy' = 'kev'; // Track selected character
  private trickParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dustParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  
  // Enhanced jumping mechanics
  private isGrounded = true;
  private hasDoubleJumped = false;
  private trickActive = false;
  private hasUsedTrick = false; // Track if trick was used after jump
  private jumpCount = 0;
  private maxJumps = 2; // Regular jump + trick jump
  private jumpDebounce = false;
  // Stomp feature removed
  
  // Jump sprite - no animation, just a single image when jumping
  private jumpScale = 0.4; // Match idle sprite scale
  
  // Obstacle system
  private obstacles!: Phaser.GameObjects.Group;
  private obstacleTypes = ['obstacle_cone', 'obstacle_trash', 'obstacle_crash', 'obstacle_zombie', 'obstacle_skulls'];
  private recentObstacles: string[] = []; // Track last 2 obstacles to prevent 3 same in a row
  private lastObstacleX = 0;
  private gameOverTriggered = false;
  private gamePaused = false;  // Track pause state
  private sfxEnabled = true;  // Track if SFX is enabled
  private musicEnabled = true;  // Track if music is enabled
  private gameStartTime = 0;
  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private staminaText?: Phaser.GameObjects.Text;
  private distanceText?: Phaser.GameObjects.Text;
  private groundSegments?: any;
  private lastDifficulty = -1;
  private obstacleTimer: Phaser.Time.TimerEvent | null = null;
  private enemyTimer: Phaser.Time.TimerEvent | null = null;
  
  // Enemy system
  private enemies!: Phaser.GameObjects.Group;
  private explosions!: Phaser.GameObjects.Group;
  private arrowIndicators!: Phaser.GameObjects.Group;
  private lastEnemyX = 0;
  private lastEnemyY = 0;
  private lastEnemySpawnTime = 0;
  private lastSandwichY = 0;
  private lastSandwichSpawnTime = 0;
  private lastEnergyDrinkY = 0;
  private lastEnergyDrinkSpawnTime = 0;
  private bounceVelocity = -1200; // Stronger bounce when landing on enemy
  private speedMultiplier = 1.0; // Speed multiplier that increases over time
  
  // Stamina system
  private stamina = 100;  // Max stamina
  private maxStamina = 100;
  private staminaBar!: Phaser.GameObjects.Graphics;
  private staminaBarBg!: Phaser.GameObjects.Graphics;
  private staminaCost = 33.33;  // Cost per jump (one third)
  private staminaRegen = 0.5;  // Regeneration per frame
  private lastStaminaWarnPlayed = 0;  // Track low stamina warning
  private lastStaminaFullPlayed = 0;  // Track full stamina sound
  
  // Health system
  private health = 100;
  private maxHealth = 100;
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private invulnerable = false;
  private invulnerableTime = 1500; // 1.5 seconds of invulnerability after hit
  
  // Sandwiches (health pickups)
  private sandwiches!: Phaser.GameObjects.Group;
  private sandwichesCollected = 0;
  
  // Energy drinks (stamina power-ups)
  private energyDrinks!: Phaser.GameObjects.Group;
  private cansCollected = 0;
  private enemiesDefeated = 0; // Track defeated enemies
  private energyDrinkTimer!: Phaser.Time.TimerEvent;
  private staminaBoostActive = false;
  private staminaBoostTimer?: Phaser.Time.TimerEvent;
  private crystalMagnetActive = false;
  
  // New Power-Up System
  private powerUps!: Phaser.GameObjects.Group;
  private activePowerUp: 'metal_boot' | 'fire_taco' | null = null;
  private powerUpCharge = 0; // 0-100
  private maxPowerUpCharge = 100;
  private powerUpBar!: Phaser.GameObjects.Graphics;
  private powerUpBarBg!: Phaser.GameObjects.Graphics;
  private powerUpText!: Phaser.GameObjects.Text;
  private powerUpRechargeTimer?: Phaser.Time.TimerEvent;
  private metalBootUses = 0; // Track remaining uses for metal boot
  private lastPowerUpSpawnTime = 0;
  private powerUpTimer: Phaser.Time.TimerEvent | null = null;
  private fireballs!: Phaser.GameObjects.Group;
  private isStomping = false;
  private stompHitbox!: Phaser.GameObjects.Rectangle;
  private fireBreath!: Phaser.GameObjects.Sprite;
  private fireBreathActive: boolean = false;
  private metalBootActive: boolean = false;
  private fireTacoActive: boolean = false;
  private fireCycleTimer?: Phaser.Time.TimerEvent;
  
  // Fire Taco effect properties
  private fireSprites: Phaser.GameObjects.Image[] = [];
  private fireLeg?: Phaser.GameObjects.Image;
  private fireShoulder?: Phaser.GameObjects.Image;
  private fireBody?: Phaser.GameObjects.Image;
  private fireRight?: Phaser.GameObjects.Image;
  private fireTrail?: Phaser.GameObjects.Image;
  private fireColorTimer?: Phaser.Time.TimerEvent;
  private enemySpawnRate: number = 1.0; // Default spawn rate multiplier (1.0 = normal speed)
  private powerUpTestIndex: number = 0; // Test index to rotate through power-ups
  
  // Optimization: Track last update times for less critical effects
  private lastFireSpriteUpdate: number = 0;
  private lastPowerUpTintUpdate: number = 0;
  private lastBackgroundUpdate: number = 0;
  
  // Track active power-up texts to prevent overlap
  private activePowerUpTexts: Array<{
    container: Phaser.GameObjects.Container;
    text: Phaser.GameObjects.Image;
    cross: Phaser.GameObjects.Image | null;
    imageKey: string;
  }> = [];
  
  // Combo system
  private comboTracker!: ComboTracker;
  private wasGrounded = true;
  // comboUI removed - now using text management system
  private comboDisplayTimer?: Phaser.Time.TimerEvent;
  private lastComboData: { multiplier: number, scorePoints: number } | null = null;
  
  // Trick message queue system
  private trickMessageManager!: SimpleTrickMessage;
  
  // Star collection system
  private stars = 0;
  private starIcon!: Phaser.GameObjects.Image;
  private starText!: Phaser.GameObjects.Text;
  private starPickups!: Phaser.Physics.Arcade.Group;
  private lastStarPatternX = 0;
  private sandwichTimer!: Phaser.Time.TimerEvent;
  private starSpawnTimer!: Phaser.Time.TimerEvent;
  
  // Victory tracking
  private gameWon = false;
  private totalEnemiesStomped = 0;
  private bestCombo = 0;
  private totalPowerUpsUsed = 0;
  
  // Life system
  private lives = 3; // Start with 3 lives
  private lifeIcon!: Phaser.GameObjects.Image;
  private lifeText!: Phaser.GameObjects.Text;
  private starLifeThreshold = 100; // Stars needed for extra life
  private nextLifeAt = 100; // Track when next life should be awarded
  
  // Distance tracking for scoring
  private lastDistanceScoreMilestone = 0; // Track the last distance milestone for scoring
  
  // Background tiles for infinite scrolling
  private backgroundTiles: Phaser.GameObjects.Image[] = [];
  private backgroundWidth = 1408; // 1280 * 1.1
  private redSkyBg: Phaser.GameObjects.TileSprite | null = null; // Red sky background reference
  
  // Physics constants
  private readonly JUMP_VELOCITY = -1750;  // Slightly higher first jump
  private readonly TRICK_JUMP_VELOCITY = -1450; // Slightly higher double jump
  private readonly SWIPE_TRICK_VELOCITY = -850; // Small jump for swipe trick
  // Stomp velocity removed - stomp feature no longer exists
  private readonly GRAVITY = 4200; // Slightly floatier
  private readonly FLOAT_GRAVITY = 3200; // More float during tricks
  
  // Audio system
  private currentBgMusic!: Phaser.Sound.BaseSound | null;
  private bgMusicQueue: string[] = ['broken_code', 'undead_empire', 'menu_music'];
  private currentMusicIndex = 0;
  private songTitleContainer?: Phaser.GameObjects.Container;
  
  // Individual song toggles
  private songEnabled: { [key: string]: boolean } = {
    'broken_code': true,
    'undead_empire': true,
    'menu_music': true
  };
  
  // Wave and Challenge systems
  private waveManager!: WaveManager;
  private challengeManager!: ChallengeManager;
  private challengeDisplay?: Phaser.GameObjects.Container;
  private waveDisplay?: Phaser.GameObjects.Text;
  private lastChallengeDisplayUpdate: number = 0;
  private challengeDisplayUpdatePending: boolean = false;
  private challengeDisplayUpdateDelay: number = 200; // Minimum ms between updates
  // Cached challenge display elements for optimization
  private challengeWaveText?: Phaser.GameObjects.Text;
  private challengeTextBg?: Phaser.GameObjects.Rectangle;
  private challengeDescText?: Phaser.GameObjects.Text;
  private challengeProgressText?: Phaser.GameObjects.Text;
  private hasResetChallengeTimer: boolean = false;

  // Store event listeners for cleanup
  private escListener?: () => void;
  private pauseListener?: () => void;

  constructor() {
    super('Game');
  }

  init(data: { selectedCharacter?: 'kev' | 'stacy' }) {
    // Receive selected character from CharacterSelect scene
    this.selectedCharacter = data.selectedCharacter || 'kev';
    // console.log('Selected character:', this.selectedCharacter);
  }

  create() {
    // Emit scene change event for React components
    window.dispatchEvent(new CustomEvent('sceneChanged', {
      detail: { scene: 'Game' }
    }));
    // Reset all game state variables
// console.log('[DEBUG GAME INIT] Starting game scene...');
    this.gameOverTriggered = false;
    this.gamePaused = false; // Reset pause state
    this.physics.resume(); // Ensure physics is running
    this.time.paused = false; // Ensure timers are running
    this.tweens.resumeAll(); // Ensure all tweens are running
    this.hasResetChallengeTimer = false; // Reset challenge timer flag
    
    // Clear any lingering pause UI elements from previous games
    const pauseElements = ['pauseBg', 'pauseTitle', 'resumeBtn', 'musicToggle', 'songsOption', 'sfxToggle', 'menuBtn', 
                           'confirmBg', 'confirmTitle', 'confirmText', 'yesBtn', 'noBtn',
                           'pausedOverlay', 'pausedText', 'pauseMenuBg', 'musicMenuBg', 'musicTitle', 
                           'musicBackBtn', 'songToggle_broken_code', 'songToggle_undead_empire', 
                           'songToggle_menu_music', 'masterMusicToggle'];
    pauseElements.forEach(name => {
      const element = this.children.getByName(name);
      if (element) element.destroy();
    });
    
    this.health = 100; // Reset to full health
    this.stamina = 100; // Reset to full stamina
    this.invulnerable = false; // Reset invulnerability
    this.score = 0; // Reset score
    this.lastObstacleX = 0;
    this.recentObstacles = []; // Reset recent obstacle tracking
    this.lastEnemyX = 0;
    this.lastEnemyY = 0;
    this.lastEnemySpawnTime = 0;
    this.lastSandwichY = 0;
    this.lastSandwichSpawnTime = 0;
    this.lastEnergyDrinkY = 0;
    this.lastEnergyDrinkSpawnTime = 0;
    this.speedMultiplier = 1.0; // Reset speed multiplier
    this.isGrounded = true;
    this.jumpCount = 0;
    this.hasDoubleJumped = false;
    this.trickActive = false;
    this.hasUsedTrick = false;
    this.backgroundTiles = []; // Clear background tiles
    this.stars = 0; // Reset stars
    this.lives = 3; // Reset lives
    this.nextLifeAt = 100; // Reset next life milestone
    this.sandwichesCollected = 0; // Reset sandwich counter
    this.cansCollected = 0; // Reset can counter
    this.enemiesDefeated = 0; // Reset enemies defeated counter
    
    // Reset all power-up states to prevent effects from persisting
    this.metalBootActive = false;
    this.fireTacoActive = false; 
    this.crystalMagnetActive = false;
    this.staminaBoostActive = false; // Reset stamina boost
    this.activePowerUp = null; // Reset active power-up
    this.powerUpCharge = 0; // Reset power-up charge
    this.lastDistanceScoreMilestone = 0; // Reset distance tracking
    this.lastPowerUpSpawnTime = 0; // Reset power-up spawn time
    this.isStomping = false; // Reset stomp state
    
// console.log(`[DEBUG GAME INIT] Health: ${this.health}, Stamina: ${this.stamina}, Invulnerable: ${this.invulnerable}`);
    
    // Initialize Wave and Challenge managers
    this.waveManager = new WaveManager(this);
    this.challengeManager = new ChallengeManager(this);
    
    // Set up callbacks
    this.waveManager.setOnWaveChange((wave) => {
      this.onWaveChange(wave);
    });
    
    this.waveManager.setOnSpeedIncrease((multiplier) => {
      this.speedMultiplier = multiplier;
      // No speed increase notification per user request
    });
    
    this.challengeManager.setOnAllChallengesComplete(() => {
      this.waveManager.completeChallenge();
    });
    
    // Generate initial challenges for Wave 1
    this.challengeManager.generateChallengesForWave(1);
    
    // Add timer to update challenge display every second for accurate time-based challenges
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        // Only update if we have active time-based challenges
        const challenges = this.challengeManager.getActiveChallenges();
        const hasTimeChallenge = challenges.some(c => 
          !c.completed && (c.type === 'survive_time' || c.type === 'no_damage')
        );
        if (hasTimeChallenge) {
          this.updateChallengeDisplay();
        }
      },
      callbackScope: this,
      loop: true
    });
    
    // Create seamless background world
    this.world = this.createSeamlessWorld();
    
    // Reduce gravity for floatier feel
    this.physics.world.gravity.y = this.GRAVITY;
    
    // Create player
    this.createPlayer();
    
    // Create particle effects
    this.createParticleEffects();
    
    // Create obstacle system
    this.createObstacleSystem();
    
    // Create enemy system
    this.createEnemySystem();
    
    // Create sandwich system (health pickups)
    this.createSandwichSystem();
    
    // Create energy drink system (stamina power-ups)
    this.createEnergyDrinkSystem();
    
    // Create new power-up system
    this.createPowerUpSystem();
    
    // Create star collection system
    this.createStarSystem();
    
    // Setup controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.controls = setupControls(this);
    
    // Add J key for tricks
    this.trickKey = this.input.keyboard!.addKey('J');
    
    // Initialize challenge display - force recreation on scene start
    // Destroy any existing display elements first to avoid stale references
    if (this.challengeDisplay) {
      this.challengeDisplay.destroy();
    }
    this.challengeDisplay = undefined;
    this.challengeWaveText = undefined;
    this.challengeDescText = undefined;
    this.challengeProgressText = undefined;
    
    // Force immediate display update after a short delay to ensure scene is ready
    this.time.delayedCall(100, () => {
      this.updateChallengeDisplay();
    });
    
    // Add fingerprint tap indicator - shows for 5 seconds at start
    const fingerprint = this.add.image(80, 880, 'fingerprint');
    fingerprint.setScale(0.15); // Slightly larger for better visibility
    fingerprint.setDepth(150);
    fingerprint.setScrollFactor(0); // Keep it on screen
    fingerprint.setAlpha(1.0); // Full opacity for better visibility
    fingerprint.setRotation(0.2); // Tilt slightly to the right (in radians)
    
    // Create flashing animation (on/off flash, not smooth)
    this.tweens.add({
      targets: fingerprint,
      alpha: 0, // Flash to completely off
      duration: 200, // Fast flash
      ease: 'Power0', // No easing for instant flash
      yoyo: true,
      repeat: 12 // Flash multiple times over ~5 seconds
    });
    
    // Remove after 5 seconds
    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: fingerprint,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          fingerprint.destroy();
        }
      });
    });
    
    // Stop ALL sounds including menu music before starting gameplay
    // Stop all sounds globally
    this.game.sound.stopAll();
    
    // Stop sounds in all scenes
    this.game.scene.scenes.forEach((scene) => {
      if (scene.sound) {
        scene.sound.stopAll();
      }
    });
    
    // Double check all playing sounds are stopped
    const allSounds = this.game.sound.getAllPlaying();
    allSounds.forEach((sound: any) => {
      sound.stop();
    });
    
    // Stop and cleanup global menu music instance on window
    if ((window as any).menuMusicInstance) {
      try {
        (window as any).menuMusicInstance.stop();
        (window as any).menuMusicInstance.destroy();
      } catch (e) {
        // Music might already be destroyed
      }
      (window as any).menuMusicInstance = undefined;
      // CRITICAL: Reset the flag so menu music can restart when returning to menu
      (window as any).menuMusicStarted = false;
    }
    
    // Wait to ensure menu music is fully stopped
    this.time.delayedCall(200, () => {
      // Randomly select starting track
      this.currentMusicIndex = Math.random() < 0.5 ? 0 : 1;
      // Start background music
      this.playNextBackgroundMusic();
    });
    
    // No ground collision - handle landing through position checks only to avoid invisible floors

    // Add collision detection for obstacles using overlap for guaranteed detection
    this.physics.add.overlap(this.player, this.obstacles, (player: any, obstacle: any) => {
// console.log(`[DEBUG COLLISION] Obstacle collision detected! Invulnerable: ${this.invulnerable}, GameOver: ${this.gameOverTriggered}, Health: ${this.health}`);
      
      // Get precise positions for collision detection
      const playerBody = player.body as Phaser.Physics.Arcade.Body;
      const obstacleBody = obstacle.body as Phaser.Physics.Arcade.Body;
      
      // Calculate actual collision boundaries
      const playerBottom = playerBody.bottom;
      const playerTop = playerBody.top;
      const playerLeft = playerBody.left;
      const playerRight = playerBody.right;
      
      const obstacleTop = obstacleBody.top;
      const obstacleBottom = obstacleBody.bottom;
      const obstacleLeft = obstacleBody.left;
      const obstacleRight = obstacleBody.right;
      
      // Check if this is a landing collision (player coming from above)
      // For landing protection, player must be:
      // 1. Clearly falling down (not just moving horizontally)
      // 2. Bottom of player near top of obstacle
      // 3. Not hitting from the side
      
      const playerCenterX = (playerLeft + playerRight) / 2;
      const obstacleCenterX = (obstacleLeft + obstacleRight) / 2;
      const horizontalDistance = Math.abs(playerCenterX - obstacleCenterX);
      const obstacleHalfWidth = (obstacleRight - obstacleLeft) / 2;
      
      // Check if this is a harmless obstacle type (never causes damage)
      const harmlessObstacles: string[] = []; // No obstacles are harmless - all should cause damage
      const isHarmless = harmlessObstacles.includes(obstacle.texture.key);
      
      if (isHarmless) {
        // These obstacles never cause damage - just pass through them
        // console.log('[HARMLESS OBSTACLE] No damage from:', obstacle.texture.key);
        return; // Exit early, no damage taken
      }
      
      // Metal skateboard protection: send obstacles flying
      if (this.metalBootActive) {
        // Skip if already flying to avoid re-processing
        if (obstacle.getData('flying')) {
          return; // Already processed, no damage
        }
        // console.log('[METAL SKATEBOARD] Sending obstacle flying!');
        obstacle.setData('flying', true);
        
        // Stop the obstacle's normal movement
        obstacleBody.velocity.x = 0;
        
        // Make the obstacle fall to the side instead of flying
        const fallSide = 300; // Fall to the side
        const fallHeight = -200; // Small hop
        obstacleBody.velocity.x = fallSide;
        obstacleBody.velocity.y = fallHeight;
        obstacleBody.setGravityY(1200); // Faster fall
        
        // Add spin effect
        this.tweens.add({
          targets: obstacle,
          angle: 720,
          duration: 1500
        });
        
        // No boss collision check needed anymore
        
        // After landing, flash and vanish
        this.time.delayedCall(1500, () => {
          if (!obstacle || obstacle.destroyed) return;
          
          // Flash effect
          const flashCount = 3;
          let flashes = 0;
          const flashTimer = this.time.addEvent({
            delay: 100,
            callback: () => {
              if (!obstacle || obstacle.destroyed) {
                flashTimer.remove();
                return;
              }
              obstacle.setVisible(flashes % 2 === 0);
              flashes++;
              if (flashes >= flashCount * 2) {
                obstacle.destroy();
                flashTimer.remove();
              }
            },
            loop: true
          });
        });
        
        // Play impact sound
        this.playSFX('new_explosion_sfx', { volume: 0.3 });
        
        return; // Exit early, no damage taken
      }
      
      
      // Fire Taco protection: set obstacle on fire but keep it visible
      if (this.fireTacoActive && !obstacle.getData('onFire')) {
        // console.log('[FIRE TACO] Setting obstacle on fire!');
        obstacle.setData('onFire', true);
        
        // Get the ACTUAL center of the obstacle sprite
        const center = this.getSpriteCenter(obstacle);
        
        // Create BIGGER fire effects ACTUALLY CENTERED ON the obstacle, IN FRONT - slightly spread
        const fireEffect1 = this.add.image(center.x - 5, center.y - 5, 'fire1');
        fireEffect1.setScale(0.65); // Bigger fire
        fireEffect1.setDepth(100); // Way in front to be visible
        
        const fireEffect2 = this.add.image(center.x + 5, center.y + 5, 'fire2');
        fireEffect2.setScale(0.55); // Bigger fire  
        fireEffect2.setDepth(100); // In front
        
        // Store fire references and center offset on obstacle for cleanup
        obstacle.setData('fireEffects', [fireEffect1, fireEffect2]);
        obstacle.setData('fireOffsets', { 
          x: center.x - obstacle.x, 
          y: center.y - obstacle.y 
        });
        
        // Items on fire no longer flash - just catch fire immediately per user request
        // Create a timer to update fire positions as the obstacle moves
        const fireUpdateTimer = this.time.addEvent({
          delay: 50, // Update fire positions every 50ms
          callback: () => {
            // Stop if obstacle is destroyed
            if (!obstacle || !obstacle.active) {
              // Clean up timer and fire effects
              if (fireUpdateTimer && fireUpdateTimer.remove) {
                fireUpdateTimer.remove();
              }
              const fireEffects = obstacle.getData('fireEffects');
              if (fireEffects) {
                fireEffects.forEach((fire: any) => {
                  if (fire && fire.destroy) fire.destroy();
                });
              }
              return;
            }
            
            // Update fire positions to follow obstacle using stored offsets
            const fires = obstacle.getData('fireEffects');
            const offsets = obstacle.getData('fireOffsets');
            if (fires && offsets) {
              if (fires[0] && fires[0].active) {
                fires[0].setPosition(obstacle.x + offsets.x - 5, obstacle.y + offsets.y - 5);
              }
              if (fires[1] && fires[1].active) {
                fires[1].setPosition(obstacle.x + offsets.x + 5, obstacle.y + offsets.y + 5);
              }
            }
          },
          loop: true
        });
        
        // Store timer reference on obstacle for cleanup
        obstacle.setData('fireUpdateTimer', fireUpdateTimer);
        
        return; // No damage taken when on fire
      }
      
      // If obstacle is already on fire, no damage taken
      if (obstacle.getData('onFire')) {
        return;
      }
      
      // All other collisions cause damage if not invulnerable
      if (!this.invulnerable && !this.gameOverTriggered && !this.staminaBoostActive) {
        // Take damage - Metal Boot doesn't protect from side/bottom collisions
// console.log(`[DEBUG COLLISION] Taking damage from obstacle`);
        this.takeDamage(25); // Take 25 damage from obstacles
        // Clean up fire taco effects and timer if they exist
        this.cleanupObstacleFireEffects(obstacle);
        this.obstacles.remove(obstacle); // Remove from physics group first
        obstacle.destroy(); // Then destroy the sprite
      } else {
// console.log(`[DEBUG COLLISION] Damage blocked - Invulnerable: ${this.invulnerable}, GameOver: ${this.gameOverTriggered}`);
      }
    }, undefined, this);
    
    // Add collision detection for enemies - stomp them from above
    this.physics.add.overlap(this.player, this.enemies, (player: any, enemy: any) => {
      const playerBody = player.body as Phaser.Physics.Arcade.Body;
      console.log(`[DEBUG COLLISION] Enemy collision! Type: ${enemy.texture?.key}, PlayerY: ${player.y}, EnemyY: ${enemy.y}, VelocityY: ${playerBody.velocity.y}`);
      
      // First check if this is a stomp (even with Fire Taco)
      const isStompCollision = playerBody.velocity.y > 0 && player.y < enemy.y - 20;
      
      // If Fire Taco is active, handle differently based on stomp vs touch
      if (this.fireTacoActive) {
        console.log('[DEBUG FIRE TACO] Enemy touched during Fire Taco - checking if stomp or touch');
        // Don't skip defeated enemies for Fire Taco - it burns everything
        if (enemy && enemy.active) {
          if (isStompCollision) {
            console.log('[DEBUG FIRE TACO] STOMP during Fire Taco!');
            this.stompEnemy(enemy, true); // true = this is a stomp
          } else {
            console.log('[DEBUG FIRE TACO] Touch (not stomp) during Fire Taco!');
            this.stompEnemy(enemy, false); // false = not a stomp, just Fire Taco touch
          }
          this.collectStars(1);
        }
        return;
      }
      
      // Skip if enemy is already defeated (for robots that stay visible) - but only AFTER Fire Taco check
      if (enemy.getData('defeated')) {
        return;
      }
      
      // Check if player is falling and above the enemy (stomping)
      // More lenient stomping detection
      if (playerBody.velocity.y > -50 && player.y < enemy.y - 10) {
        console.log(`[DEBUG COLLISION] STOMP DETECTED on ${enemy.texture?.key}!`);
        this.stompEnemy(enemy, true); // PASS TRUE for actual stomps!
        this.bouncePlayer();
        return;
      }
      
      // Hit enemy from side or below - take damage
      if (!this.invulnerable && !this.gameOverTriggered && !this.staminaBoostActive) {
        // Hit enemy from side or below - take damage (but not if energy drink is active)
// console.log(`[DEBUG COLLISION] Taking damage from enemy...`);
        this.takeDamage(35); // Take 35 damage from enemies
        this.enemies.remove(enemy); // Remove from physics group first
        enemy.destroy(); // Then destroy enemy
      } else {
// console.log(`[DEBUG COLLISION] Enemy damage blocked - Invulnerable: ${this.invulnerable}`);
      }
    }, undefined, this);
    
    // Add collision detection for sandwiches (health pickups)
    this.physics.add.overlap(this.player, this.sandwiches, (player: any, sandwich: any) => {
      this.collectSandwich(sandwich);
    }, undefined, this);
    
    // Add collision detection for energy drinks (stamina power-ups)
    this.physics.add.overlap(this.player, this.energyDrinks, (player: any, energyDrink: any) => {
      this.collectEnergyDrink(energyDrink);
    }, undefined, this);
    
    // Add collision detection for new power-ups
    this.physics.add.overlap(this.player, this.powerUps, (player: any, powerUp: any) => {
      this.collectPowerUp(powerUp);
    }, undefined, this);
    
    // Add collision detection for flying obstacles hitting enemies
    this.physics.add.overlap(this.obstacles, this.enemies, (obstacle: any, enemy: any) => {
      // Only destroy enemy if obstacle is flying (from Metal Gear power-up)
      if (obstacle.getData('flying')) {
        // Destroy the enemy
        this.stompEnemy(enemy);
        
        // Add explosion effect
        const explosion = this.explosions.create(enemy.x, enemy.y, 'explosion') as Phaser.Physics.Arcade.Sprite;
        explosion.setScale(0.4);
        explosion.setDepth(15);
        this.tweens.add({
          targets: explosion,
          scale: 0.6,
          alpha: 0,
          duration: 500,
          onComplete: () => explosion.destroy()
        });
        
        // Register combo for metal gear hit
        if (this.comboTracker) {
          this.comboTracker.registerEnemyKill(this.score, this.isGrounded);
        }
        
        // Play sound
        this.playSFX('new_explosion_sfx', { volume: 0.4 });
      }
    }, undefined, this);
    
    // Add collision detection for fireballs with obstacles
    this.physics.add.overlap(this.fireballs, this.obstacles, (fireball: any, obstacle: any) => {
      // Clean up fire taco timer if it exists
      if (obstacle.getData('flashTimer')) {
        obstacle.getData('flashTimer').remove();
      }
      // Clean up fire effects and destroy both fireball and obstacle
      this.cleanupObstacleFireEffects(obstacle);
      obstacle.destroy();
      fireball.destroy();
      
      // Create explosion effect
      const explosion = this.explosions.create(obstacle.x, obstacle.y, 'explosion') as Phaser.Physics.Arcade.Sprite;
      explosion.setScale(0.3);
      explosion.setDepth(15);
      this.tweens.add({
        targets: explosion,
        scale: 0.5,
        alpha: 0,
        duration: 500,
        onComplete: () => explosion.destroy()
      });
      
      // Register combo for fireball hit
      if (this.comboTracker) {
        this.comboTracker.registerTrick(this.score, this.isGrounded);
      }
      
      // Play sound
      this.playSFX('new_explosion_sfx', { volume: 0.3 });
    }, undefined, this);
    
    // Add collision detection for fireballs with enemies
    this.physics.add.overlap(this.fireballs, this.enemies, (fireball: any, enemy: any) => {
      // Defeat enemy
      this.stompEnemy(enemy);
      fireball.destroy();
      
      // Register combo for fireball hit
      if (this.comboTracker) {
        this.comboTracker.registerEnemyKill(this.score, this.isGrounded);
      }
    }, undefined, this);
    
    // Add collision detection for stomp hitbox with enemies
    this.physics.add.overlap(this.stompHitbox, this.enemies, (stomp: any, enemy: any) => {
      if (this.isStomping) {
        this.stompEnemy(enemy);
        // Register combo for stomp
        if (this.comboTracker) {
          this.comboTracker.registerEnemyKill(this.score, this.isGrounded);
        }
      }
    }, undefined, this);
    
    // Add collision detection for stomp hitbox with obstacles
    this.physics.add.overlap(this.stompHitbox, this.obstacles, (stomp: any, obstacle: any) => {
      if (this.isStomping) {
        // Clean up fire effects before destroying
        this.cleanupObstacleFireEffects(obstacle);
        obstacle.destroy();
        
        // Create explosion effect
        const explosion = this.explosions.create(obstacle.x, obstacle.y, 'explosion') as Phaser.Physics.Arcade.Sprite;
        explosion.setScale(0.3);
        explosion.setDepth(15);
        this.tweens.add({
          targets: explosion,
          scale: 0.5,
          alpha: 0,
          duration: 500,
          onComplete: () => explosion.destroy()
        });
        
        // Register combo for stomp
        if (this.comboTracker) {
          this.comboTracker.registerTrick(this.score, this.isGrounded);
        }
        
        // Play sound
        this.playSFX('new_explosion_sfx', { volume: 0.4 });
      }
    }, undefined, this);
    
    // Add collision detection for fire breath with obstacles
    this.physics.add.overlap(this.fireBreath, this.obstacles, (breath: any, obstacle: any) => {
      if (this.fireBreathActive) {
        // Clean up fire effects before destroying
        this.cleanupObstacleFireEffects(obstacle);
        obstacle.destroy();
        
        // Create explosion effect
        const explosion = this.explosions.create(obstacle.x, obstacle.y, 'explosion') as Phaser.Physics.Arcade.Sprite;
        explosion.setScale(0.3);
        explosion.setDepth(15);
        this.tweens.add({
          targets: explosion,
          scale: 0.5,
          alpha: 0,
          duration: 500,
          onComplete: () => explosion.destroy()
        });
        
        // Register combo for fire breath hit
        if (this.comboTracker) {
          this.comboTracker.registerTrick(this.score, this.isGrounded);
        }
        
        // Play sound
        this.playSFX('new_explosion_sfx', { volume: 0.2 });
      }
    }, undefined, this);
    
    // Add collision detection for fire breath with enemies
    this.physics.add.overlap(this.fireBreath, this.enemies, (breath: any, enemy: any) => {
      if (this.fireBreathActive) {
        this.stompEnemy(enemy);
        
        // Register combo for fire breath hit
        if (this.comboTracker) {
          this.comboTracker.registerEnemyKill(this.score, this.isGrounded);
        }
      }
    }, undefined, this);
    
// console.log('Collision detection set up between player and obstacles/enemies');

    // No ground collision for obstacles - they're positioned at ground level

    // Remove camera bounds for infinite world
    this.cameras.main.setBounds(0, 0, Number.MAX_SAFE_INTEGER, 960);
    // Follow player directly without smoothing to keep obstacles and background in sync
    this.cameras.main.startFollow(this.player, true, 1.0, 1.0, -100, 0);
    
    // ESC to return to main menu - store reference so we can remove it later
    this.escListener = () => {
      this.stopBackgroundMusic();
      this.cleanupAndStop();
      this.scene.start('MainMenu');
    };
    this.input.keyboard!.on('keydown-ESC', this.escListener);

    // Initialize game timing
    this.gameStartTime = this.time.now;
    
    // Boss graphics are loaded from image files in Preload.ts
    
    // Initialize trick message system (simplified for better performance)
    this.trickMessageManager = new SimpleTrickMessage(this);
    
    // Initialize combo system
    this.comboTracker = createComboSystem(this);
    this.wasGrounded = true;
    
    this.setupComboUI();
    
    // Setup combo event listeners
    this.comboTracker.on('comboActivated', (data: any) => {
      // console.log('[COMBO] Combo activated with multiplier:', data.multiplier);
      // Play combo sound effect
      this.playSFX('combo_sfx', { volume: 0.5 });
      this.updateComboUI();
    });
    
    this.comboTracker.on('comboUpdated', (data: any) => {
      this.updateComboUI();
    });
    
    this.comboTracker.on('comboEnded', (data: any) => {
      // console.log(`[COMBO] Combo ended! Stars earned: ${data.starsEarned}`);
      this.collectStars(data.starsEarned);
      
      // Don't show COMBO! message - user requested to remove it
      
      // Clear combo data
      this.lastComboData = null;
    });
    
    // Create tutorial instructions in the middle of the screen
    const tutorialContainer = this.add.container(320, 480);
    tutorialContainer.setScrollFactor(0);
    tutorialContainer.setDepth(110);
    
    // Background for tutorial
    const tutorialBg = this.add.graphics();
    tutorialBg.fillStyle(0x000000, 0.8);
    tutorialBg.fillRoundedRect(-320, -70, 640, 180, 10);
    tutorialContainer.add(tutorialBg);
    
    // Tutorial text
    const line1 = this.add.text(0, -35, 'TAP TO JUMP', {
      fontSize: '22px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#00ff00'
    }).setOrigin(0.5);
    
    const line2 = this.add.text(0, 0, 'TAP AGAIN FOR DOUBLE JUMP', {
      fontSize: '22px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#00ffff'
    }).setOrigin(0.5);
    
    const line3 = this.add.text(0, 35, 'SWIPE UP (IN AIR) FOR TRICK', {
      fontSize: '22px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffff00'
    }).setOrigin(0.5);
    
    const line4 = this.add.text(0, 70, 'COMBINING TRICKS AND KILLS', {
      fontSize: '18px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ff00ff'
    }).setOrigin(0.5);
    
    const line5 = this.add.text(0, 95, 'STARTS COMBOS', {
      fontSize: '18px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ff00ff'
    }).setOrigin(0.5);
    
    tutorialContainer.add([line1, line2, line3, line4, line5]);
    
    // Fade out the tutorial after 5 seconds
    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: tutorialContainer,
        alpha: 0,
        duration: 1000,
        onComplete: () => {
          tutorialContainer.destroy();
        }
      });
    });
    
    // Add position tracking every second for debugging
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
// console.log('=== POSITION TRACKER (1 SEC) ===');
// console.log(`Position: X=${Math.round(this.player.x)}, Y=${Math.round(this.player.y)}`);
// console.log(`Velocity: X=${Math.round(body.velocity.x)}, Y=${Math.round(body.velocity.y)}`);
// console.log(`State: Grounded=${this.isGrounded}, JumpCount=${this.jumpCount}`);
// console.log(`Physics: Gravity=${this.physics.world.gravity.y}, Touching.down=${body.touching.down}`);
// console.log(`Stamina: ${Math.round(this.stamina)}/${this.maxStamina}`);
// console.log('================================');
      },
      loop: true
    });
    
// console.log('Game scene loaded with enhanced zombie skater mechanics');
  }

  createSeamlessWorld() {
    // Create the seamless world directly
    const { createSeamlessWorld } = this.loadSeamlessWorld();
    return createSeamlessWorld(this);
  }

  loadSeamlessWorld() {
    // Inline the seamless world creation to avoid import issues
    
    const createSeamlessWorld = (scene: any) => {
      // Add red sky background first (behind everything else)
      // Use the actual texture size for proper repeating
      this.redSkyBg = scene.add.tileSprite(0, 0, 1920, 960, 'red_sky_bg')
        .setOrigin(0, 0)
        .setScrollFactor(0) // Fixed to viewport
        .setDepth(0) // Behind everything
        .setScale(0.5, 0.5); // Scale down to make it smaller
      
      // Create initial background tiles directly without placeholder
      const startX = 320;
      for (let i = -2; i <= 5; i++) {
        const tile = scene.add.image(startX + (i * this.backgroundWidth), 960, 'city_background')
          .setOrigin(0.5, 1)
          .setScrollFactor(1.0)
          .setDepth(1)
          .setScale(1.1, 1.1);
        this.backgroundTiles.push(tile);
      }

      // Add visible white floor line at ground level
      const floorLine = scene.add.graphics()
        .lineStyle(3, 0xffffff, 1)
        .lineTo(12000, 0)
        .setPosition(0, PLAYER_GROUND_Y)
        .setScrollFactor(0)
        .setDepth(10);

      // Physics ground - infinite collision surface at street level
      const ground = scene.physics.add.staticGroup();
      
      // Don't create invisible ground segments - handle landing through position checks only
      // This prevents the player from landing on invisible floors

      const update = (scrollX: number) => {
        // Managed in main update now
      };

      return { ground, update };
    };

    return { createSeamlessWorld };
  }

  createPlayer() {
    // Choose sprite based on selected character
    const idleSprite = this.selectedCharacter === 'kev' ? 'zombie_idle' : 'stacy_idle';
    
    // Create player sprite positioned properly on ground
    this.player = this.physics.add.sprite(320, PLAYER_GROUND_Y, idleSprite);
    this.player.setCollideWorldBounds(false);
    this.player.setDepth(10);
    
    // Proper scale for visibility at new resolution - even smaller
    this.player.setScale(0.4);
    
    // Clear any tint that may have persisted from previous game
    this.player.clearTint();
    
    // Jump frames now use the same scale as idle sprite
    
    // Physics body setup - normal sized collision box (not extended)
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    // Set hitbox to match player visual without extension
    body.setSize(this.player.width * 0.8, this.player.height * 0.9);
    body.setOffset(this.player.width * 0.1, this.player.height * 0.05);
    body.setMaxVelocity(2400, 3600);
    body.setBounce(0); // No bouncing
    body.setOffset(0, 0); // Make sure offset is clean
    
    // Start skating animation (use idle sprite)
    this.player.setTexture(idleSprite);
    
// console.log(`Player created at y=${this.player.y} with body size ${body.width}x${body.height}, ground segments at y=${PLAYER_GROUND_Y}`);
  }

  playNextBackgroundMusic() {
    // Stop current music if playing
    if (this.currentBgMusic) {
      if (this.currentBgMusic.isPlaying) {
        this.currentBgMusic.stop();
      }
      this.currentBgMusic = null;
    }
    
    // Check if music is enabled
    if (!this.musicEnabled) return;
    
    // Find next enabled song
    let attempts = 0;
    let nextTrack = this.bgMusicQueue[this.currentMusicIndex];
    
    // Skip disabled songs (but avoid infinite loop)
    while (!this.songEnabled[nextTrack] && attempts < 3) {
      this.currentMusicIndex = (this.currentMusicIndex + 1) % 3;
      nextTrack = this.bgMusicQueue[this.currentMusicIndex];
      attempts++;
    }
    
    // If all songs are disabled, don't play anything
    if (!this.songEnabled[nextTrack]) {
      return;
    }
    
    // Play the track
    this.currentBgMusic = this.sound.add(nextTrack, { 
      volume: 0.4, 
      loop: false 
    });
    this.currentBgMusic.play();
    
    // Show song title in top right
    this.showSongTitle(nextTrack);
    
    // Set up completion handler to play next track
    this.currentBgMusic.once('complete', () => {
      // Cycle through all three tracks (0, 1, 2)
      this.currentMusicIndex = (this.currentMusicIndex + 1) % 3;
      this.playNextBackgroundMusic();
    });
  }
  
  // Find and play the next enabled song  
  findAndPlayNextEnabledSong() {
    // Start from next index
    this.currentMusicIndex = (this.currentMusicIndex + 1) % 3;
    this.playNextBackgroundMusic();
  }
  
  // Helper method to play SFX only if enabled
  playSFX(key: string, config?: Phaser.Types.Sound.SoundConfig) {
    if (this.sfxEnabled) {
      this.sound.play(key, config);
    }
  }
  
  // Resume game from pause
  resumeGame(pauseText: Phaser.GameObjects.Text) {
    this.gamePaused = false;
    this.physics.resume();
    // Resume all timers
    this.time.paused = false;
    // Resume all tweens (animations)
    this.tweens.resumeAll();
    pauseText.setText('PAUSE');
    
    // Resume or restart music based on settings  
    if (this.musicEnabled) {
      if (this.currentBgMusic) {
        // Check if current track is still enabled
        const currentTrack = this.bgMusicQueue[this.currentMusicIndex];
        if (this.songEnabled[currentTrack]) {
          this.currentBgMusic.resume();
        } else {
          // Current track was disabled, find next enabled song
          this.currentBgMusic.stop();
          this.findAndPlayNextEnabledSong();
        }
      } else {
        // No music playing, find an enabled song and start
        this.findAndPlayNextEnabledSong();
      }
    } else if (this.currentBgMusic) {
      // Music was disabled, stop it
      this.currentBgMusic.stop();
    }
    
    // Remove all pause menu elements
    const elementsToRemove = [
      'pausedOverlay', 'pausedText', 'pauseMenuBg', 
      'resumeBtn', 'musicToggle', 'songsOption', 'sfxToggle', 'menuBtn',
      'confirmBg', 'confirmTitle', 'confirmText', 'yesBtn', 'noBtn',
      'musicMenuBg', 'musicTitle', 'musicBackBtn', 'songToggle_broken_code', 
      'songToggle_undead_empire', 'songToggle_menu_music', 'masterMusicToggle'
    ];
    
    elementsToRemove.forEach(name => {
      const element = this.children.getByName(name);
      if (element) element.destroy();
    });
  }
  
  // Show music submenu with individual song toggles
  showMusicSubmenu() {
    // Hide main pause menu elements
    const elementsToHide = ['pauseMenuBg', 'resumeBtn', 'musicToggle', 'songsOption', 'sfxToggle', 'menuBtn'];
    elementsToHide.forEach(name => {
      const element = this.children.getByName(name);
      if (element && 'setVisible' in element) {
        (element as any).setVisible(false);
      }
    });
    
    // Create music submenu background - extend to right edge
    const musicMenuBg = this.add.graphics();
    musicMenuBg.fillStyle(0x000000, 0.9);
    musicMenuBg.fillRect(120, 360, 520, 340); // Extended to screen edge (640 - 120 = 520)
    musicMenuBg.setDepth(201);
    musicMenuBg.setScrollFactor(0);
    musicMenuBg.setName('musicMenuBg');
    
    // Title
    const musicTitle = this.add.text(320, 400, 'MUSIC SETTINGS', {
      fontSize: '22px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffff00'
    });
    musicTitle.setOrigin(0.5, 0.5);
    musicTitle.setDepth(202);
    musicTitle.setScrollFactor(0);
    musicTitle.setName('musicTitle');
    
    // Back button
    const backBtn = this.add.text(320, 450, '< BACK', {
      fontSize: '18px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#00ff00'
    });
    backBtn.setOrigin(0.5, 0.5);
    backBtn.setDepth(202);
    backBtn.setScrollFactor(0);
    backBtn.setInteractive();
    backBtn.setName('musicBackBtn');
    
    // Song toggles
    const songs = [
      { key: 'broken_code', name: 'BROKEN CODE', y: 510 },
      { key: 'undead_empire', name: 'UNDEAD EMPIRE', y: 560 },
      { key: 'menu_music', name: 'RISE AGAIN', y: 610 }
    ];
    
    const songToggles: Phaser.GameObjects.Text[] = [];
    
    songs.forEach(song => {
      const songText = this.add.text(320, song.y, 
        `${song.name}: ${this.songEnabled[song.key] ? 'ON' : 'OFF'}`, {
        fontSize: '16px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffffff'
      });
      songText.setOrigin(0.5, 0.5);
      songText.setDepth(202);
      songText.setScrollFactor(0);
      songText.setInteractive();
      songText.setName(`songToggle_${song.key}`);
      songToggles.push(songText);
      
      // Toggle handler for each song
      songText.on('pointerdown', () => {
        this.songEnabled[song.key] = !this.songEnabled[song.key];
        songText.setText(`${song.name}: ${this.songEnabled[song.key] ? 'ON' : 'OFF'}`);
        
        // Don't do anything with music playback while paused
        // Music changes will take effect when game resumes
      });
    });
    
    // Master music toggle
    const masterToggle = this.add.text(320, 660, 
      `ALL MUSIC: ${this.musicEnabled ? 'ON' : 'OFF'}`, {
      fontSize: '16px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ff9900'
    });
    masterToggle.setOrigin(0.5, 0.5);
    masterToggle.setDepth(202);
    masterToggle.setScrollFactor(0);
    masterToggle.setInteractive();
    masterToggle.setName('masterMusicToggle');
    
    masterToggle.on('pointerdown', () => {
      this.musicEnabled = !this.musicEnabled;
      masterToggle.setText(`ALL MUSIC: ${this.musicEnabled ? 'ON' : 'OFF'}`);
      // Don't do anything with music playback while paused
      // Music changes will take effect when game resumes
    });
    
    // Back button handler
    backBtn.on('pointerdown', () => {
      // Remove music submenu elements
      const musicElements = ['musicMenuBg', 'musicTitle', 'musicBackBtn', 
                             'songToggle_broken_code', 'songToggle_undead_empire', 
                             'songToggle_menu_music', 'masterMusicToggle'];
      musicElements.forEach(name => {
        const element = this.children.getByName(name);
        if (element) element.destroy();
      });
      
      // Show main pause menu elements again
      elementsToHide.forEach(name => {
        const element = this.children.getByName(name);
        if (element && 'setVisible' in element) {
          (element as any).setVisible(true);
        }
      });
    });
  }
  
  // Show confirmation dialog for returning to menu
  showMenuConfirmation() {
    // Create confirmation background
    const confirmBg = this.add.graphics();
    confirmBg.fillStyle(0x000000, 0.95);
    confirmBg.fillRect(70, 400, 500, 200);
    confirmBg.setDepth(203);
    confirmBg.setScrollFactor(0);
    confirmBg.setName('confirmBg');
    
    const confirmTitle = this.add.text(320, 440, 'ARE YOU SURE?', {
      fontSize: '24px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffff00'
    });
    confirmTitle.setOrigin(0.5, 0.5);
    confirmTitle.setDepth(204);
    confirmTitle.setScrollFactor(0);
    confirmTitle.setName('confirmTitle');
    
    const confirmText = this.add.text(320, 490, 'Progress will be lost', {
      fontSize: '16px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff'
    });
    confirmText.setOrigin(0.5, 0.5);
    confirmText.setDepth(204);
    confirmText.setScrollFactor(0);
    confirmText.setName('confirmText');
    
    // Yes button
    const yesBtn = this.add.text(220, 550, 'YES', {
      fontSize: '20px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ff6666'
    });
    yesBtn.setOrigin(0.5, 0.5);
    yesBtn.setDepth(204);
    yesBtn.setScrollFactor(0);
    yesBtn.setInteractive();
    yesBtn.setName('yesBtn');
    
    // No button
    const noBtn = this.add.text(420, 550, 'NO', {
      fontSize: '20px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#00ff00'
    });
    noBtn.setOrigin(0.5, 0.5);
    noBtn.setDepth(204);
    noBtn.setScrollFactor(0);
    noBtn.setInteractive();
    noBtn.setName('noBtn');
    
    yesBtn.on('pointerdown', () => {
      // Stop music and go back to menu
      this.stopBackgroundMusic();
      // Properly cleanup and stop the current scene before starting the menu
      this.cleanupAndStop();
      this.scene.start('MainMenu');
    });
    
    noBtn.on('pointerdown', () => {
      // Remove confirmation dialog
      confirmBg.destroy();
      confirmTitle.destroy();
      confirmText.destroy();
      yesBtn.destroy();
      noBtn.destroy();
    });
  }
  
  showSongTitle(trackName: string) {
    // Remove existing title if present
    if (this.songTitleContainer) {
      this.songTitleContainer.destroy();
    }
    
    // Create container for song info - positioned below challenges on the right side
    // Position it further right since the box will extend to the edge
    // Move down to 350 to fully avoid overlap with challenge box
    this.songTitleContainer = this.add.container(520, 350);
    this.songTitleContainer.setScrollFactor(0);
    this.songTitleContainer.setDepth(150);
    
    // Determine display name
    const displayName = trackName === 'broken_code' ? 'BROKEN CODE' : 
                        trackName === 'undead_empire' ? 'UNDEAD EMPIRE' :
                        'RISE AGAIN';
    
    // Create background that extends to the right edge of the screen (640px width)
    // Container is at x=520, so we need the box to go from -130 to 120 (250px total) to reach the right edge at 640
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(-130, -35, 250, 75, 5);
    
    // Create song title text - positioned in the box
    const titleText = this.add.text(-10, -10, displayName, {
      fontSize: '16px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffff00'
    }).setOrigin(0.5, 0.5);
    
    // Create artist text - centered below title
    const artistText = this.add.text(-10, 15, 'By Silent Architect', {
      fontSize: '10px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);
    
    this.songTitleContainer.add([bg, titleText, artistText]);
    
    // Fade in
    this.songTitleContainer.setAlpha(0);
    this.tweens.add({
      targets: this.songTitleContainer,
      alpha: 1,
      duration: 500
    });
    
    // Fade out after 4 seconds
    this.time.delayedCall(4000, () => {
      if (this.songTitleContainer) {
        this.tweens.add({
          targets: this.songTitleContainer,
          alpha: 0,
          duration: 1000,
          onComplete: () => {
            if (this.songTitleContainer) {
              this.songTitleContainer.destroy();
              this.songTitleContainer = undefined;
            }
          }
        });
      }
    });
  }
  
  stopBackgroundMusic() {
    if (this.currentBgMusic) {
      this.currentBgMusic.stop();
      this.currentBgMusic = null;
    }
  }

  createParticleEffects() {
    // Create simple colored particles using rectangles
    
    // Jump dust particles (when taking off)
    this.dustParticles = this.add.particles(0, 0, 'pixel', {
      speed: { min: 120, max: 360 },
      scale: { start: 1.8, end: 0 },
      lifespan: 300,
      quantity: 3,
      angle: { min: 225, max: 315 }, // Spread behind player
      alpha: { start: 0.8, end: 0 },
      tint: 0x8B4513, // Brown dust color
      emitting: false
    });

    // Jump particles (blue sparkles on first jump)
    this.jumpParticles = this.add.particles(0, 0, 'pixel', {
      speed: { min: 180, max: 480 },
      scale: { start: 2.4, end: 0 },
      lifespan: 400,
      quantity: 5,
      angle: { min: 0, max: 360 },
      alpha: { start: 1, end: 0 },
      tint: 0x00FFFF, // Cyan sparkles
      emitting: false
    });

    // Trick particles (golden trail during double jump)
    this.trickParticles = this.add.particles(0, 0, 'pixel', {
      speed: { min: 60, max: 240 },
      scale: { start: 3.0, end: 0.6 },
      lifespan: 600,
      quantity: 2,
      angle: { min: 0, max: 360 },
      alpha: { start: 1, end: 0 },
      tint: 0xFFD700, // Gold trail
      emitting: false
    });

    // Set particle depths
    this.dustParticles.setDepth(5);
    this.jumpParticles.setDepth(15);
    this.trickParticles.setDepth(15);
  }

  createEnemySystem() {
// console.log('[DEBUG ENEMY SYSTEM] Creating enemy system...');
    
    // Create physics groups for enemies and explosions
    this.enemies = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    
    this.explosions = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    
    // Create group for arrow indicators
    this.arrowIndicators = this.add.group();
    
    // Start spawning enemies with a longer delay to give player time (easier start)
    this.time.delayedCall(12000, () => {
// console.log('[DEBUG ENEMY SYSTEM] Starting enemy spawning...');
      this.enemyTimer = this.time.addEvent({
        delay: 3500, // Balanced spawn rate with obstacles
        callback: this.spawnEnemy,
        callbackScope: this,
        loop: true
      });
// console.log('[DEBUG ENEMY SYSTEM] Enemy timer created with delay: 5000ms');
    });
    
    // Update enemy spawn rate based on difficulty every 30 seconds
    this.time.addEvent({
      delay: 30000,
      callback: () => {
        const gameTime = this.time.now - this.gameStartTime;
        const difficulty = this.getDifficulty(gameTime);
        this.updateEnemySpawnRate(difficulty);
        
        // Speed increase is now handled by challenge completion only
        // No automatic speed increases based on time
      },
      callbackScope: this,
      loop: true
    });
    
// console.log('[DEBUG ENEMY SYSTEM] Enemy system initialized (spawning starts in 5s)');
  }
  
  spawnEnemy() {
    const gameTime = this.time.now - this.gameStartTime;
    const difficulty = this.getDifficulty(gameTime);
    
// console.log(`[DEBUG ENEMY SPAWN] Called at gameTime=${gameTime}ms`);
    
    // Don't spawn enemies in the first 10 seconds (easier start)
    if (gameTime < 10000) {
// console.log(`[DEBUG ENEMY SPAWN] Too early, waiting...`);
      return;
    }
    
    // Spawn distance ahead of player (further out to account for warning time)
    const warningTime = 2000; // 2 seconds warning
    const playerSpeed = 5.5; // pixels per frame
    const warningDistance = (playerSpeed * 60 * warningTime) / 1000; // Distance player travels in warning time
    const spawnDistance = Phaser.Math.Between(600, 1000) + warningDistance;
    const spawnX = this.player.x + spawnDistance;
    
    // Skip if too close to last enemy
    if (spawnX - this.lastEnemyX < 400) {
      return;
    }
    
    this.lastEnemyX = spawnX;
    
    // Choose enemy type based on what's unlocked in current wave
    const unlockedEnemies: string[] = [];
    if (this.waveManager.isEnemyUnlocked('enemy_robot')) {
      unlockedEnemies.push('enemy_robot');
    }
    if (this.waveManager.isEnemyUnlocked('enemy_eyeball')) {
      unlockedEnemies.push('enemy_eyeball');
    }
    if (this.waveManager.isEnemyUnlocked('enemy_robot2')) {
      unlockedEnemies.push('enemy_robot2');
    }
    if (this.waveManager.isEnemyUnlocked('enemy_robot3')) {
      unlockedEnemies.push('enemy_robot3');
    }
    
    // If no enemies are unlocked (Wave 1), don't spawn
    if (unlockedEnemies.length === 0) {
      return;
    }
    
    const enemyType = Phaser.Utils.Array.GetRandom(unlockedEnemies);
    console.log(`[DEBUG ENEMY] Spawning enemy type: ${enemyType} from available: [${unlockedEnemies.join(', ')}]`);
    
    // Determine height based on difficulty and randomness
    let enemyY;
    const randomChoice = Math.random();
    
    if (randomChoice < 0.5) {
      // Low enemy - easily reachable with first jump
      enemyY = PLAYER_GROUND_Y - Phaser.Math.Between(120, 180);
    } else if (randomChoice < 0.85) {
      // Medium enemy - comfortable first jump height
      enemyY = PLAYER_GROUND_Y - Phaser.Math.Between(200, 260);
    } else {
      // High enemy - requires double jump but not too high
      enemyY = PLAYER_GROUND_Y - Phaser.Math.Between(320, 400);
    }
    
    // Check if this Y position conflicts with recent sandwich or energy drink spawn (reduced to 3 seconds)
    const timeSinceLastSandwich = (this.time.now - this.lastSandwichSpawnTime) / 1000;
    const timeSinceLastEnergyDrink = (this.time.now - this.lastEnergyDrinkSpawnTime) / 1000;
    
    if (timeSinceLastSandwich < 3 && Math.abs(enemyY - this.lastSandwichY) < 100) {
// console.log(`[DEBUG ENEMY SPAWN] Skipping - too close to recent sandwich at Y=${this.lastSandwichY}`);
      return;
    }
    
    if (timeSinceLastEnergyDrink < 3 && Math.abs(enemyY - this.lastEnergyDrinkY) < 100) {
// console.log(`[DEBUG ENEMY SPAWN] Skipping - too close to recent energy drink at Y=${this.lastEnergyDrinkY}`);
      return;
    }
    
    // Store enemy spawn info
    this.lastEnemyY = enemyY;
    this.lastEnemySpawnTime = this.time.now;
    
    // Create arrow indicator on right side of screen (always show during Fire Taco)
    // Since arrow uses scrollFactor(0), we need viewport coordinates, not world coordinates
    let arrow: Phaser.GameObjects.Sprite | null = null;
    
    // Always create arrow indicator (removed Fire Taco check per user request)
    arrow = this.arrowIndicators.create(590, enemyY, 'arrow_indicator') as Phaser.GameObjects.Sprite;
    arrow.setScale(0.05); // Start small
    arrow.setDepth(102); // Above UI
    arrow.setScrollFactor(0); // Keep fixed on screen
    
    // Position arrow on right side of viewport with correct Y coordinate relative to viewport
    // Convert world Y to viewport Y (since we're using scrollFactor 0)
    arrow.x = 590; // Near right edge of 640px screen
    arrow.y = enemyY; // This is already the correct Y position in world coords
    
    // DEBUG: Log arrow creation details
// console.log(`[DEBUG ARROW] Created arrow at viewport position (${arrow.x}, ${arrow.y})`);
// console.log(`[DEBUG ARROW] Enemy will spawn at world Y=${enemyY}`);
// console.log(`[DEBUG ARROW] Arrow properties: scale=${arrow.scale}, depth=${arrow.depth}, scrollFactor=${arrow.scrollFactorX},${arrow.scrollFactorY}`);
    
    // Flash the arrow for visibility
    const arrowTween = this.tweens.add({
      targets: arrow,
      alpha: { from: 1, to: 0.5 },
      duration: 400,
      yoyo: true,
      repeat: -1
    });
    
    // Grow arrow from small to full size over time
    // Ensure arrow starts at correct scale
    arrow.setScale(0.05);
    const growTween = this.tweens.add({
      targets: arrow,
      scale: 0.15, // Just target scale, from is already set
      duration: 1500,
      ease: 'Power2'
    });
    
    // Store tween references on arrow for cleanup
    (arrow as any).flashTween = arrowTween;
    (arrow as any).growTween = growTween;
    
    // Spawn enemy after warning delay
    this.time.delayedCall(warningTime, () => {
      // Remove arrow indicator now that enemy is spawning (if it exists)
      if (arrow) {
        // Stop and remove the tweens before destroying arrow
        const arrowTween = (arrow as any).flashTween;
        if (arrowTween) {
          arrowTween.stop();
          arrowTween.remove();
        }
        const growTween = (arrow as any).growTween;
        if (growTween) {
          growTween.stop();
          growTween.remove();
        }
        arrow.destroy();
      }
      
      // Calculate spawn position to be just off-screen when accounting for player movement
      const adjustedSpawnX = this.player.x + 660; // Spawn just off the right edge of screen
      
      // Create enemy
      const enemy = this.enemies.create(adjustedSpawnX, enemyY, enemyType) as Phaser.Physics.Arcade.Sprite;
      enemy.setScale(0.15); // Slightly bigger for visibility
      enemy.setDepth(14);
      enemy.setImmovable(true);
      enemy.setPushable(false);
      enemy.setVisible(true); // Ensure visible
      enemy.setAlpha(1); // Full opacity
      
      // DEBUG: Log enemy creation details
// console.log(`[DEBUG ENEMY] Created ${enemyType} at world position (${adjustedSpawnX}, ${enemyY})`);
// console.log(`[DEBUG ENEMY] Player position: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`);
// console.log(`[DEBUG ENEMY] Distance from player: ${adjustedSpawnX - this.player.x}px`);
// console.log(`[DEBUG ENEMY] Enemy properties: scale=${enemy.scale}, depth=${enemy.depth}, visible=${enemy.visible}, alpha=${enemy.alpha}`);
// console.log(`[DEBUG ENEMY] Enemy texture: ${enemy.texture.key}, frame: ${enemy.frame.name}`);
// console.log(`[DEBUG ENEMY] Enemy dimensions: width=${enemy.width}, height=${enemy.height}`);
// console.log(`[DEBUG ENEMY] Camera scrollX: ${this.cameras.main.scrollX}`);
      const screenX = adjustedSpawnX - this.cameras.main.scrollX;
// console.log(`[DEBUG ENEMY] Enemy screen position: ${Math.round(screenX)}px from left edge`);
      
      // Store reference to arrow on enemy so we can remove it when enemy appears
      (enemy as any).arrow = arrow;
      
      // Set smaller hitbox for enemy (reduced from 0.7 to 0.5 for more forgiving gameplay)
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      body.setSize(enemy.width * 0.5, enemy.height * 0.5);
      
      // Set very slow horizontal movement speed (enemies move backwards relative to player)
      body.setVelocityX(-80); // Slightly faster to be visible on screen longer
      
      // Add floating animation
      this.tweens.add({
        targets: enemy,
        y: enemyY - 20,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
// console.log(`[ENEMY] Spawned ${enemyType} at (${spawnX}, ${enemyY}) after warning`);
    });
    
// console.log(`[ARROW] Indicator shown at Y=${enemyY}, enemy will spawn at X=${spawnX} in 2 seconds`);
  }
  
  stompEnemy(enemy: Phaser.GameObjects.Sprite, isStomped: boolean = true) {
    console.log('[DEBUG STOMP] stompEnemy called with:', enemy?.texture?.key, 'isStomped:', isStomped);
    
    // Safety check - ensure enemy exists and hasn't been destroyed
    if (!enemy || !enemy.active) {
      console.log('[DEBUG STOMP] stompEnemy called on invalid enemy');
      return;
    }
    
    // Only prevent processing if game is paused - stomps should still work when game is ending
    if (this.gamePaused) {
      console.log('[DEBUG STOMP] Game paused, skipping stomp');
      return;
    }
    
    // Cache enemy properties before destroying
    const enemyX = enemy.x;
    const enemyY = enemy.y;
    const enemyTextureKey = enemy.texture?.key;
    
    // Increment enemies defeated counter
    this.enemiesDefeated++;
    this.totalEnemiesStomped++;
    
    // Track for challenges
    console.log('[DEBUG STOMP] Updating stomp challenge for enemy:', enemyTextureKey);
    try {
      this.challengeManager.updateChallenge('stomp_enemies', 1);
      this.updateChallengeDisplay();
      console.log('[DEBUG STOMP] Challenge update successful');
    } catch (error) {
      console.error('[DEBUG STOMP] Error updating challenges:', error);
    }
    
    // Register enemy kill with combo system
    if (this.comboTracker) {
      try {
        this.comboTracker.registerEnemyKill(this.score, this.isGrounded);
        // Track best combo
        const comboState = this.comboTracker.getComboState();
        if (comboState.multiplier > this.bestCombo) {
          this.bestCombo = comboState.multiplier;
        }
      } catch (error) {
        console.error('[DEBUG] Error registering enemy kill with combo:', error);
      }
    }
    
    // Show "Robo Kill" message for robot enemies
    if ((enemyTextureKey === 'enemy_robot' || enemyTextureKey === 'enemy_robot2' || enemyTextureKey === 'enemy_robot3') && this.trickMessageManager) {
      try {
        this.trickMessageManager.addMessage('Robo Kill', 1);
      } catch (error) {
        console.error('[DEBUG] Error adding message:', error);
      }
    }
    
    // Handle robot enemies differently - they sink down instead of exploding
    if (enemyTextureKey === 'enemy_robot' || enemyTextureKey === 'enemy_robot2' || enemyTextureKey === 'enemy_robot3') {
      console.log(`[DEBUG ROBOT] Robot collision - FireTaco: ${this.fireTacoActive}, isStomped: ${isStomped}`);
      // Check if touched (not stomped) while Fire Taco is active - then they explode
      if (this.fireTacoActive && !isStomped) {
        console.log('[DEBUG ROBOT] Robot exploding from Fire Taco touch!');
        // Fire Taco touch - robots explode!
        if (this.enemies.contains(enemy)) {
          this.enemies.remove(enemy);
        }
        enemy.destroy();
        
        // Create explosion at cached enemy position
        if (this.explosions) {
          const explosion = this.explosions.create(enemyX, enemyY, 'explosion') as Phaser.Physics.Arcade.Sprite;
          explosion.setScale(0.3);
          explosion.setDepth(15);
          
          this.tweens.add({
            targets: explosion,
            scale: 0.5,
            alpha: 0,
            duration: 500,
            onComplete: () => {
              if (this.explosions.contains(explosion)) {
                this.explosions.remove(explosion);
              }
              explosion.destroy();
            }
          });
        }
        
        // Play explosion sound
        this.playSFX('new_explosion_sfx', { volume: 0.3 });
      } else {
        console.log('[DEBUG ROBOT] Normal stomp - robot should dip down');
        // Normal stomp - make robot sink down but stay visible
        // Mark as defeated so it doesn't hurt player anymore
        enemy.setData('defeated', true);
        
        // Remove from physics group so no more collisions
        if (this.enemies.contains(enemy)) {
          this.enemies.remove(enemy);
        }
        
        // Make robot sink down with EXTREME visual feedback
        console.log('[DEBUG ROBOT] Creating EXTREME robot squish animation');
        
        // Store original values
        const originalY = enemy.y;
        const originalScaleX = enemy.scaleX || 1;
        const originalScaleY = enemy.scaleY || 1;
        
        // INSTANT VISUAL FEEDBACK - no delays!
        enemy.setTint(0xffff00); // Bright yellow flash first
        enemy.setDepth(20); // Bring to front so it's visible
        
        // Create a dramatic impact effect - HUGE instant squish
        enemy.y = originalY + 60; // BIG drop
        enemy.setScale(originalScaleX * 2.5, originalScaleY * 0.15); // SUPER wide and flat
        enemy.setAlpha(1); // Full visibility for impact
        
        // First bounce - spring back up a bit
        this.tweens.add({
          targets: enemy,
          y: originalY + 10,  // Bounce up
          scaleX: originalScaleX * 1.8,
          scaleY: originalScaleY * 0.3,
          tint: 0xff0000,  // Turn red
          duration: 150,
          ease: 'Power2',
          onComplete: () => {
            // Second squish - final position
            this.tweens.add({
              targets: enemy,
              y: originalY + 35,  // Final squished position
              scaleX: originalScaleX * 1.4,
              scaleY: originalScaleY * 0.4,
              alpha: 0.5,
              tint: 0x880000,  // Dark red
              duration: 200,
              ease: 'Bounce.out',
              onComplete: () => {
                console.log('[DEBUG ROBOT] EXTREME squish complete!');
                enemy.setDepth(10); // Return to normal depth
              }
            });
          }
        });
        
        // Play a mechanical sound for robot defeat
        this.playSFX('new_explosion_sfx', { volume: 0.15 }); // Quieter for robot squish
      }
    } else {
      // Non-robot enemies still explode - but double-check it's not a robot
      if (enemyTextureKey !== 'enemy_robot') {
        if (this.enemies.contains(enemy)) {
          this.enemies.remove(enemy);
        }
        enemy.destroy();
      } else {
        // This shouldn't happen but just in case - treat it as a robot stomp
        console.warn('[DEBUG ROBOT] WARNING: Robot in wrong branch, treating as stomp');
        enemy.setData('defeated', true);
        if (this.enemies.contains(enemy)) {
          this.enemies.remove(enemy);
        }
        enemy.setTint(0xff9999);
        enemy.setAlpha(0.7);
      }
      
      // Create explosion at cached enemy position
      if (this.explosions) {
        const explosion = this.explosions.create(enemyX, enemyY, 'explosion') as Phaser.Physics.Arcade.Sprite;
        explosion.setScale(0.3);
        explosion.setDepth(15);
        
        // Animate explosion
        this.tweens.add({
          targets: explosion,
          scale: 0.5,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            if (explosion && explosion.active) {
              explosion.destroy();
            }
          }
        });
      }
    }
    
    // Play new explosion sound effect
    this.playSFX('new_explosion_sfx', { volume: 0.4 });
    
    // Add score
    this.score += 50;
    this.scoreText.setText('Score: ' + this.score);
    
    // Play particle effect at cached position
    if (this.jumpParticles) {
      this.jumpParticles.setPosition(enemyX, enemyY);
      this.jumpParticles.explode(10);
    }
    
// console.log('Enemy stomped!');
  }
  
  cleanupObstacleFireEffects(obstacle: Phaser.GameObjects.Sprite) {
    // Clean up fire update timer if it exists
    const fireUpdateTimer = obstacle.getData('fireUpdateTimer');
    if (fireUpdateTimer) {
      fireUpdateTimer.remove();
      obstacle.setData('fireUpdateTimer', null);
    }
    
    // Clean up fire effects if they exist
    const fireEffects = obstacle.getData('fireEffects');
    if (fireEffects) {
      fireEffects.forEach((fire: any) => {
        if (fire && fire.destroy) fire.destroy();
      });
      obstacle.setData('fireEffects', null);
    }
    
    // No need to clear tint since we don't flash anymore
  }

  bouncePlayer() {
    // Give player a strong, satisfying bounce
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setVelocityY(this.bounceVelocity);
    
    // Add a little forward boost for extra momentum
    const currentVelX = playerBody.velocity.x;
    playerBody.setVelocityX(Math.min(currentVelX + 80, 450));
    
    // Reset jump state - player gets ONE more jump after stomping
    this.isGrounded = false; // Important: player is now airborne after bounce
    this.jumpCount = 1; // Set to 1 so they can only do ONE more jump (double jump)
    this.hasDoubleJumped = false;
    this.hasUsedTrick = false; // Reset trick ability after stomping enemy
    // Show jump sprite since player is bouncing up
    const jumpSprite = this.selectedCharacter === 'kev' ? 'zombie_jump' : 'stacy_jump';
    this.player.setTexture(jumpSprite);
    this.player.setScale(this.jumpScale);
    
    // Restore more stamina as reward for successful stomp
    this.stamina = Math.min(this.maxStamina, this.stamina + 35);
    this.updateStaminaBar();
    
    // Camera shake removed for smoother gameplay
    
    // Create extra particles for impact
    this.jumpParticles.setPosition(this.player.x, this.player.y);
    this.jumpParticles.explode(15);
    
    // Award 1 star for stomping enemies
    const starReward = 1;
    this.collectStars(starReward);
    
    // Visual feedback for star collection
    const starBurst = this.add.image(this.player.x, this.player.y - 50, 'star_counter_icon');
    starBurst.setScale(0.15);
    starBurst.setDepth(16);
    this.tweens.add({
      targets: starBurst,
      y: starBurst.y - 100,
      alpha: 0,
      scale: 0.15,
      duration: 800,
      onComplete: () => starBurst.destroy()
    });
    
// console.log('Player bounced high off enemy!');
  }

  createObstacleSystem() {
    // Create physics group for obstacles with gravity disabled
    this.obstacles = this.physics.add.group({ 
      allowGravity: false, 
      immovable: true 
    });

    // Create score display
    this.scoreText = this.add.text(50, 50, 'Score: 0', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: '"Press Start 2P", monospace',
      stroke: '#000000',
      strokeThickness: 4
    });
    this.scoreText.setDepth(100);
    this.scoreText.setScrollFactor(0); // Keep fixed on screen
    
    // Create stamina bar (now below health)
    this.staminaBarBg = this.add.graphics();
    this.staminaBarBg.fillStyle(0x000000, 0.5);
    this.staminaBarBg.fillRect(50, 170, 204, 24);
    this.staminaBarBg.setDepth(100);
    this.staminaBarBg.setScrollFactor(0);
    
    this.staminaBar = this.add.graphics();
    this.staminaBar.setDepth(101);
    this.staminaBar.setScrollFactor(0);
    this.updateStaminaBar();
    
    // Create health bar (now above stamina)
    this.healthBarBg = this.add.graphics();
    this.healthBarBg.fillStyle(0x000000, 0.5);
    this.healthBarBg.fillRect(50, 110, 204, 24);
    this.healthBarBg.setDepth(100);
    this.healthBarBg.setScrollFactor(0);
    
    this.healthBar = this.add.graphics();
    this.healthBar.setDepth(101);
    this.healthBar.setScrollFactor(0);
    this.updateHealthBar();
    
    // Add health label
    this.healthText = this.add.text(50, 88, 'HEALTH', {
      fontSize: '18px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 4
    }).setDepth(100).setScrollFactor(0);
    
    // Add stamina label (now below health)
    this.add.text(50, 148, 'STAMINA', {
      fontSize: '18px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setDepth(100).setScrollFactor(0)
    
    // Add pause button with black background (bigger)
    const pauseBg = this.add.graphics();
    pauseBg.fillStyle(0x000000, 0.8);
    pauseBg.fillRect(50, 200, 140, 40);
    pauseBg.setDepth(100);
    pauseBg.setScrollFactor(0);
    pauseBg.setInteractive(new Phaser.Geom.Rectangle(50, 200, 140, 40), Phaser.Geom.Rectangle.Contains);
    
    const pauseText = this.add.text(120, 220, 'PAUSE', {
      fontSize: '20px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff'
    });
    pauseText.setOrigin(0.5, 0.5);
    pauseText.setDepth(101);
    pauseText.setScrollFactor(0);
    pauseText.setInteractive();
    
    // Pause button handler
    const handlePause = () => {
      if (!this.gamePaused && !this.gameOverTriggered) {
        this.gamePaused = true;
        this.physics.pause();
        // Pause all timers
        this.time.paused = true;
        // Pause all tweens (animations)
        this.tweens.pauseAll();
        pauseText.setText('RESUME');
        
        // Pause music
        if (this.currentBgMusic) {
          this.currentBgMusic.pause();
        }
        
        // Show paused overlay
        const pausedOverlay = this.add.graphics();
        pausedOverlay.fillStyle(0x000000, 0.7);
        pausedOverlay.fillRect(0, 0, 640, 960);
        pausedOverlay.setDepth(200);
        pausedOverlay.setScrollFactor(0);
        pausedOverlay.setName('pausedOverlay');
        
        // Title
        const pausedText = this.add.text(320, 320, 'PAUSED', {
          fontSize: '48px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#ffff00',
          stroke: '#000000',
          strokeThickness: 8
        });
        pausedText.setOrigin(0.5, 0.5);
        pausedText.setDepth(201);
        pausedText.setScrollFactor(0);
        pausedText.setName('pausedText');
        
        // Create menu background (slightly taller for extra option)
        const menuBg = this.add.graphics();
        menuBg.fillStyle(0x000000, 0.9);
        menuBg.fillRect(120, 380, 400, 300);
        menuBg.setDepth(201);
        menuBg.setScrollFactor(0);
        menuBg.setName('pauseMenuBg');
        
        // Resume button
        const resumeBtn = this.add.text(320, 420, 'RESUME', {
          fontSize: '24px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#00ff00'
        });
        resumeBtn.setOrigin(0.5, 0.5);
        resumeBtn.setDepth(202);
        resumeBtn.setScrollFactor(0);
        resumeBtn.setInteractive();
        resumeBtn.setName('resumeBtn');
        
        // Music toggle button
        const musicText = this.add.text(320, 470, `MUSIC: ${this.musicEnabled ? 'ON' : 'OFF'}`, {
          fontSize: '20px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#ffffff'
        });
        musicText.setOrigin(0.5, 0.5);
        musicText.setDepth(202);
        musicText.setScrollFactor(0);
        musicText.setInteractive();
        musicText.setName('musicToggle');
        
        // SFX toggle  
        const sfxText = this.add.text(320, 520, `SFX: ${this.sfxEnabled ? 'ON' : 'OFF'}`, {
          fontSize: '20px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#ffffff'
        });
        sfxText.setOrigin(0.5, 0.5);
        sfxText.setDepth(202);
        sfxText.setScrollFactor(0);
        sfxText.setInteractive();
        sfxText.setName('sfxToggle');
        
        // Song List submenu button
        const songsText = this.add.text(320, 570, 'SONG LIST', {
          fontSize: '20px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#ffffff'
        });
        songsText.setOrigin(0.5, 0.5);
        songsText.setDepth(202);
        songsText.setScrollFactor(0);
        songsText.setInteractive();
        songsText.setName('songsOption');
        
        // Back to Menu button
        const menuBtn = this.add.text(320, 620, 'BACK TO MENU', {
          fontSize: '20px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#ff6666'
        });
        menuBtn.setOrigin(0.5, 0.5);
        menuBtn.setDepth(202);
        menuBtn.setScrollFactor(0);
        menuBtn.setInteractive();
        menuBtn.setName('menuBtn');
        
        // Button handlers
        resumeBtn.on('pointerdown', () => {
          this.resumeGame(pauseText);
        });
        
        musicText.on('pointerdown', () => {
          this.musicEnabled = !this.musicEnabled;
          musicText.setText(`MUSIC: ${this.musicEnabled ? 'ON' : 'OFF'}`);
          // If turning off music and it's playing, stop it
          if (!this.musicEnabled && this.currentBgMusic) {
            this.currentBgMusic.stop();
          }
          // If turning on music, it will start when game resumes
        });
        
        songsText.on('pointerdown', () => {
          this.showMusicSubmenu();
        });
        
        sfxText.on('pointerdown', () => {
          this.sfxEnabled = !this.sfxEnabled;
          sfxText.setText(`SFX: ${this.sfxEnabled ? 'ON' : 'OFF'}`);
          // Play a test sound if turning on
          if (this.sfxEnabled) {
            this.playSFX('jump_sfx', { volume: 0.2 });
          }
        });
        
        menuBtn.on('pointerdown', () => {
          // Show confirmation dialog
          this.showMenuConfirmation();
        });
        
      } else if (this.gamePaused) {
        this.resumeGame(pauseText);
      }
    };
    
    pauseText.on('pointerdown', handlePause);
    pauseBg.on('pointerdown', handlePause);
    
    // Also allow P key to pause (both uppercase and lowercase)
    // Store reference for cleanup
    this.pauseListener = handlePause;
    this.input.keyboard?.on('keydown-P', this.pauseListener);
    this.input.keyboard?.on('keydown-KeyP', this.pauseListener);
    
    // Create life counter above star counter
    this.createLifeDisplay();
    
    // Create star counter UI further down to avoid overlap - positioned slightly more to the right
    this.starIcon = this.add.image(500, 145, 'star_counter_icon');
    this.starIcon.setScale(0.08); // Keep original size
    this.starIcon.setDepth(100);
    this.starIcon.setScrollFactor(0);
    
    this.starText = this.add.text(540, 145, '0', {
      fontSize: '22px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 4
    });
    this.starText.setDepth(100);
    this.starText.setScrollFactor(0);
    this.starText.setOrigin(0, 0.5);

    // Start spawning obstacles
// console.log('Setting up obstacle spawning timer');
    this.obstacleTimer = this.time.addEvent({
      delay: 3500, // Match enemy spawn rate for balance
      callback: () => {
        // Reset challenge timer when gameplay actually starts (only once)
        if (!this.hasResetChallengeTimer) {
          this.challengeManager.resetStartTime();
          this.hasResetChallengeTimer = true;
        }
        this.spawnObstacle();
      },
      callbackScope: this,
      loop: true
    });
    
// console.log('Obstacle system initialized');
  }

  spawnObstacle() {
    const gameTime = this.time.now - this.gameStartTime;
    const difficulty = this.getDifficulty(gameTime);
    
// console.log(`Spawning obstacle - gameTime: ${gameTime}ms, difficulty: ${difficulty}`);
    
    // Add warning time for arrow indicator
    const warningTime = 2000; // 2 seconds warning for obstacles (same as enemies/pickups)
    const playerSpeed = 5.5; // pixels per frame
    const warningDistance = (playerSpeed * 60 * warningTime) / 1000;
    
    // Determine spawn distance based on difficulty - spawn closer so they're visible
    const minDistance = Math.max(400 - difficulty * 25, 150) + warningDistance; 
    const maxDistance = Math.max(800 - difficulty * 50, 300) + warningDistance;
    const spawnDistance = Phaser.Math.Between(minDistance, maxDistance);
    
    const spawnX = this.player.x + spawnDistance;
    
// console.log(`Spawn location: playerX=${this.player.x}, spawnX=${spawnX}, distance=${spawnDistance}`);
    
    // Skip if too close to last obstacle
    if (spawnX - this.lastObstacleX < minDistance) {
// console.log(`Skipping spawn - too close to last obstacle`);
      return;
    }
    
    this.lastObstacleX = spawnX;
    
    // Choose obstacle type based on difficulty
    const obstacleType = this.chooseObstacleType(difficulty);
    
// console.log(`Creating obstacle: ${obstacleType} at x=${spawnX}`);
    
    // Create arrow indicator for ground obstacle
    const arrow = this.arrowIndicators.create(590, OBSTACLE_GROUND_Y - 50, 'arrow_indicator') as Phaser.GameObjects.Sprite;
    arrow.setScale(0.05); // Start small like enemy indicators
    arrow.setDepth(102); // Above UI
    arrow.setScrollFactor(0); // Keep fixed on screen
    arrow.x = 590; // Near right edge of 640px screen
    arrow.y = OBSTACLE_GROUND_Y - 50; // Position arrow slightly above ground obstacle
    
    // Flash the arrow for visibility
    const arrowTween = this.tweens.add({
      targets: arrow,
      alpha: { from: 1, to: 0.5 },
      duration: 400,
      yoyo: true,
      repeat: -1
    });
    
    // Grow arrow from small to full size over time
    // Ensure arrow starts at correct scale
    arrow.setScale(0.05);
    const growTween = this.tweens.add({
      targets: arrow,
      scale: 0.15, // Just target scale, from is already set
      duration: 1500,
      ease: 'Power2'
    });
    
    // Store tween references on arrow for cleanup
    (arrow as any).flashTween = arrowTween;
    (arrow as any).growTween = growTween;
    
// console.log(`[DEBUG ARROW] Created arrow for obstacle at viewport Y=${arrow.y}`);
    
    // Spawn obstacle after warning delay
    this.time.delayedCall(warningTime, () => {
      // Remove arrow with both tweens
      const flashTween = (arrow as any).flashTween;
      if (flashTween) {
        flashTween.stop();
        flashTween.remove();
      }
      const growTween = (arrow as any).growTween;
      if (growTween) {
        growTween.stop();
        growTween.remove();
      }
      arrow.destroy();
      
      // Recalculate spawn position based on current player position
      // The obstacle should appear just off-screen when the delay ends
      const adjustedSpawnX = this.player.x + 700; // Spawn just ahead of visible area
      
// console.log(`[DEBUG OBSTACLE] Spawning at adjusted position: ${adjustedSpawnX} (was ${spawnX})`);
      
      // Spawn single obstacle or pattern based on difficulty
      if (difficulty > 3 && Math.random() < 0.3) {
        this.spawnObstaclePattern(adjustedSpawnX, obstacleType);
      } else {
        this.createSingleObstacle(adjustedSpawnX, obstacleType);
      }
    });
    
    // Update spawn rate based on difficulty
    this.updateSpawnRate(difficulty);
  }

  getDifficulty(gameTime: number): number {
    // Difficulty increases every 30 seconds, maxes at level 10
    const level = Math.min(Math.floor(gameTime / 30000), 10);
// console.log(`[DIFFICULTY] Level ${level} at ${Math.floor(gameTime/1000)}s`);
    return level;
  }

  chooseObstacleType(difficulty: number): string {
    // Get unlocked obstacles for current wave
    const unlockedObstacles = this.obstacleTypes.filter(type => 
      this.waveManager.isObstacleUnlocked(type)
    );
    
    // If no obstacles are unlocked (shouldn't happen), default to trash
    if (unlockedObstacles.length === 0) {
      return 'obstacle_trash';
    }
    
    let availableTypes = [...unlockedObstacles]; // Use only unlocked obstacles
    
    // Check if last 2 obstacles are the same
    if (this.recentObstacles.length >= 2 && 
        this.recentObstacles[0] === this.recentObstacles[1]) {
      // Remove that obstacle type from available choices to prevent 3 in a row
      const lastType = this.recentObstacles[0];
      availableTypes = availableTypes.filter(type => type !== lastType);
      
      // If we filtered out all options, reset to full unlocked list
      if (availableTypes.length === 0) {
        availableTypes = [...unlockedObstacles];
      }
    }
    
    // Add some structure to spawning based on wave
    let chosenType: string;
    const currentWave = this.waveManager.getCurrentWave();
    
    if (currentWave >= 2 && Math.random() < 0.3) {
      // 30% chance to spawn harder obstacles in later waves
      const harderTypes = availableTypes.filter(type => 
        type.includes('cone') || type.includes('skulls')
      );
      if (harderTypes.length > 0) {
        chosenType = Phaser.Utils.Array.GetRandom(harderTypes);
      } else {
        chosenType = Phaser.Utils.Array.GetRandom(availableTypes);
      }
    } else {
      chosenType = Phaser.Utils.Array.GetRandom(availableTypes);
    }
    
    // Update recent obstacles tracking
    this.recentObstacles.unshift(chosenType); // Add to front
    if (this.recentObstacles.length > 2) {
      this.recentObstacles.pop(); // Keep only last 2
    }
    
    return chosenType;
  }

  createSingleObstacle(x: number, type: string) {
    // First check if the texture exists
    if (!this.textures.exists(type)) {
      console.error(`Texture ${type} does not exist!`);
      return;
    }
    
    // Create obstacle through the physics group - this is the fix!
    const obstacle = this.obstacles.create(x, OBSTACLE_GROUND_Y, type) as Phaser.Physics.Arcade.Sprite;
    // Make zombie obstacle slightly bigger than others
    const scale = type === 'obstacle_zombie' ? 0.17 : 0.15;
    obstacle.setScale(scale);
    obstacle.setDepth(8);
    obstacle.setOrigin(0.5, 1); // Bottom center origin so it sits ON the ground
    obstacle.setImmovable(true); // Make obstacle static
    obstacle.setPushable(false); // Can't be pushed by player
    
    // Set physics body to bridge height gap between player and obstacle
    const body = obstacle.body as Phaser.Physics.Arcade.Body;
    // Make hitbox taller to reach up to player level
    body.setSize(obstacle.width * 0.8, obstacle.height + 110);
    // Offset up to bridge the gap between player at 850 and obstacle at 956 (106px gap)
    body.setOffset(obstacle.width * 0.1, -110);
    
// console.log(`Created ground obstacle: ${type} at (${x}, ${OBSTACLE_GROUND_Y}) sitting on ground`);
// console.log(`Total obstacles: ${this.obstacles.children.size}`);
  }

  spawnObstaclePattern(x: number, type: string) {
    // Create obstacle patterns for higher difficulty
    const patternType = Phaser.Math.Between(1, 3);
    
// console.log(`[DEBUG OBSTACLE] Creating pattern type ${patternType} at x=${x}`);
    
    switch (patternType) {
      case 1: // Double obstacle
        this.createSingleObstacle(x, type);
        this.createSingleObstacle(x + 200, type);
        break;
      case 2: // Triple spread
        this.createSingleObstacle(x, type);
        this.createSingleObstacle(x + 150, type);
        this.createSingleObstacle(x + 300, type);
        break;
      case 3: // Mixed types
        this.createSingleObstacle(x, type);
        const secondType = Phaser.Utils.Array.GetRandom(this.obstacleTypes);
        this.createSingleObstacle(x + 250, secondType);
        break;
    }
  }

  updateSpawnRate(difficulty: number) {
    // Don't recreate timer constantly - only when difficulty actually changes
    if (difficulty === this.lastDifficulty) return;
    this.lastDifficulty = difficulty;
    
    // Remove existing obstacle timer only
    if (this.obstacleTimer) {
      this.obstacleTimer.remove();
    }
    
    // Wave-based spawn rates for obstacles
    const currentWave = this.waveManager.getCurrentWave();
    let baseDelay = 4500; // Default for Wave 1
    
    // Adjust base delay by wave
    if (currentWave === 2) {
      baseDelay = 3800; // Slightly faster in Wave 2
    } else if (currentWave === 3) {
      baseDelay = 3200; // Even faster in Wave 3
    }
    
    // Additional reduction based on time-based difficulty within the wave
    const difficultyReduction = difficulty * 150; // Gentler progression
    const newDelay = Math.max(baseDelay - difficultyReduction, 2000); // Min 2 seconds
    
    this.obstacleTimer = this.time.addEvent({
      delay: newDelay,
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true
    });
  }
  
  updateEnemySpawnRate(difficulty: number) {
    // Update enemy spawn rate based on wave and difficulty
    if (this.enemyTimer) {
      this.enemyTimer.remove();
    }
    
    // Wave-based spawn rates for enemies
    const currentWave = this.waveManager.getCurrentWave();
    let baseDelay = 5000; // Default for Wave 1 (enemies less frequent than obstacles)
    
    // Adjust base delay by wave
    if (currentWave === 2) {
      baseDelay = 4200; // More enemies in Wave 2
    } else if (currentWave === 3) {
      baseDelay = 3500; // Even more in Wave 3 (Final Wave)
    }
    
    // Additional reduction based on time-based difficulty within the wave
    const difficultyReduction = difficulty * 200; // Moderate progression
    let newDelay = Math.max(baseDelay - difficultyReduction, 2200); // Min 2.2 seconds
    
    // Don't modify spawn rate for any power-ups - keep it consistent
    
    this.enemyTimer = this.time.addEvent({
      delay: newDelay,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });
    
// console.log(`[DEBUG ENEMY SYSTEM] Wave ${currentWave}: enemy spawn rate ${newDelay}ms for difficulty ${difficulty}`);
  }

  gameOver() {
    const survivalTime = this.time.now - this.gameStartTime;
// console.log(`[DEBUG GAME OVER] Final Score: ${this.score}, Survival Time: ${survivalTime}ms`);
// console.log(`[DEBUG GAME OVER] Health at death: ${this.health}, Lives remaining: ${this.lives}`);
    
    // Check if player has lives left
    if (this.lives > 0) {
      // Use a life and respawn (don't stop music)
      this.lives--;
      this.updateLifeDisplay();
      this.respawnPlayer();
// console.log(`[RESPAWN] Using life, ${this.lives} lives remaining`);
    } else {
      // No lives left - actual game over
// console.log('[GAME OVER] No lives remaining - ending game');
      
      // Stop background music only on actual game over
      this.stopBackgroundMusic();
      
      // Clean up any active power-up effects to prevent memory leaks
      if (this.fireTacoActive) {
        this.endFireTacoEffect();
      }
      
      // Stop all timers to prevent them from running after game over
      if (this.obstacleTimer) this.obstacleTimer.remove();
      if (this.sandwichTimer) this.sandwichTimer.remove();
      if (this.enemyTimer) this.enemyTimer.remove();
      
      // Transition to GameOver scene with score, time, and collectibles
      this.scene.start('GameOver', { 
        score: this.score, 
        time: survivalTime,
        sandwiches: this.sandwichesCollected,
        cans: this.cansCollected,
        stars: this.stars, // Add stars collected
        enemies: this.enemiesDefeated // Add enemies defeated
      });
    }
  }

  // calculateJumpFrameScales removed - all frames now use same scale

  // No animation needed - just show jump sprite immediately

  handleLanding() {
    this.isGrounded = true;
    this.hasDoubleJumped = false;
    this.trickActive = false;
    this.hasUsedTrick = false; // Reset trick when landing
    this.jumpCount = 0;
    
    // Metal Boot is now passive - it only prevents damage from floor obstacles
    // No shockwave effect on landing
    
    // Handle old stomp landing (can be removed later)
    if (this.isStomping) {
      this.isStomping = false;
      // Disable stomp hitbox
      if (this.stompHitbox && this.stompHitbox.body) {
        (this.stompHitbox.body as any).enable = false;
      }
      // Create impact effect on landing
      this.jumpParticles.setPosition(this.player.x, PLAYER_GROUND_Y);
      this.jumpParticles.explode(30);
      // Clear tint
      if (!this.invulnerable && !this.metalBootActive && !this.fireTacoActive && !this.crystalMagnetActive && !this.staminaBoostActive) {
        this.player.clearTint();
      }
    }
    
    // Return to normal gravity and restart skate animation when landing
    this.physics.world.gravity.y = this.GRAVITY;
    // Return to idle sprite when landing
    const idleSprite = this.selectedCharacter === 'kev' ? 'zombie_idle' : 'stacy_idle';
    this.player.setTexture(idleSprite);
    this.player.setScale(0.4); // Ensure consistent scaling
    
    // Clear ALL vertical velocity to prevent bouncing
    this.player.setVelocityY(0);
    
    // Ensure player is exactly at ground level
    this.player.y = PLAYER_GROUND_Y;
    
// console.log('Player landed');
  }

  performJump() {
// console.log(`Jump attempt: grounded=${this.isGrounded}, jumpCount=${this.jumpCount}, hasDoubleJumped=${this.hasDoubleJumped}, stamina=${this.stamina}`);
    
    // Allow jump if grounded OR if we have reset jump count (from enemy stomp)
    if ((this.isGrounded || this.jumpCount === 0) && this.stamina >= this.staminaCost && !this.hasDoubleJumped) {
      // First jump - clear state and jump
      this.player.setVelocityY(this.JUMP_VELOCITY);
      // Play jump sound for first jump only
      this.playSFX('jump_sfx', { volume: 0.3 });
      // Stop animation and show jump sprite - it stays until landing
      this.player.stop(); // STOP the skate animation!
      const jumpSprite = this.selectedCharacter === 'kev' ? 'zombie_jump' : 'stacy_jump';
      this.player.setTexture(jumpSprite);
      this.player.setScale(this.jumpScale);
      this.isGrounded = false;
      this.jumpCount = 1;
      this.hasDoubleJumped = false;
      
      // Consume stamina (unless boost is active)
      if (!this.staminaBoostActive) {
        this.stamina = Math.max(0, this.stamina - this.staminaCost);
      }
      this.updateStaminaBar();
      
      // Trigger jump particles
      this.dustParticles.setPosition(this.player.x, this.player.y + 48);
      this.dustParticles.explode(3);
      this.jumpParticles.setPosition(this.player.x, this.player.y);
      this.jumpParticles.explode(5);
      
// console.log('First jump performed');
    } else if (this.jumpCount === 1 && !this.hasDoubleJumped && this.stamina >= this.staminaCost) {
      // Second jump - double jump (requires stamina)
      this.player.setVelocityY(this.TRICK_JUMP_VELOCITY);
      // Stop animation and show jump sprite for double jump
      this.player.stop(); // STOP the skate animation!
      const jumpSprite = this.selectedCharacter === 'kev' ? 'zombie_jump' : 'stacy_jump';
      this.player.setTexture(jumpSprite);
      this.player.setScale(this.jumpScale);
      this.hasDoubleJumped = true;
      this.trickActive = false;
      this.jumpCount = 2;
      
      // Consume stamina (unless boost is active)
      if (!this.staminaBoostActive) {
        this.stamina = Math.max(0, this.stamina - this.staminaCost);
      }
      this.updateStaminaBar();
      
      // Trigger trick particles - continuous golden trail
      this.trickParticles.setPosition(this.player.x, this.player.y);
      this.trickParticles.start();
      
      // Reduce gravity for float effect during trick
      this.physics.world.gravity.y = this.FLOAT_GRAVITY;
      
      // Return to normal gravity after trick animation
      this.time.delayedCall(600, () => {
        this.physics.world.gravity.y = this.GRAVITY;
        this.trickActive = false;
        this.trickParticles.stop(); // Stop trick particle trail
      });
      
// console.log('Double jump performed');
    } else {
      if (this.stamina < this.staminaCost) {
// console.log('Jump blocked - not enough stamina');
      } else {
// console.log('Jump blocked - already used both jumps');
      }
    }
  }
  
  performTrick() {
// console.log(`Trick attempt: grounded=${this.isGrounded}, jumpCount=${this.jumpCount}, hasDoubleJumped=${this.hasDoubleJumped}, hasUsedTrick=${this.hasUsedTrick}, stamina=${this.stamina}`);
    
    // Can perform trick if not on ground, hasn't used trick yet, and has stamina
    if (!this.isGrounded && !this.hasUsedTrick && this.stamina >= 15) {
      // Apply small upward boost
      this.player.setVelocityY(this.SWIPE_TRICK_VELOCITY);
      
      // Stop animation and use trick sprite
      this.player.stop(); // Stop any animation
      // Use the trick sprite during the trick
      const trickSprite = this.selectedCharacter === 'kev' ? 'zombie_trick' : 'stacy_trick';
      this.player.setTexture(trickSprite);
      this.player.setScale(this.jumpScale);
      this.trickActive = true;
      
      // Check what's below the player for special tricks
      this.checkSpecialTrickMove();
      
      // Register trick with combo system
      if (this.comboTracker) {
        this.comboTracker.registerTrick(this.score, this.isGrounded);
        // Track best combo
        const comboState = this.comboTracker.getComboState();
        if (comboState.multiplier > this.bestCombo) {
          this.bestCombo = comboState.multiplier;
        }
      }
      
      // Track for challenges - add debug to find double-count bug
      console.log('[DEBUG TRICK] About to update perform_tricks challenge');
      this.challengeManager.updateChallenge('perform_tricks', 1);
      console.log('[DEBUG TRICK] perform_tricks challenge updated');
      
      this.hasUsedTrick = true; // Mark trick as used
      
      // Consume less stamina for tricks (unless boost is active)
      if (!this.staminaBoostActive) {
        this.stamina = Math.max(0, this.stamina - 15);
      }
      this.updateStaminaBar();
      
      // Add score for performing trick
      this.score += 10;
      this.scoreText.setText('Score: ' + this.score);
      
      // Trigger golden trick particles
      this.trickParticles.setPosition(this.player.x, this.player.y);
      this.trickParticles.start();
      
      // Slightly reduce gravity for a moment
      this.physics.world.gravity.y = this.FLOAT_GRAVITY;
      
      // Return to normal gravity after trick
      this.time.delayedCall(400, () => {
        this.physics.world.gravity.y = this.GRAVITY;
        this.trickActive = false;
        this.trickParticles.stop();
        // Keep jump sprite if still airborne
        if (!this.isGrounded) {
          const jumpSprite = this.selectedCharacter === 'kev' ? 'zombie_jump' : 'stacy_jump';
          this.player.setTexture(jumpSprite);
          this.player.setScale(this.jumpScale);
        }
      });
      
// console.log('Swipe trick performed!');
    } else {
      if (this.isGrounded) {
// console.log('Trick blocked - must be in air');
      } else if (this.hasUsedTrick) {
// console.log('Trick blocked - already used trick this jump');
      } else if (this.stamina < 15) {
// console.log('Trick blocked - not enough stamina');
      }
    }
  }
  
  checkSpecialTrickMove() {
    // Check if player is above and reasonably near obstacle/enemy while doing a trick
    const xTolerance = 250; // More forgiving tolerance
    const earlyTolerance = 50; // Extra tolerance for tricks done ahead of obstacle
    const obstaclesCleared: any[] = [];
    const obstacleNames: string[] = [];
    let totalStarReward = 0;
    
    // Check obstacles
    this.obstacles.children.entries.forEach((obstacle: any) => {
      // Check: is player above the obstacle on Y-axis AND aligned on X-axis?
      const xDiff = obstacle.x - this.player.x;
      // Allow tricks to be performed slightly ahead of obstacle (more forgiving)
      if (this.player.y < obstacle.y && xDiff >= -(xTolerance) && xDiff <= (xTolerance + earlyTolerance)) {
        let moveName = '';
        let starReward = 1;
      
        // Determine move name based on obstacle type
        if (obstacle.texture.key === 'obstacle_trash') {
          moveName = 'Trash Nose Grab';
        } else if (obstacle.texture.key === 'obstacle_cone') {
          moveName = 'Caution!';
        } else if (obstacle.texture.key === 'obstacle_skulls') {
          moveName = 'Bonehead Move!';
        } else if (obstacle.texture.key === 'obstacle_crash' || obstacle.texture.key === 'obstacle_zombie') {
          moveName = 'Trash Nose Grab';
        }
        
        if (moveName) {
          obstaclesCleared.push(obstacle);
          obstacleNames.push(moveName);
          totalStarReward += starReward;
        }
      }
    });
    
    // Check enemies (robots) 
    this.enemies.children.entries.forEach((enemy: any) => {
      // Check: is player above the enemy on Y-axis AND aligned on X-axis?
      const xDiff = enemy.x - this.player.x;
      // Allow tricks to be performed slightly ahead of enemy (more forgiving)
      if (this.player.y < enemy.y && xDiff >= -(xTolerance) && xDiff <= (xTolerance + earlyTolerance)) {
        // Robot trick gives same 1 star as other tricks
        obstaclesCleared.push(enemy);
        obstacleNames.push('Robo Nose Grab');
        totalStarReward += 1;  // Changed from 5 to 1
      }
    });
    
    // Show special move(s) if any obstacles were cleared
    if (obstaclesCleared.length > 0) {
      // Simplified trick system
      let moveName: string;
      
      // Check if all obstacles are the same type
      const allSame = obstacleNames.every(name => name === obstacleNames[0]);
      
      if (allSame) {
        // All same obstacle type - show trick name with multiplier
        if (obstacleNames.length === 1) {
          moveName = obstacleNames[0];
        } else {
          moveName = `${obstacleNames[0]} x${obstacleNames.length}`;
        }
      } else {
        // Different obstacles - use simplified messages
        if (obstacleNames.length === 2) {
          moveName = 'Double Tap';
        } else if (obstacleNames.length === 3) {
          moveName = 'OH BOY A TRIPLE!';
        } else {
          // 4+ different obstacles - rare but handle it
          moveName = `Mega Combo x${obstacleNames.length}`;
        }
      }
      
      this.showSpecialMove(moveName, totalStarReward);
    }
  }
  
  showSpecialMove(moveName: string, starReward: number) {
    // Award stars using the existing collectStars method
    this.collectStars(starReward);
    
    // Play star sound
    this.playSFX('new_star_sfx', { volume: 0.4 });
    
    // Register with combo system
    if (this.comboTracker) {
      this.comboTracker.registerTrick(this.score, false); // Count as aerial trick
    }
    
    // Add message to the queue - it will handle positioning and animations
    this.trickMessageManager.addMessage(moveName, starReward);
  }
  
  // consolidateTrickNames removed - simplified trick system now uses Double Tap/Triple Kill
  
  // clearZone method removed - now handled by TrickMessageManager
  
  // performStomp removed - stomp feature no longer exists
  
  updateStaminaBar() {
    this.staminaBar.clear();
    
    let color = 0x00ff00;  // Default green
    let flashAlpha = 1;
    
    // Check for stamina audio cues (only when not boosted)
    if (!this.staminaBoostActive) {
      // Low stamina warning at 30%
      if (this.stamina <= 30 && this.time.now - this.lastStaminaWarnPlayed > 2000) {
        // Play low stamina sound (16-bit beep)
        this.playStaminaWarningSound();
        this.lastStaminaWarnPlayed = this.time.now;
      }
      
      // Full stamina sound
      if (this.stamina >= this.maxStamina && this.time.now - this.lastStaminaFullPlayed > 5000) {
        // Play full stamina sound (16-bit chime)
        this.playStaminaFullSound();
        this.lastStaminaFullPlayed = this.time.now;
      }
    }
    
    // If stamina boost is active, flash between white, neon blue and magenta
    if (this.staminaBoostActive) {
      this.stamina = this.maxStamina; // Keep stamina at max during boost
      const time = this.time.now;
      const flashSpeed = 200; // Flash every 200ms
      const flashIndex = Math.floor(time / flashSpeed) % 3;
      if (flashIndex === 0) {
        color = 0xffffff; // White
      } else if (flashIndex === 1) {
        color = 0x00ffff; // Neon blue
      } else {
        color = 0xff00ff; // Magenta
      }
    } else {
      // Normal color based on stamina level
      if (this.stamina < 33.33) {
        color = 0xff0000;  // Red
      } else if (this.stamina < 66.66) {
        color = 0xffaa00;  // Orange
      }
    }
    
    // Draw stamina bar (now at y=172)
    this.staminaBar.fillStyle(color, flashAlpha);
    const barWidth = (this.stamina / this.maxStamina) * 200;
    this.staminaBar.fillRect(52, 172, barWidth, 20);
  }
  
  playStaminaWarningSound() {
    // Use existing jump sound as warning beep (played at higher pitch)
    this.playSFX('jump_sfx', { volume: 0.3, rate: 0.7 }); // Lower pitch for warning
  }
  
  playStaminaFullSound() {
    // Use star sound as a positive chime
    this.playSFX('new_star_sfx', { volume: 0.2, rate: 1.5 }); // Higher pitch for full stamina
  }
  
  updatePowerUpTints() {
    // Handle player tint based on active power-ups
    // Allow multiple power-ups to stack their effects
    
    if (this.invulnerable) {
      // Already handled by damage system
      return;
    }
    
    const time = this.time.now;
    const flashSpeed = 150; // Flash every 150ms for more dynamic effect
    
    // Count active power-ups
    const activePowerUps = [];
    if (this.metalBootActive) activePowerUps.push('metal');
    if (this.fireTacoActive) activePowerUps.push('fire');
    if (this.crystalMagnetActive) activePowerUps.push('crystal');
    if (this.staminaBoostActive) activePowerUps.push('stamina');
    
    if (activePowerUps.length === 0) {
      this.player.clearTint();
      return;
    }
    
    // Cycle through all active power-up colors
    const cycleIndex = Math.floor(time / flashSpeed) % activePowerUps.length;
    const currentPowerUp = activePowerUps[cycleIndex];
    const flashIndex = Math.floor(time / (flashSpeed * 2)) % 2;
    
    let color = 0xffffff;
    
    switch (currentPowerUp) {
      case 'metal':
        color = flashIndex === 0 ? 0x606060 : 0xffffff; // Strong metallic to bright silver flash
        break;
      case 'fire':
        color = flashIndex === 0 ? 0xff0000 : 0xff6600; // Red/Orange flashing
        break;
      case 'crystal':
        color = flashIndex === 0 ? 0xffff00 : 0xffdd00; // Yellow flashing
        break;
      case 'stamina':
        const staminaFlash = Math.floor(time / flashSpeed) % 3;
        if (staminaFlash === 0) {
          color = 0xffffff; // White
        } else if (staminaFlash === 1) {
          color = 0x00ffff; // Neon blue
        } else {
          color = 0xff00ff; // Magenta
        }
        break;
    }
    
    this.player.setTint(color);
  }
  
  updateHealthBar() {
    this.healthBar.clear();
    
    // Choose color based on health level or stamina boost
    let color = 0x00ff00;  // Green
    
    // If Fire Taco is active, flash between red and orange
    if (this.fireTacoActive) {
      const time = this.time.now;
      const flashSpeed = 200; // Flash every 200ms
      const flashIndex = Math.floor(time / flashSpeed) % 2;
      if (flashIndex === 0) {
        color = 0xff0000; // Red
      } else {
        color = 0xffa500; // Orange
      }
    } else if (this.staminaBoostActive) {
      // If stamina boost is active, flash between white, neon blue and magenta like the stamina bar
      const time = this.time.now;
      const flashSpeed = 200; // Flash every 200ms
      const flashIndex = Math.floor(time / flashSpeed) % 3;
      if (flashIndex === 0) {
        color = 0xffffff; // White
      } else if (flashIndex === 1) {
        color = 0x00ffff; // Neon blue
      } else {
        color = 0xff00ff; // Magenta
      }
    } else {
      // Normal colors based on health level
      if (this.health < 30) {
        color = 0xff0000;  // Red
      } else if (this.health < 60) {
        color = 0xffaa00;  // Orange
      }
    }
    
    // Draw health bar (now at y=112)
    this.healthBar.fillStyle(color, 1);
    const healthPercent = this.health / this.maxHealth;
    this.healthBar.fillRect(52, 112, 200 * healthPercent, 20);
  }
  
  takeDamage(amount: number) {
// console.log(`[DEBUG DAMAGE] takeDamage called with amount: ${amount}, Current health: ${this.health}, Invulnerable: ${this.invulnerable}`);
    if (this.invulnerable) {
// console.log(`[DEBUG DAMAGE] Damage blocked - player is invulnerable`);
      return;
    }
    
    // Reset no-damage challenge timer
    this.challengeManager.resetNoDamageChallenge();
    
    const newHealth = Math.max(0, this.health - amount);
// console.log(`[DEBUG DAMAGE] Taking ${amount} damage: ${this.health} -> ${newHealth}`);
    this.health = newHealth;
    this.updateHealthBar();
    
    // Flash the player red
    this.player.setTint(0xff0000);
    
    // Make invulnerable for a short time
    this.invulnerable = true;
    
    // Set player to higher depth when invulnerable so they appear in front of obstacles
    this.player.setDepth(15);
    
    // Flash effect
    let flashCount = 0;
    const flashTimer = this.time.addEvent({
      delay: 150,
      callback: () => {
        flashCount++;
        if (flashCount % 2 === 0) {
          this.player.setTint(0xffffff);
        } else {
          this.player.setTint(0xff8888);
        }
        
        if (flashCount >= 8) {
          this.player.clearTint();
          this.invulnerable = false;
          this.player.setDepth(10); // Reset to normal depth
          flashTimer.remove();
        }
      },
      loop: true
    });
    
    // Check if dead
    if (this.health <= 0) {
      this.gameOverTriggered = true;
      this.gameOver();
    }
  }
  
  createSandwichSystem() {
    // Create physics group for sandwiches
    this.sandwiches = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    
    // Start spawning sandwiches much less frequently
    this.sandwichTimer = this.time.addEvent({
      delay: 20000, // Spawn every 20 seconds (much rarer)
      callback: this.spawnSandwich,
      callbackScope: this,
      loop: true
    });
    
    // Spawn first sandwich after 15 seconds
    this.time.delayedCall(15000, () => {
      this.spawnSandwich();
    });
  }
  
  spawnSandwich() {
    // Calculate initial spawn distance
    const spawnDistance = Phaser.Math.Between(800, 1200);
    const spawnY = Phaser.Math.Between(400, 600); // Float in the sky
    
    // Check if this Y position conflicts with recent enemy or energy drink spawn (reduced to 3 seconds)
    const timeSinceLastEnemy = (this.time.now - this.lastEnemySpawnTime) / 1000;
    const timeSinceLastEnergyDrink = (this.time.now - this.lastEnergyDrinkSpawnTime) / 1000;
    
    if (timeSinceLastEnemy < 3 && Math.abs(spawnY - this.lastEnemyY) < 100) {
// console.log(`[DEBUG SANDWICH SPAWN] Skipping - too close to recent enemy at Y=${this.lastEnemyY}`);
      return;
    }
    
    if (timeSinceLastEnergyDrink < 3 && Math.abs(spawnY - this.lastEnergyDrinkY) < 100) {
// console.log(`[DEBUG SANDWICH SPAWN] Skipping - too close to recent energy drink at Y=${this.lastEnergyDrinkY}`);
      return;
    }
    
    // Store sandwich spawn info
    this.lastSandwichY = spawnY;
    this.lastSandwichSpawnTime = this.time.now;
    
    // Create arrow warning indicator for sandwich using custom sandwich arrow
    // Move arrow slightly left (from 590 to 580)
    const arrow = this.arrowIndicators.create(580, spawnY, 'sandwich_arrow') as Phaser.GameObjects.Sprite;
    arrow.setScale(0.05); // Start small
    arrow.setDepth(102); // Above UI
    arrow.setScrollFactor(0); // Keep fixed on screen
    
    // Flash the arrow for visibility
    const arrowTween = this.tweens.add({
      targets: arrow,
      alpha: { from: 1, to: 0.5 },
      duration: 400,
      yoyo: true,
      repeat: -1
    });
    
    // Grow arrow from small to full size
    const growTween = this.tweens.add({
      targets: arrow,
      scale: { from: 0.05, to: 0.15 },
      duration: 1500,
      ease: 'Power2'
    });
    
    // Store tween references on arrow for cleanup
    (arrow as any).flashTween = arrowTween;
    (arrow as any).growTween = growTween;
    
// console.log(`[DEBUG SANDWICH] Arrow indicator shown at Y=${spawnY}, sandwich will spawn in 2 seconds`);
    
    // Spawn sandwich after 2 second warning
    this.time.delayedCall(2000, () => {
      // Clean up tweens before destroying arrow
      const flashTween = (arrow as any).flashTween;
      if (flashTween) {
        flashTween.stop();
        flashTween.remove();
      }
      const growTween = (arrow as any).growTween;
      if (growTween) {
        growTween.stop();
        growTween.remove();
      }
      arrow.destroy();
      
      // Recalculate spawn position based on current player position
      // Account for the 2 second delay - player moves at 380 pixels/second
      const adjustedSpawnX = this.player.x + spawnDistance;
      
      const sandwich = this.sandwiches.create(adjustedSpawnX, spawnY, 'sandwich');
      sandwich.setScale(0.12); // Scale down the sandwich
      sandwich.setDepth(10);
      
      // Add floating animation
      this.tweens.add({
        targets: sandwich,
        y: spawnY - 20,
        duration: 1500,
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1
      });
      
// console.log(`Sandwich spawned at (${adjustedSpawnX}, ${spawnY}) - player at ${this.player.x}`);  
    });
  }
  
  createEnergyDrinkSystem() {
    // Create physics group for energy drinks
    this.energyDrinks = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    
    // Random energy drink spawning with minimum 30 second cooldown
    // Check every 5 seconds if we should spawn
    this.energyDrinkTimer = this.time.addEvent({
      delay: 5000, // Check every 5 seconds
      callback: () => {
        // Only try to spawn if 30+ seconds have passed and random chance
        const timeSinceLastCan = (this.time.now - this.lastEnergyDrinkSpawnTime) / 1000;
        if (timeSinceLastCan >= 30 && Math.random() < 0.3) { // 30% chance each check after cooldown
          this.spawnEnergyDrink();
        }
      },
      callbackScope: this,
      loop: true
    });
    
    // First potential spawn after 35-45 seconds
    this.time.delayedCall(Phaser.Math.Between(35000, 45000), () => {
      this.spawnEnergyDrink();
    });
  }
  
  spawnEnergyDrink() {
    // Double-check cooldown (in case called directly)
    const timeSinceLastCan = (this.time.now - this.lastEnergyDrinkSpawnTime) / 1000;
    if (timeSinceLastCan < 30) {
// console.log(`[DEBUG ENERGY DRINK] Cooldown active - ${Math.floor(30 - timeSinceLastCan)}s remaining`);
      return;
    }
    
    // Calculate initial spawn distance
    const spawnDistance = Phaser.Math.Between(900, 1300);
    const spawnY = Phaser.Math.Between(450, 650); // Float in the sky
    
    // Check if this Y position conflicts with recent spawns (sandwich or enemy) within 3 seconds (reduced from 5)
    const timeSinceLastSandwich = (this.time.now - this.lastSandwichSpawnTime) / 1000;
    const timeSinceLastEnemy = (this.time.now - this.lastEnemySpawnTime) / 1000;
    
    if (timeSinceLastSandwich < 3 && Math.abs(spawnY - this.lastSandwichY) < 100) {
// console.log(`[DEBUG ENERGY DRINK] Skipping - too close to recent sandwich at Y=${this.lastSandwichY}`);
      return;
    }
    
    if (timeSinceLastEnemy < 3 && Math.abs(spawnY - this.lastEnemyY) < 100) {
// console.log(`[DEBUG ENERGY DRINK] Skipping - too close to recent enemy at Y=${this.lastEnemyY}`);
      return;
    }
    
    // Store energy drink spawn info
    this.lastEnergyDrinkY = spawnY;
    this.lastEnergyDrinkSpawnTime = this.time.now;
    
    // Create arrow warning indicator for energy drink
    const arrow = this.arrowIndicators.create(580, spawnY, 'energy_warning') as Phaser.GameObjects.Sprite;
    arrow.setScale(0.15);
    arrow.setDepth(102); // Above UI
    arrow.setScrollFactor(0); // Keep fixed on screen
    
    // Flash the arrow for visibility
    const arrowTween = this.tweens.add({
      targets: arrow,
      alpha: { from: 1, to: 0.5 },
      duration: 400,
      yoyo: true,
      repeat: -1
    });
    
    // Store tween reference on arrow for cleanup
    (arrow as any).flashTween = arrowTween;
    
// console.log(`[DEBUG ENERGY DRINK] Arrow indicator shown at Y=${spawnY}, drink will spawn in 2 seconds`);
    
    // Spawn energy drink after 2 second warning
    this.time.delayedCall(2000, () => {
      // Clean up tweens before destroying arrow
      const flashTween = (arrow as any).flashTween;
      if (flashTween) {
        flashTween.stop();
        flashTween.remove();
      }
      const growTween = (arrow as any).growTween;
      if (growTween) {
        growTween.stop();
        growTween.remove();
      }
      arrow.destroy();
      
      // Recalculate spawn position to match obstacle timing - spawn just off-screen
      const adjustedSpawnX = this.player.x + 700; // Same as obstacles
      
      const energyDrink = this.energyDrinks.create(adjustedSpawnX, spawnY, 'energy_drink');
      energyDrink.setScale(0.12); // Scale down the energy drink
      energyDrink.setDepth(10);
      
      // Add floating animation with shimmer effect
      this.tweens.add({
        targets: energyDrink,
        y: spawnY - 20,
        duration: 1500,
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1
      });
      
      // Add shimmer effect
      this.tweens.add({
        targets: energyDrink,
        alpha: { from: 0.8, to: 1 },
        duration: 300,
        yoyo: true,
        repeat: -1
      });
      
// console.log(`Energy drink spawned at (${adjustedSpawnX}, ${spawnY}) - player at ${this.player.x}`);
    });
  }
  
  collectEnergyDrink(energyDrink: any) {
    // Play energy drink sound effect
    this.playSFX('energy_drink_sfx', { volume: 0.5 });
    
    // Increment can counter
    this.cansCollected++;
    
    // Use the display system for "MAXIMUM!" text to prevent overlap
    // console.log('[COLLECT ENERGY DRINK] About to display text');
    this.displayPowerUpText('maximum_text');
    
    // Activate stamina boost
    this.staminaBoostActive = true;
    this.stamina = this.maxStamina; // Fill stamina to max
    
    // Cancel any existing boost timer
    if (this.staminaBoostTimer) {
      this.staminaBoostTimer.remove();
    }
    
    // Set timer to deactivate boost after 10 seconds
    this.staminaBoostTimer = this.time.delayedCall(10000, () => {
      this.staminaBoostActive = false;
      // Clear the skater color effect when boost expires
      if (!this.invulnerable) {
        this.player.clearTint();
      }
// console.log('[ENERGY DRINK] Stamina boost expired');
    });
    
    // Add score
    this.score += 50;
    this.scoreText.setText('Score: ' + this.score);
    
    // Register as combo event
    if (this.comboTracker) {
      this.comboTracker.registerTrick(this.score, this.isGrounded);
    }
    
    // Play particle effect at drink location
    this.jumpParticles.setPosition(energyDrink.x, energyDrink.y);
    this.jumpParticles.explode(25);
    
    // Remove energy drink
    energyDrink.destroy();
    
// console.log(`Energy drink collected! Stamina boost active for 10 seconds, Total: ${this.cansCollected}`);
  }
  
  createPowerUpSystem() {
    // Create physics groups for power-ups and fireballs
    this.powerUps = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    
    this.fireballs = this.physics.add.group({
      allowGravity: false
    });
    
    // Create invisible stomp hitbox (initially disabled)
    this.stompHitbox = this.add.rectangle(0, 0, 80, 100, 0xff0000, 0) as any;
    this.physics.add.existing(this.stompHitbox);
    this.stompHitbox.setVisible(false);
    (this.stompHitbox.body as any).enable = false;
    
    // Create fire breath sprite (initially hidden)
    this.fireBreath = this.add.sprite(0, 0, 'fire_breath');
    this.physics.add.existing(this.fireBreath);
    this.fireBreath.setVisible(false);
    this.fireBreath.setScale(0.3); // Adjust scale as needed
    this.fireBreath.setDepth(15);
    (this.fireBreath.body as any).enable = false;
    
    // Random power-up spawning with 45 second cooldown
    this.powerUpTimer = this.time.addEvent({
      delay: 5000, // Check every 5 seconds for faster testing
      callback: () => {
        const timeSinceLastPowerUp = (this.time.now - this.lastPowerUpSpawnTime) / 1000;
        if (timeSinceLastPowerUp >= 20 && Math.random() < 0.5) { // 50% chance after 20 second cooldown for more frequent spawning
          this.spawnPowerUp();
        }
      },
      callbackScope: this,
      loop: true
    });
    
    // First power-up after 15-20 seconds for quicker testing
    this.time.delayedCall(Phaser.Math.Between(15000, 20000), () => {
      this.spawnPowerUp();
    });
  }
  
  spawnPowerUp() {
    const timeSinceLastPowerUp = (this.time.now - this.lastPowerUpSpawnTime) / 1000;
    if (timeSinceLastPowerUp < 45) return; // Normal 45 second cooldown
    
    // 50% chance to spawn a power-up (use Phaser's random for consistency)
    if (Phaser.Math.FloatBetween(0, 1) > 0.5) return;
    
    this.lastPowerUpSpawnTime = this.time.now;
    
    // Only spawn power-ups that are unlocked in current wave
    const unlockedPowerUps: string[] = [];
    if (this.waveManager.isPowerUpUnlocked('metal_skateboard')) {
      unlockedPowerUps.push('metal_skateboard');
    }
    if (this.waveManager.isPowerUpUnlocked('fire_taco')) {
      unlockedPowerUps.push('fire_taco');
    }
    if (this.waveManager.isPowerUpUnlocked('crystal_magnet')) {
      unlockedPowerUps.push('crystal_magnet');
    }
    
    // If no power-ups are unlocked (Wave 1), don't spawn
    if (unlockedPowerUps.length === 0) {
      return;
    }
    
    const selectedType = Phaser.Utils.Array.GetRandom(unlockedPowerUps);
    // console.log(`[POWERUP] Spawning power-up: ${selectedType}`);
    
    // Set Y position based on type
    const powerUpY = 480;
    
    // Create warning indicator - use triangle for fire_taco, crystal_magnet, and metal_skateboard
    const warningSprite = (selectedType === 'fire_taco' || selectedType === 'crystal_magnet' || selectedType === 'metal_skateboard') 
      ? 'warning_triangle' : 'arrow_indicator';
    const arrow = this.arrowIndicators.create(580, powerUpY, warningSprite) as Phaser.GameObjects.Sprite;
    arrow.setScale(0.05); // Start small like other indicators
    arrow.setDepth(102);
    arrow.setScrollFactor(0);
    
    // Set arrow color based on power-up type (no tint for warning triangle)
    if (warningSprite === 'arrow_indicator') {
      // Only apply tint to arrow indicators, not warning triangles
      if (selectedType === 'metal_skateboard') {
        arrow.setTint(0xffffff); // Silver/white for metal skateboard
      } else if (selectedType === 'fire_taco') {
        arrow.setTint(0xffaa00); // Orange for fire taco
      } else if (selectedType === 'crystal_magnet') {
        arrow.setTint(0x00ffff); // Cyan for crystal magnet
      }
    }
    
    // Grow arrow from small to full size over time
    const growTween = this.tweens.add({
      targets: arrow,
      scaleX: 0.15,
      scaleY: 0.15,
      duration: 2000, // Grow over 2 seconds
      ease: 'Power2'
    });
    
    // Flash the arrow
    const arrowTween = this.tweens.add({
      targets: arrow,
      alpha: { from: 1, to: 0.5 },
      duration: 400,
      yoyo: true,
      repeat: -1
    });
    
    // Store tween reference on arrow for cleanup
    (arrow as any).flashTween = arrowTween;
    
    // Spawn power-up after 2 seconds
    this.time.delayedCall(2000, () => {
      // Clean up tweens before destroying arrow
      const flashTween = (arrow as any).flashTween;
      if (flashTween) {
        flashTween.stop();
        flashTween.remove();
      }
      const growTween = (arrow as any).growTween;
      if (growTween) {
        growTween.stop();
        growTween.remove();
      }
      arrow.destroy();
      
      const adjustedSpawnX = this.player.x + 700;
      const powerUp = this.powerUps.create(adjustedSpawnX, powerUpY, selectedType) as any;
      powerUp.powerUpType = selectedType;
      // Scale power-ups - bigger for metal skateboard
      const scale = selectedType === 'metal_skateboard' ? 0.20 : 0.12;
      powerUp.setScale(scale);
      powerUp.setDepth(10);
      
      // Add gentle hovering animation
      this.tweens.add({
        targets: powerUp,
        y: powerUpY - 8,
        duration: 1800,
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1
      });
      
      // Add rotation for crystal magnet
      if (selectedType === 'crystal_magnet') {
        this.tweens.add({
          targets: powerUp,
          rotation: Math.PI * 2,
          duration: 4000,
          ease: 'Linear',
          repeat: -1
        });
      }
    });
  }
  
  collectPowerUp(powerUp: any) {
    const type = powerUp.powerUpType;
    // console.log('[POWER-UP COLLECT] Collecting power-up type:', type);
    
    // Track for challenges
    this.challengeManager.updateChallenge('collect_powerups', 1);
    this.updateChallengeDisplay();
    
    if (type === 'metal_skateboard') {
      this.collectMetalBoot();
    } else if (type === 'fire_taco') {
      this.collectFireTaco();
    } else if (type === 'crystal_magnet') {
      this.collectCrystalMagnet();
    }
    
    // Play collection sound
    this.playSFX('star_cluster_sfx', { volume: 0.4 });
    
    // Particle effect
    this.jumpParticles.setPosition(powerUp.x, powerUp.y);
    this.jumpParticles.explode(30);
    
    powerUp.destroy();
  }
  
  displayPowerUpText(imageKey: string) {
    // console.log('[POWER-UP TEXT] Displaying:', imageKey, 'Current active count:', this.activePowerUpTexts.length);
    
    // Create container for this power-up display
    const container = this.add.container(320, 540); // Start at base position
    container.setDepth(150);
    container.setScrollFactor(0);
    
    // Create the text image
    const powerUpText = this.add.image(0, 0, imageKey);
    
    // Determine if this will be the only text showing (or one of multiple)
    // Count includes this new text we're about to add
    const willBeAlone = this.activePowerUpTexts.length === 0;
    
    // Apply scaling based on whether text appears alone or with others
    let scale = 1.0;
    if (willBeAlone) {
      // LARGER SCALES when appearing alone (approximately 1.5x bigger)
      if (imageKey === 'stay_lit_text') {
        scale = 0.40; // Was 0.26, now 1.5x bigger
      } else if (imageKey === 'heavy_metal_ride_text') {
        scale = 0.54; // Was 0.36, now 1.5x bigger
      } else if (imageKey === 'my_lead_foot_text' || imageKey === 'get_over_here_text') {
        scale = 0.45; // Was 0.30, now 1.5x bigger
      } else {
        scale = 0.48; // Was 0.32, now 1.5x bigger (for maximum_text)
      }
    } else {
      // SMALLER SCALES when appearing with others (original sizes)
      if (imageKey === 'stay_lit_text') {
        scale = 0.26; // Stay Lit slightly smaller
      } else if (imageKey === 'heavy_metal_ride_text') {
        scale = 0.36; // Heavy Metal Ride text bigger
      } else if (imageKey === 'my_lead_foot_text' || imageKey === 'get_over_here_text') {
        scale = 0.30; // Other power-up texts medium size
      } else {
        scale = 0.32; // Maximum text normal size
      }
    }
    
    // Start at scale 0 for smooth animation in
    powerUpText.setScale(0);
    container.add(powerUpText);
    
    // Animate the scale in smoothly
    this.tweens.add({
      targets: powerUpText,
      scaleX: scale,
      scaleY: scale,
      duration: 300,
      ease: 'Back.easeOut'
    });
    
    // Store container info with type
    const containerInfo: {
      container: Phaser.GameObjects.Container;
      text: Phaser.GameObjects.Image;
      cross: Phaser.GameObjects.Image | null;
      imageKey: string;
    } = {
      container: container,
      text: powerUpText,
      cross: null,
      imageKey: imageKey
    };
    
    // Special handling: MAXIMUM always goes on top
    if (imageKey === 'maximum_text') {
      // Add MAXIMUM to the beginning (top position)
      this.activePowerUpTexts.unshift(containerInfo);
    } else {
      // All other texts go to the bottom
      this.activePowerUpTexts.push(containerInfo);
    }
    
    // Reflow all texts immediately
    this.reflowPowerUpTexts();
    
    // Slide out after 1.5 seconds
    this.time.delayedCall(1500, () => {
      // console.log('[POWER-UP TEXT] Removing:', imageKey);
      this.tweens.add({
        targets: container,
        x: -400,
        duration: 100,
        ease: 'Power3.easeIn',
        onComplete: () => {
          // Destroy any associated cross BEFORE removing from array
          if (containerInfo.cross) {
            containerInfo.cross.destroy();
            containerInfo.cross = null;
          }
          
          // Remove from array
          const index = this.activePowerUpTexts.indexOf(containerInfo);
          if (index > -1) {
            this.activePowerUpTexts.splice(index, 1);
          }
          
          // Destroy container
          container.destroy(true);
          
          // Reflow remaining texts (this will recreate crosses if needed)
          this.reflowPowerUpTexts();
        }
      });
    });
  }
  
  reflowPowerUpTexts() {
    // console.log('[POWER-UP TEXT REFLOW] Active texts:', this.activePowerUpTexts.length);
    
    // Clear all existing crosses first
    this.activePowerUpTexts.forEach(info => {
      if (info.cross) {
        info.cross.destroy();
        info.cross = null;
      }
    });
    
    // If no texts, return early
    if (this.activePowerUpTexts.length === 0) return;
    
    // Rescale all texts based on whether they're alone or with others
    const isAlone = this.activePowerUpTexts.length === 1;
    
    this.activePowerUpTexts.forEach(info => {
      const imageKey = info.imageKey;
      let newScale = 1.0;
      
      if (isAlone) {
        // LARGER SCALES when appearing alone (approximately 1.5x bigger)
        if (imageKey === 'stay_lit_text') {
          newScale = 0.40; // Was 0.26, now 1.5x bigger
        } else if (imageKey === 'heavy_metal_ride_text') {
          newScale = 0.54; // Was 0.36, now 1.5x bigger
        } else if (imageKey === 'my_lead_foot_text' || imageKey === 'get_over_here_text') {
          newScale = 0.45; // Was 0.30, now 1.5x bigger
        } else {
          newScale = 0.48; // Was 0.32, now 1.5x bigger (for maximum_text)
        }
      } else {
        // SMALLER SCALES when appearing with others (original sizes)
        if (imageKey === 'stay_lit_text') {
          newScale = 0.26; // Stay Lit slightly smaller
        } else if (imageKey === 'heavy_metal_ride_text') {
          newScale = 0.36; // Heavy Metal Ride text bigger
        } else if (imageKey === 'my_lead_foot_text' || imageKey === 'get_over_here_text') {
          newScale = 0.30; // Other power-up texts medium size
        } else {
          newScale = 0.32; // Maximum text normal size
        }
      }
      
      // Tween the scale change for smooth transition
      this.tweens.add({
        targets: info.text,
        scaleX: newScale,
        scaleY: newScale,
        duration: 200,
        ease: 'Power2.easeOut'
      });
    });
    
    // Simple fixed positioning - handle up to 3 power-up texts
    const positions: { [key: number]: number[] } = {
      1: [500],  // Single text
      2: [360, 520],  // Two texts stacked - more spacing
      3: [290, 380, 470]  // Three texts stacked
    };
    
    const textPositions = positions[Math.min(this.activePowerUpTexts.length, 3)];
    
    // Position each text using tweens so they actually move
    this.activePowerUpTexts.forEach((info, index) => {
      // Skip if we've exceeded the max number of positions
      if (index >= textPositions.length) return;
      
      const targetY = textPositions[index];
      // console.log(`[POWER-UP TEXT REFLOW] ${(info as any).imageKey} moving to Y: ${targetY}`);
      
      // Use tween to actually move the container
      this.tweens.add({
        targets: info.container,
        y: targetY,
        duration: 200,
        ease: 'Power2.easeOut'
      });
    });
    
    // Add cross between texts if there are 2
    if (this.activePowerUpTexts.length === 2) {
      // Create cross between the two texts
      const crossY = 425; // Fixed position between 360 and 520, moved up
      
      const cross = this.add.image(320, crossY, 'powerup_cross');
      cross.setScale(0.05); // Small cross
      cross.setDepth(151); // Above texts
      cross.setScrollFactor(0);
      
      // Store reference with the first text
      this.activePowerUpTexts[0].cross = cross;
      
      // console.log(`[POWER-UP TEXT REFLOW] Added cross at Y: ${crossY}`);
    }
  }
  
  collectMetalBoot() {
    // console.log('[COLLECT METAL BOOT] Called');
    // Don't override activePowerUp - allow multiple power-ups
    this.metalBootActive = true;
    this.totalPowerUpsUsed++;
    
    // Set player depth higher when Metal Boot is active so they appear in front
    this.player.setDepth(15);
    
    // Register as combo event
    if (this.comboTracker) {
      this.comboTracker.registerTrick(this.score, this.isGrounded);
    }
    
    // Flash cyan/blue color to match the metal skateboard image
    const flashTint = 0x9DBDCC; // Cyan/blue matching the skateboard
    const normalTint = 0x7DA9B9; // Slightly darker cyan/blue
    
    // Initial flash
    this.player.setTint(flashTint);
    
    // Create alternating flash pattern
    let flashCount = 0;
    const flashTimer = this.time.addEvent({
      delay: 150,
      callback: () => {
        flashCount++;
        if (flashCount % 2 === 0) {
          this.player.setTint(flashTint); // Bright cyan
        } else {
          this.player.setTint(normalTint); // Darker cyan
        }
        
        // After 8 flashes, settle on the normal cyan tint
        if (flashCount >= 8) {
          this.player.setTint(normalTint);
          flashTimer.remove();
        }
      },
      repeat: 7
    });
    
    // No timer - metal skateboard lasts until player dies
    // Only deactivated when player loses a life
    
    // Use the new display system
    this.displayPowerUpText('heavy_metal_ride_text');
  }
  
  collectFireTaco() {
    // Don't override activePowerUp - allow multiple power-ups
    this.fireTacoActive = true;
    this.totalPowerUpsUsed++;
    
    // Register as combo event
    if (this.comboTracker) {
      try {
        this.comboTracker.registerTrick(this.score, this.isGrounded);
      } catch (error) {
        console.error('[FIRE TACO] Error registering combo:', error);
      }
    }
    
    // Don't pause spawning - keep normal spawn rates during Fire Taco
    
    // Use the display system for "STAY LIT!" text to prevent overlap
    // console.log('[COLLECT FIRE TACO] About to display text');
    this.displayPowerUpText('stay_lit_text');
    
    // Create single exclamation mark directly above player's head
    const exclamation = this.add.image(this.player.x, this.player.y - 50, 'exclamation_mark');
    exclamation.setScale(0.08); // Slightly larger size
    exclamation.setDepth(200);
    
    // Flash animation
    const exclamationTween = this.tweens.add({
      targets: exclamation,
      alpha: { from: 1, to: 0.5 },
      duration: 400,
      yoyo: true,
      repeat: -1
    });
    
    // Update exclamation position to follow player
    const exclamationTimer = this.time.addEvent({
      delay: 16, // ~60 FPS
      callback: () => {
        if (exclamation && exclamation.active) {
          exclamation.x = this.player.x;
          exclamation.y = this.player.y - 40; // Closer to head
        }
      },
      repeat: 125 // For 2 seconds (125 * 16ms = 2000ms)
    });
    
    // After 2 seconds, remove exclamation mark and stop tween
    this.time.delayedCall(2000, () => {
      exclamationTimer.remove();
      exclamationTween.stop();
      exclamation.destroy();
    });
    
    // After 2 seconds (immediately after exclamations vanish), start spawning robots
    this.time.delayedCall(2000, () => {
      
      // Spawning never paused, so no need to resume
      
      // Spawn robots immediately (reduced to prevent freezing)
      for (let i = 0; i < 5; i++) {
        this.time.delayedCall(i * 250, () => {
          // Safety check: only spawn if game is still active
          if (!this.gameOver && !this.gameOverTriggered && !this.gamePaused) {
            this.spawnEnemy();
          }
        });
      }
      
      // Create fire sprites attached to player
      this.createFireSprites();
      
      // Start color flashing (red and orange)
      this.startFireColorFlash();
      
      // Don't change enemy spawn rate during Fire Taco
    });
    
    // Warning 3 seconds before Fire Taco ends (at 19 seconds)
    this.time.delayedCall(19000, () => {
      // Play warning sound
      this.playSFX('jump_sfx', { volume: 0.4 }); // Using jump sound as warning
      
      // Start flashing normal colors to indicate power-up ending
      if (this.fireColorTimer) {
        this.fireColorTimer.remove();
        this.fireColorTimer = undefined;
      }
      
      // Flash between normal and fire colors as warning
      let flashCount = 0;
      const warningFlash = this.time.addEvent({
        delay: 150,
        callback: () => {
          if (flashCount % 2 === 0) {
            this.player.clearTint(); // Normal color
          } else {
            const fireColors = [0xff4500, 0xff8c00]; // Orange and red
            this.player.setTint(fireColors[flashCount % 2]);
          }
          flashCount++;
        },
        repeat: 19 // Flash for 3 seconds (20 * 150ms = 3000ms)
      });
    });
    
    // Set timer to end fire taco effect after 20 seconds of actual fire (22 seconds total = 2s delay + 20s effect)
    this.time.delayedCall(22000, () => {
      this.endFireTacoEffect();
    });
  }
  
  floorFireTrails?: Phaser.GameObjects.Image[];
  fireTrailTimer?: Phaser.Time.TimerEvent;
  
  createFireSprites() {
    // CREATE FIRE SPRITES SPREAD OUT WITH EXTREME POSITIONS
    // Removed one fire sprite (fireLeg) per user request
    
    // Fire on shoulder - WAY UP TOP
    this.fireShoulder = this.add.image(
      this.player.x + 5,
      this.player.y - 55,
      'fire1'
    );
    this.fireShoulder.setScale(0.45);
    this.fireShoulder.setDepth(11);
    
    // Fire on body - MID HEIGHT
    this.fireBody = this.add.image(
      this.player.x + 10,
      this.player.y - 10,
      'fire2'
    );
    this.fireBody.setScale(0.50);
    this.fireBody.setDepth(11);
    
    // Fire on right - EXTREME RIGHT AND UP
    this.fireRight = this.add.image(
      this.player.x + 60,
      this.player.y - 50,
      'fire1'
    );
    this.fireRight.setScale(0.40);
    this.fireRight.setDepth(11);
    
    // Store references for cleanup (removed fireLeg and fireTrail)
    this.fireSprites = [this.fireShoulder, this.fireBody, this.fireRight];
    
    // Initialize floor fire trail array
    this.floorFireTrails = [];
    
    // Start spawning floor fire every 3 seconds
    this.fireTrailTimer = this.time.addEvent({
      delay: 3000,
      callback: () => {
        if (!this.fireTacoActive) return;
        
        // Only create fire on the floor if player is grounded
        if (!this.isGrounded) return;
        
        // Create fire on the floor behind the player
        const floorFire = this.add.image(
          this.player.x - 60,
          this.player.y + 35, // On the floor
          'fire1'
        );
        floorFire.setScale(0.7); // Reduced size
        floorFire.setDepth(7); // Behind everything
        
        // Add fade out effect
        this.tweens.add({
          targets: floorFire,
          alpha: { from: 1, to: 0 },
          duration: 4000,
          onComplete: () => {
            floorFire.destroy();
            const index = this.floorFireTrails?.indexOf(floorFire);
            if (index !== undefined && index > -1) {
              this.floorFireTrails?.splice(index, 1);
            }
          }
        });
        
        this.floorFireTrails?.push(floorFire);
      },
      loop: true
    });
  }
  
  startFireColorFlash() {
    // Create flashing red/orange tint effect
    this.fireColorTimer = this.time.addEvent({
      delay: 200, // Flash every 200ms
      callback: () => {
        if (!this.fireTacoActive) return;
        const colors = [0xff4500, 0xffa500, 0xff6600]; // Red, orange variations
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        this.player.setTint(randomColor);
      },
      loop: true
    });
  }
  
  // Helper function to get actual sprite center
  getSpriteCenter(sprite: any) {
    const centerX = sprite.x + sprite.displayWidth * (0.5 - sprite.originX);
    const centerY = sprite.y + sprite.displayHeight * (0.5 - sprite.originY);
    return { x: centerX, y: centerY };
  }
  
  // Generate randomized fire positions for player
  generatePlayerFireOffsets() {
    // Define body zones relative to player height (assuming ~100px tall sprite)
    const zones = [
      { name: 'shoulder', minY: -45, maxY: -30 }, // Upper body/shoulder
      { name: 'torso', minY: -25, maxY: -10 },    // Mid torso  
      { name: 'hips', minY: -5, maxY: 10 },       // Hip level
      { name: 'legs', minY: 15, maxY: 30 },       // Leg area
      { name: 'trail', minY: -15, maxY: 15 }      // Behind player
    ];
    
    // Randomize offsets for each fire sprite
    const offsets: { x: number; y: number }[] = [];
    zones.forEach((zone, index) => {
      const randomY = zone.minY + Math.random() * (zone.maxY - zone.minY);
      const randomX = (Math.random() - 0.5) * 25; // -12.5 to +12.5 horizontal spread
      
      // Special case for trail - always behind
      if (zone.name === 'trail') {
        offsets.push({ x: -40 + randomX * 0.3, y: randomY });
      } else {
        offsets.push({ x: randomX, y: randomY });
      }
      
      // console.log(`[FIRE OFFSETS] ${zone.name}: x=${offsets[offsets.length - 1].x.toFixed(1)}, y=${offsets[offsets.length - 1].y.toFixed(1)}`);
    });
    
    return offsets;
  }
  
  updateFireSprites() {
    if (!this.fireTacoActive || !this.fireSprites) {
      return;
    }
    
    // Use smooth interpolation for fire sprite positions
    const lerpFactor = 0.8; // Higher = snappier, lower = smoother - increased for less lag
    
    // UPDATE POSITIONS WITH SMOOTH INTERPOLATION
    if (this.fireShoulder) {
      const targetX1 = this.player.x + 5;
      const targetY1 = this.player.y - 55;
      this.fireShoulder.x += (targetX1 - this.fireShoulder.x) * lerpFactor;
      this.fireShoulder.y += (targetY1 - this.fireShoulder.y) * lerpFactor;
    }
    if (this.fireBody) {
      const targetX2 = this.player.x + 10;
      const targetY2 = this.player.y - 10;
      this.fireBody.x += (targetX2 - this.fireBody.x) * lerpFactor;
      this.fireBody.y += (targetY2 - this.fireBody.y) * lerpFactor;
    }
    if (this.fireRight) {
      const targetX3 = this.player.x + 60;
      const targetY3 = this.player.y - 50;
      this.fireRight.x += (targetX3 - this.fireRight.x) * lerpFactor;
      this.fireRight.y += (targetY3 - this.fireRight.y) * lerpFactor;
    }
  }
  
  endFireTacoEffect() {
    this.fireTacoActive = false;
    
    // Clean up fire sprites
    if (this.fireSprites) {
      this.fireSprites.forEach(sprite => sprite?.destroy());
      this.fireSprites = [];
    }
    
    // Clean up floor fire trails
    if (this.floorFireTrails) {
      this.floorFireTrails.forEach(fire => fire?.destroy());
      this.floorFireTrails = [];
    }
    
    // Stop fire trail timer
    if (this.fireTrailTimer) {
      this.fireTrailTimer.remove();
      this.fireTrailTimer = undefined;
    }
    
    // Clear individual references
    this.fireShoulder = undefined;
    this.fireBody = undefined;
    this.fireRight = undefined;
    
    // Stop color flash
    if (this.fireColorTimer) {
      this.fireColorTimer.remove();
      this.fireColorTimer = undefined;
    }
    
    // Clear tint
    this.player.clearTint();
    
    // Enemy spawn rate remains unchanged throughout
  }
  
  // Fire Taco no longer uses recharge - it's a 20-second timed effect
  
  collectCrystalMagnet() {
    // Use the new display system for "GET OVER HERE!" text
    this.displayPowerUpText('get_over_here_text');
    
    // Register as combo event
    if (this.comboTracker) {
      this.comboTracker.registerTrick(this.score, this.isGrounded);
    }
    
    // Store magnet active state
    this.crystalMagnetActive = true;
    this.totalPowerUpsUsed++;
    
    // Remove magnet effect after 20 seconds (increased from 5)
    this.time.delayedCall(20000, () => {
      this.crystalMagnetActive = false;
    });
    
    // Spawn extra star patterns more frequently for 20 seconds
    let patternCount = 0;
    const starPatternTimer = this.time.addEvent({
      delay: 1000, // Spawn a pattern every second
      callback: () => {
        patternCount++;
        
        // Spawn a line of 5 stars
        const baseX = this.player.x + 400 + (patternCount * 200); // Space patterns out
        const baseY = this.player.y - 50;
        
        for (let i = 0; i < 5; i++) {
          const star = this.starPickups.create(
            baseX + (i * 60), // Horizontal line spacing
            baseY + Phaser.Math.Between(-20, 20), // Slight vertical variation
            'star_counter_icon'
          );
          star.setScale(0.036); // Reduced star size by 70% (30% of original 0.12)
          star.setDepth(10);
          star.value = 1;
        }
        
        if (patternCount >= 20) {  // Spawn for 20 seconds
          starPatternTimer.remove();
        }
      },
      loop: true
    });
  }
  
  showPowerUpBar() {
    if (!this.powerUpBarBg) {
      // Create Power-Up bar below stamina bar
      this.powerUpBarBg = this.add.graphics();
      this.powerUpBarBg.fillStyle(0x000000, 0.5);
      this.powerUpBarBg.fillRect(50, 230, 204, 24);
      this.powerUpBarBg.setDepth(100);
      this.powerUpBarBg.setScrollFactor(0);
      
      this.powerUpBar = this.add.graphics();
      this.powerUpBar.setDepth(101);
      this.powerUpBar.setScrollFactor(0);
      
      // Add Power-Up label
      this.powerUpText = this.add.text(50, 208, 'POWER-UP', {
        fontSize: '18px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffaa00',
        stroke: '#000000',
        strokeThickness: 4
      });
      this.powerUpText.setDepth(100);
      this.powerUpText.setScrollFactor(0);
    }
    
    // Always ensure visibility
    this.powerUpBarBg.setVisible(true);
    this.powerUpBar.setVisible(true);
    this.powerUpText.setVisible(true);
    
    this.updatePowerUpBar();
  }
  
  hidePowerUpBar() {
    if (this.powerUpBarBg) {
      this.powerUpBarBg.setVisible(false);
      this.powerUpBar.setVisible(false);
      this.powerUpText.setVisible(false);
    }
  }
  
  updatePowerUpBar() {
    if (!this.powerUpBar || !this.powerUpBar.visible) return;
    
    this.powerUpBar.clear();
    const color = this.activePowerUp === 'metal_boot' ? 0x888888 : 0xff6600; // Gray for boot, orange for taco
    this.powerUpBar.fillStyle(color);
    const barWidth = (this.powerUpCharge / this.maxPowerUpCharge) * 200;
    this.powerUpBar.fillRect(52, 232, barWidth, 20);
  }
  
  // performGroundStomp removed - metal boot is now passive
  
  shootFireball() {
    if (this.activePowerUp !== 'fire_taco' || this.powerUpCharge < 33.33) return;
    
    this.powerUpCharge = Math.max(0, this.powerUpCharge - 33.33);
    this.updatePowerUpBar();
    
    // Start recharge if not already running
    if (!this.powerUpRechargeTimer) {
      this.startPowerUpRecharge();
    }
    
    // Create fireball
    const fireball = this.fireballs.create(
      this.player.x + 50,
      this.player.y,
      'fire_taco'
    );
    fireball.setScale(0.08);
    fireball.setDepth(15);
    (fireball.body as any).setVelocityX(600); // Fast forward speed
    
    // Add flame particle trail
    this.tweens.add({
      targets: fireball,
      scaleX: 0.12,
      scaleY: 0.12,
      duration: 300,
      yoyo: true,
      repeat: -1
    });
    
    // Play fireball sound
    this.sound.play('new_explosion_sfx', { volume: 0.3 });
    
    // Destroy fireball after 2 seconds
    this.time.delayedCall(2000, () => {
      if (fireball && fireball.active) {
        fireball.destroy();
      }
    });
  }
  
  startPowerUpRecharge() {
    if (this.powerUpRechargeTimer) {
      this.powerUpRechargeTimer.remove();
    }
    
    // Recharge over 10 seconds
    this.powerUpRechargeTimer = this.time.addEvent({
      delay: 100, // Update every 100ms
      callback: () => {
        // For metal boot, we recharge from 0 to 100 regardless of uses
        if (this.activePowerUp === 'metal_boot' && this.metalBootUses === 0) {
          this.powerUpCharge = Math.min(100, this.powerUpCharge + 1);
          this.updatePowerUpBar();
          
          if (this.powerUpCharge >= 100) {
            // Restore all 3 uses
            this.metalBootUses = 3;
            this.powerUpRechargeTimer?.remove();
            this.powerUpRechargeTimer = undefined;
          }
        }
        // Fire Taco no longer uses recharge - it's a 20-second timed effect
      },
      callbackScope: this,
      loop: true
    });
  }
  
  losePowerUp() {
    // End fire taco effect if active
    if (this.activePowerUp === 'fire_taco' || this.fireTacoActive) {
      this.endFireTacoEffect();
    }
    
    // Clear all power-up states
    this.activePowerUp = null;
    this.metalBootActive = false;
    
    // Reset player depth if Metal Boot was active
    if (!this.invulnerable) {
      this.player.setDepth(10);
    }
    this.fireTacoActive = false;
    this.crystalMagnetActive = false;
    
    // Clear player tint immediately (unless invulnerable from damage)
    if (!this.invulnerable) {
      this.player.clearTint();
    }
    
    // Clear any power-up timers
    if (this.powerUpRechargeTimer) {
      this.powerUpRechargeTimer.remove();
      this.powerUpRechargeTimer = undefined;
    }
    if (this.fireCycleTimer) {
      this.fireCycleTimer.remove();
      this.fireCycleTimer = undefined;
    }
  }
  
  collectSandwich(sandwich: any) {
    // Play bite sound effect
    this.playSFX('bite_sfx', { volume: 0.5 });
    
    // Increment sandwich counter
    this.sandwichesCollected++;
    
    // Heal player
    this.health = Math.min(this.maxHealth, this.health + 40);
    this.updateHealthBar();
    
    // Add score
    this.score += 25;
    this.scoreText.setText('Score: ' + this.score);
    
    // Register as combo event
    if (this.comboTracker) {
      this.comboTracker.registerTrick(this.score, this.isGrounded);
    }
    
    // Play particle effect at sandwich location
    this.jumpParticles.setPosition(sandwich.x, sandwich.y);
    this.jumpParticles.explode(15);
    
    // Remove sandwich
    sandwich.destroy();
    
// console.log(`Sandwich collected! Health: ${this.health}/${this.maxHealth}, Total: ${this.sandwichesCollected}`);
  }
  
  createStarSystem() {
    // Create physics group for star pickups
    this.starPickups = this.physics.add.group({
      allowGravity: false
    });
    
    // Start spawning star patterns
    this.starSpawnTimer = this.time.addEvent({
      delay: 30000, // Spawn star patterns every 30 seconds  
      callback: this.spawnStarPattern,
      callbackScope: this,
      loop: true
    });
    
    // First star pattern after 20 seconds
    this.time.delayedCall(20000, () => {
      if (!this.gameWon) {
        this.spawnStarPattern();
      }
    });
    
    // Add collision for star collection
    this.physics.add.overlap(this.player, this.starPickups, (player: any, star: any) => {
      const value = (star as any).value || 1;
      
      // Play appropriate sound effect based on star type
      if (value === 10) {
        this.playSFX('star_cluster_sfx', { volume: 0.5 });
      } else {
        this.playSFX('new_star_sfx', { volume: 0.4 });
      }
      
      this.collectStars(value);
      star.destroy();
    }, undefined, this);
  }
  
  spawnStarPattern() {
    // Don't spawn stars if game is won
    if (this.gameWon) return;
    
    const baseX = this.player.x + Phaser.Math.Between(800, 1200);
    const baseY = Phaser.Math.Between(600, 750); // Can be ground or air level
    
    // Spawn a line of 3-5 single stars
    const starCount = Phaser.Math.Between(3, 5);
    for (let i = 0; i < starCount; i++) {
      const star = this.starPickups.create(baseX + (i * 80), baseY, 'star_counter_icon');
      star.setScale(0.036); // Reduced star size by 70% (30% of original 0.12)
      star.setDepth(9);
      (star as any).value = 1;
      
      // Add subtle floating animation
      this.tweens.add({
        targets: star,
        y: star.y - 10,
        duration: 1000,
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1
      });
    }
    
    // 30% chance to add a 10-star at the end of the line
    if (Math.random() < 0.3) {
      const bigStar = this.starPickups.create(baseX + (starCount * 80), baseY, 'star_ten');
      bigStar.setScale(0.15);
      bigStar.setDepth(9);
      (bigStar as any).value = 10;
      
      // Add more prominent animation for the big star
      this.tweens.add({
        targets: bigStar,
        y: bigStar.y - 15,
        scale: 0.12,
        duration: 800,
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1
      });
    }
    
// console.log(`Star pattern spawned at (${baseX}, ${baseY})`);
  }
  
  collectStars(amount: number) {
    this.stars += amount;
    this.starText.setText(this.stars.toString());

    // Track for challenges
    this.challengeManager.updateChallenge('collect_stars', amount);
    this.updateChallengeDisplay();
    
    // Track stars collected during an active combo
    if (this.comboTracker && (this.comboTracker.isActive() || this.comboTracker.isPending())) {
      this.comboTracker.addStarsToCombo(amount);
    }
    
    // Only show floating text for multiple stars (not single stars)
    if (amount > 1) {
      const floatingText = this.add.text(this.player.x, this.player.y - 80, `+${amount}`, {
        fontSize: '20px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 4
      });
      floatingText.setOrigin(0.5, 0.5);
      floatingText.setDepth(20);
      
      // Stay by player's head for a moment, then fade away
      this.time.delayedCall(500, () => {
        this.tweens.add({
          targets: floatingText,
          alpha: 0,
          y: floatingText.y - 30,
          duration: 1000,
          ease: 'Power2.easeOut',
          onComplete: () => floatingText.destroy()
        });
      });
    }
    
    // Check if player earned an extra life (every 100 stars)
    while (this.stars >= this.nextLifeAt) {
      this.lives++; // Add extra life
      this.updateLifeDisplay();
      this.nextLifeAt += this.starLifeThreshold; // Set next milestone (200, 300, 400, etc.)
      
      // Show "1UP" message
      const oneUpText = this.add.text(this.player.x, this.player.y - 100, '1UP!', {
        fontSize: '32px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#00ff00',
        stroke: '#000000',
        strokeThickness: 4
      });
      oneUpText.setDepth(20);
      
      this.tweens.add({
        targets: oneUpText,
        y: oneUpText.y - 80,
        alpha: 0,
        duration: 1500,
        onComplete: () => oneUpText.destroy()
      });
      
// console.log('[EXTRA LIFE] Earned 1UP! Lives: ' + this.lives);
    }
    
    // Add a shine effect to the star counter instead of scaling
    const shineEffect = this.add.graphics();
    shineEffect.x = this.starIcon.x;
    shineEffect.y = this.starIcon.y;
    shineEffect.setDepth(101);
    shineEffect.setScrollFactor(0);
    
    // Create a white shine overlay
    shineEffect.fillStyle(0xffffff, 0.7);
    shineEffect.fillCircle(0, 0, 25);
    
    // Animate the shine effect
    this.tweens.add({
      targets: shineEffect,
      alpha: { from: 0.7, to: 0 },
      scale: { from: 0.5, to: 1.5 },
      duration: 500,
      ease: 'Cubic.out',
      onComplete: () => {
        shineEffect.destroy();
      }
    });
    
    // Also add a subtle glow to the text
    this.tweens.add({
      targets: this.starText,
      alpha: { from: 1, to: 0.5 },
      duration: 200,
      yoyo: true,
      ease: 'Sine.inOut'
    });
    
// console.log(`Collected ${amount} stars! Total: ${this.stars}`);
  }
  
  updateBackgroundTiles() {
    if (this.backgroundTiles.length === 0) return;
    
    const cameraX = this.cameras.main.scrollX;
    const screenWidth = 640;
    
    // Find the leftmost and rightmost tiles
    let leftmostTile = this.backgroundTiles[0];
    let rightmostTile = this.backgroundTiles[this.backgroundTiles.length - 1];
    
    // Remove tiles that are too far behind
    while (this.backgroundTiles.length > 0 && this.backgroundTiles[0].x < cameraX - screenWidth) {
      const tileToRemove = this.backgroundTiles.shift();
      if (tileToRemove) tileToRemove.destroy();
    }
    
    // Add new tiles ahead if needed
    if (this.backgroundTiles.length > 0) {
      rightmostTile = this.backgroundTiles[this.backgroundTiles.length - 1];
      
      while (rightmostTile.x < cameraX + screenWidth * 2) {
        const newX = rightmostTile.x + this.backgroundWidth;
        const newTile = this.add.image(newX, 960, 'city_background')
          .setOrigin(0.5, 1)
          .setScrollFactor(1.0)
          .setDepth(1)
          .setScale(1.1, 1.1);
        this.backgroundTiles.push(newTile);
        rightmostTile = newTile;
      }
    }
  }

  createLifeDisplay() {
    // Create life icon and text - positioned slightly more to the right
    this.lifeIcon = this.add.image(500, 62, 'life_icon');
    this.lifeIcon.setScale(0.12); // Keep larger size
    this.lifeIcon.setDepth(102); // Higher depth than star (100)
    this.lifeIcon.setScrollFactor(0);
    
    this.lifeText = this.add.text(540, 62, this.lives.toString(), {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: '"Press Start 2P", monospace',
      stroke: '#000000',
      strokeThickness: 4
    });
    this.lifeText.setOrigin(0, 0.5);
    this.lifeText.setDepth(100);
    this.lifeText.setScrollFactor(0);
  }
  
  updateLifeDisplay() {
    // Update the life counter text
    if (this.lifeText) {
      this.lifeText.setText(this.lives.toString());
    }
  }
  
  respawnPlayer() {
    // Reset player health only - not position or movement state
    this.health = 100;
    this.updateHealthBar();
    this.stamina = 100;
    this.updateStaminaBar();
    
    // Reset time-based challenges when losing a life
    this.challengeManager.resetNoDamageChallenge();
    this.challengeManager.resetSurviveChallenge();
    
    // Lose power-up when life is lost
    this.losePowerUp();
    
    // Music continues playing during respawn - no need to restart
    
    // Reset game state but preserve player movement/position
    this.gameOverTriggered = false;
    this.invulnerable = true; // Give temporary invulnerability after respawn
    this.player.clearTint();
    // Don't reset Y position - player continues what they were doing
    // Don't reset jump states - preserve current action
    // Don't change sprite - keep current animation state
    
    // Don't clear obstacles or enemies - they should persist when losing a life
    
    // Flash effect to indicate respawn
    let flashCount = 0;
    const flashTimer = this.time.addEvent({
      delay: 150,
      callback: () => {
        flashCount++;
        if (flashCount % 2 === 0) {
          this.player.setAlpha(1);
        } else {
          this.player.setAlpha(0.5);
        }
        
        if (flashCount >= 12) {
          this.player.setAlpha(1);
          this.invulnerable = false;
          flashTimer.remove();
        }
      },
      loop: true
    });
    
// console.log('[RESPAWN] Player respawned with full health');
  }
  
  cleanupAndStop() {
    // First pause all systems to prevent any updates during cleanup
    this.gamePaused = true;
    this.physics.pause();
    this.time.paused = true;
    
    // Call shutdown to do all cleanup
    this.shutdown();
    
    // Force destroy all children of the scene
    this.children.removeAll();
    
    // Then stop the scene
    this.scene.stop();
  }

  shutdown() {
    // Remove event listeners
    if (this.escListener) {
      this.input.keyboard?.off('keydown-ESC', this.escListener);
      this.escListener = undefined;
    }
    if (this.pauseListener) {
      this.input.keyboard?.off('keydown-P', this.pauseListener);
      this.pauseListener = undefined;
    }
    
    // Remove all keyboard listeners
    this.input.keyboard?.removeAllListeners();
    this.input.removeAllListeners();
    
    // Stop all tweens immediately
    this.tweens.killAll();
    
    // Stop all timers
    this.time.removeAllEvents();
    
    // Clean up trick message manager tweens and messages
    if (this.trickMessageManager) {
      this.trickMessageManager.cleanup();
      this.trickMessageManager = null as any;
    }
    
    // Clean up any active power-up effects
    if (this.fireTacoActive) {
      this.endFireTacoEffect();
    }
    
    // Clean up all active power-up texts
    if (this.activePowerUpTexts) {
      this.activePowerUpTexts.forEach(item => {
        if (item.container) {
          item.container.destroy();
        }
      });
      this.activePowerUpTexts = [];
    }
    
    // Clean up song title container
    if (this.songTitleContainer) {
      this.songTitleContainer.destroy();
      this.songTitleContainer = undefined;
    }
    
    // Clean up background music
    this.stopBackgroundMusic();
    
    // Clean up all arrow indicators when scene shuts down
    if (this.arrowIndicators) {
      // Stop all tweens on arrows before destroying
      this.arrowIndicators.children.entries.forEach((arrow: any) => {
        const arrowTween = arrow.flashTween;
        if (arrowTween) {
          arrowTween.stop();
          arrowTween.remove();
        }
      });
      this.arrowIndicators.clear(true, true); // Remove and destroy all arrows
    }
    
    // Clean up any remaining arrows attached to enemies
    if (this.enemies) {
      this.enemies.children.entries.forEach((enemy: any) => {
        if (enemy.arrow) {
          const arrowTween = (enemy.arrow as any).flashTween;
          if (arrowTween) {
            arrowTween.stop();
            arrowTween.remove();
          }
          enemy.arrow.destroy();
          enemy.arrow = null;
        }
      });
    }
    
    // Clean up any remaining arrows attached to obstacles
    if (this.obstacles) {
      this.obstacles.children.entries.forEach((obstacle: any) => {
        if (obstacle.arrow) {
          const arrowTween = (obstacle.arrow as any).flashTween;
          if (arrowTween) {
            arrowTween.stop();
            arrowTween.remove();
          }
          obstacle.arrow.destroy();
          obstacle.arrow = null;
        }
      });
    }
    
    // Clean up any remaining arrows attached to sandwiches or energy drinks
    if (this.sandwiches) {
      this.sandwiches.children.entries.forEach((item: any) => {
        if (item.arrow) {
          const arrowTween = (item.arrow as any).flashTween;
          if (arrowTween) {
            arrowTween.stop();
            arrowTween.remove();
          }
          item.arrow.destroy();
          item.arrow = null;
        }
      });
    }
    
    if (this.energyDrinks) {
      this.energyDrinks.children.entries.forEach((item: any) => {
        if (item.arrow) {
          const arrowTween = (item.arrow as any).flashTween;
          if (arrowTween) {
            arrowTween.stop();
            arrowTween.remove();
          }
          item.arrow.destroy();
          item.arrow = null;
        }
      });
    }
    
    // Clean up cached challenge display elements
    if (this.challengeDisplay) {
      this.challengeDisplay.destroy(true);
      this.challengeDisplay = undefined;
    }
    
    // Clean up cached text elements to prevent null reference errors
    if (this.challengeWaveText) {
      this.challengeWaveText.destroy();
      this.challengeWaveText = undefined;
    }
    if (this.challengeTextBg) {
      this.challengeTextBg.destroy();
      this.challengeTextBg = undefined;
    }
    if (this.challengeDescText) {
      this.challengeDescText.destroy();
      this.challengeDescText = undefined;
    }
    if (this.challengeProgressText) {
      this.challengeProgressText.destroy();
      this.challengeProgressText = undefined;
    }
    
    // Clean up all HUD elements
    if (this.healthBar) {
      this.healthBar.destroy();
      this.healthBar = undefined as any;
    }
    if (this.healthBarBg) {
      this.healthBarBg.destroy();
      this.healthBarBg = undefined as any;
    }
    if (this.healthText) {
      this.healthText.destroy();
      this.healthText = undefined as any;
    }
    if (this.staminaBar) {
      this.staminaBar.destroy();
      this.staminaBar = undefined as any;
    }
    if (this.staminaBarBg) {
      this.staminaBarBg.destroy();
      this.staminaBarBg = undefined as any;
    }
    if (this.staminaText) {
      this.staminaText.destroy();
      this.staminaText = undefined as any;
    }
    if (this.scoreText) {
      this.scoreText.destroy();
      this.scoreText = undefined as any;
    }
    if (this.distanceText) {
      this.distanceText.destroy();
      this.distanceText = undefined as any;
    }
    if (this.starIcon) {
      this.starIcon.destroy();
      this.starIcon = undefined as any;
    }
    if (this.starText) {
      this.starText.destroy();
      this.starText = undefined as any;
    }
    if (this.lifeIcon) {
      this.lifeIcon.destroy();
      this.lifeIcon = undefined as any;
    }
    if (this.lifeText) {
      this.lifeText.destroy();
      this.lifeText = undefined as any;
    }
    
    // Clean up all pause menu elements if they exist
    const pauseElements = ['pauseBg', 'pauseTitle', 'resumeBtn', 'musicToggle', 'songsOption', 'sfxToggle', 'menuBtn', 
                           'confirmBg', 'confirmTitle', 'confirmText', 'yesBtn', 'noBtn',
                           'pausedOverlay', 'pausedText', 'pauseMenuBg', 'musicMenuBg', 'musicTitle', 
                           'musicBackBtn', 'songToggle_broken_code', 'songToggle_undead_empire', 
                           'songToggle_menu_music', 'masterMusicToggle'];
    pauseElements.forEach(name => {
      const element = this.children.getByName(name);
      if (element) element.destroy();
    });
    
    // Clean up managers
    if (this.waveManager) {
      this.waveManager = null as any;
    }
    if (this.challengeManager) {
      this.challengeManager = null as any;
    }
    if (this.comboTracker) {
      this.comboTracker = null as any;
    }
    
    // Clean up all physics groups
    if (this.obstacles) {
      this.obstacles.clear(true, true);
      this.obstacles = null as any;
    }
    if (this.enemies) {
      this.enemies.clear(true, true);
      this.enemies = null as any;
    }
    if (this.sandwiches) {
      this.sandwiches.clear(true, true);
      this.sandwiches = null as any;
    }
    if (this.energyDrinks) {
      this.energyDrinks.clear(true, true);
      this.energyDrinks = null as any;
    }
    if (this.powerUps) {
      this.powerUps.clear(true, true);
      this.powerUps = null as any;
    }
    if (this.starPickups) {
      this.starPickups.clear(true, true);
      this.starPickups = null as any;
    }
    if (this.explosions) {
      this.explosions.clear(true, true);
      this.explosions = null as any;
    }
    if (this.fireballs) {
      this.fireballs.clear(true, true);
      this.fireballs = null as any;
    }
    if (this.groundSegments) {
      this.groundSegments.clear(true, true);
      this.groundSegments = null as any;
    }
    
    // Clean up player and related objects
    if (this.player) {
      this.player.destroy();
      this.player = null as any;
    }
    if (this.stompHitbox) {
      this.stompHitbox.destroy();
      this.stompHitbox = null as any;
    }
    if (this.fireBreath) {
      this.fireBreath.destroy();
      this.fireBreath = null as any;
    }
    
    // Clean up fire sprites if they exist
    if (this.fireSprites) {
      this.fireSprites.forEach(sprite => {
        if (sprite) sprite.destroy();
      });
      this.fireSprites = [];
    }
    
    // Clean up background tiles
    if (this.backgroundTiles) {
      this.backgroundTiles.forEach(tile => {
        if (tile) tile.destroy();
      });
      this.backgroundTiles = [];
    }
    
    // Clean up red sky background
    if (this.redSkyBg) {
      this.redSkyBg.destroy();
      this.redSkyBg = null;
    }
    
    // Reset game state variables
    this.gameOverTriggered = false;
    this.gamePaused = false;
    this.invulnerable = false;
    this.fireTacoActive = false;
    this.crystalMagnetActive = false;
    this.metalBootActive = false;
    this.staminaBoostActive = false;
  }

  update() {
    // Skip update logic if game is paused
    if (this.gamePaused) {
      return;
    }
    
    // Update wave manager
    try {
      this.waveManager.update(this.game.loop.delta);
    } catch (error) {
      console.error('[DEBUG] Error updating wave manager:', error);
    }
    
    // Update time-based challenges
    try {
      this.challengeManager.updateTimeChallenges();
      this.challengeManager.updateNoDamageChallenge();
    } catch (error) {
      console.error('[DEBUG] Error updating challenges:', error);
    }
    
    // Check for combo achievements
    if (this.comboTracker) {
      const comboState = this.comboTracker.getComboState();
      if (comboState.multiplier > 1) {
        this.challengeManager.updateChallenge('get_combo', comboState.multiplier);
      }
    }
    
    // Challenge display now updates via its own 1-second timer for time-based challenges
    
    // Update trick message queue
    if (this.trickMessageManager) {
      this.trickMessageManager.update(this.time.now, 0);  // Pass delta as 0 for now
    }
    
    // Get player body for velocity checks
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    
    // Update red sky background scrolling for parallax effect
    if (this.redSkyBg) {
      // Scroll the tile position based on camera position for infinite repeating
      this.redSkyBg.tilePositionX = this.cameras.main.scrollX * 0.3; // Slower scrolling for parallax
    }
    
    // Manage infinite background scrolling (update every 100ms)
    if (this.time.now - this.lastBackgroundUpdate > 100) {
      this.updateBackgroundTiles();
      this.lastBackgroundUpdate = this.time.now;
    }
    
    // Regenerate stamina slowly (unless boost is active)
    if (!this.staminaBoostActive && this.stamina < this.maxStamina) {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen);
    }
    this.updateStaminaBar(); // Always update to handle flashing during boost
    this.updateHealthBar(); // Always update to handle flashing during boost
    
    // Update power-up tints less frequently (every 50ms instead of every frame)
    if (this.time.now - this.lastPowerUpTintUpdate > 50) {
      this.updatePowerUpTints(); // Update power-up color effects
      this.lastPowerUpTintUpdate = this.time.now;
    }
    
    // Force movement by directly updating position since velocity isn't working
    // Apply speed multiplier for progressive difficulty
    const baseSpeed = 6.3; // Base movement speed
    const currentSpeed = baseSpeed * this.speedMultiplier;
    this.player.x += currentSpeed; // Move with increasing speed over time
    
    // Still set velocity for physics calculations
    this.player.setVelocityX(380 * this.speedMultiplier);
    
    // Removed velocity logging for performance
    
    // Removed debug logging for performance
    
    // Handle jumping with simple state check
    if ((Phaser.Input.Keyboard.JustDown(this.cursors.space!) || 
         Phaser.Input.Keyboard.JustDown(this.cursors.up!)) || 
         this.controls.justTapped()) {
      this.performJump();
    }
    
    // Handle swipe-up for tricks while airborne (mobile)
    if (this.controls.justSwipedUp() && !this.isGrounded) {
      this.performTrick();
    }
    
    // Handle J key for tricks while airborne (desktop)
    if (Phaser.Input.Keyboard.JustDown(this.trickKey) && !this.isGrounded) {
      // console.log('[J KEY] J key detected for trick!');
      this.performTrick();
    }
    
    // Swipe-down no longer needed for power-ups (all are passive)
    
    // Update fire sprite positions every frame for smoother animation with interpolation
    if (this.fireTacoActive) {
      this.updateFireSprites();
    }
    
    // Update world scrolling for infinite background
    this.world.update(this.cameras.main.scrollX);
    
    // Update trick particles to follow player during tricks
    if (this.trickActive && this.trickParticles.emitting) {
      this.trickParticles.setPosition(this.player.x, this.player.y);
    }
    
    // Update score based on distance traveled (incremental)
    const currentDistanceMilestone = Math.floor((this.player.x - 320) / 100);
    if (currentDistanceMilestone > this.lastDistanceScoreMilestone) {
      // Add 10 points for each new milestone reached
      const milestonesGained = currentDistanceMilestone - this.lastDistanceScoreMilestone;
      this.score += (milestonesGained * 10);
      this.lastDistanceScoreMilestone = currentDistanceMilestone;
      this.scoreText.setText(`Score: ${this.score}`);
    }
    
    // Clean up off-screen obstacles
    this.obstacles.children.entries.forEach((obstacle: any) => {
      if (obstacle.x < this.cameras.main.scrollX - 200) {
        // Clean up fire effects if obstacle is on fire
        if (obstacle.getData('fireEffects')) {
          const fires = obstacle.getData('fireEffects');
          fires.forEach((fire: any) => fire.destroy());
        }
        // Clean up fire effects before destroying
        this.cleanupObstacleFireEffects(obstacle);
        this.obstacles.remove(obstacle);
        obstacle.destroy();
      }
    });
    
    // Clean up off-screen sandwiches
    this.sandwiches.children.entries.forEach((sandwich: any) => {
      if (sandwich.x < this.cameras.main.scrollX - 200) {
        this.sandwiches.remove(sandwich);
        sandwich.destroy();
      }
    });
    
    // Clean up off-screen stars
    this.starPickups.children.entries.forEach((star: any) => {
      if (star.x < this.cameras.main.scrollX - 200) {
        this.starPickups.remove(star);
        star.destroy();
      }
    });
    
    // Crystal Magnet proximity-based magnetization with spinning effect
    if (this.crystalMagnetActive) {
      this.starPickups.children.entries.forEach((star: any) => {
        if (star && star.active) {
          const distance = Phaser.Math.Distance.Between(
            this.player.x, this.player.y,
            star.x, star.y
          );
          
          // Check if star is within magnetization range (300 pixels)
          if (distance <= 300 && !star.magnetizing) {
            star.magnetizing = true;
            
            // Start slower spinning animation
            this.tweens.add({
              targets: star,
              rotation: Math.PI * 2, // 1 full rotation (reduced from 3)
              duration: 2000, // Much slower (increased from 800)
              ease: 'Linear',
              repeat: -1 // Keep spinning
            });
            
            // Create a continuous tracking tween that follows player
            star.magnetTween = this.tweens.add({
              targets: star,
              x: this.player.x,
              y: this.player.y,
              duration: 800,
              ease: 'Power2.easeIn',
              onUpdate: (tween) => {
                // Add swirling effect by modifying position during tween
                const progress = tween.progress;
                const swirl = Math.sin(progress * Math.PI * 3) * 30;
                star.x += swirl * 0.1;
                
                // Update target to current player position
                if (tween.data && tween.data[0]) {
                  (tween.data[0] as any).end = this.player.x;
                }
                if (tween.data && tween.data[1]) {
                  (tween.data[1] as any).end = this.player.y;
                }
              },
              onComplete: () => {
                // If star missed player, create new tween to keep chasing
                if (star && star.active) {
                  star.magnetTween = this.tweens.add({
                    targets: star,
                    x: this.player.x,
                    y: this.player.y,
                    duration: 600,
                    ease: 'Power2.easeIn',
                    onUpdate: (tween) => {
                      // Keep updating target position
                      if (tween.data && tween.data[0]) {
                        (tween.data[0] as any).end = this.player.x;
                      }
                      if (tween.data && tween.data[1]) {
                        (tween.data[1] as any).end = this.player.y;
                      }
                    },
                    onComplete: () => {
                      // Keep looping back if still active
                      if (star && star.active && this.crystalMagnetActive) {
                        star.magnetizing = false; // Reset to trigger again
                      }
                    }
                  });
                }
              }
            });
          }
        }
      });
    }
    
    // Clean up orphaned arrow indicators (safety check)
    this.arrowIndicators.children.entries.forEach((arrow: any) => {
      // Set creation time if not set
      if (!arrow.createdTime) {
        arrow.createdTime = this.time.now;
      }
      // Remove arrows that have been alive for more than 3 seconds
      // (warning time is 2 seconds, so 3 seconds is more than enough)
      if (this.time.now - arrow.createdTime > 3000) {
        // console.log('[ARROW CLEANUP] Removing orphaned arrow indicator');
        arrow.destroy();
      }
    });
    
    // Clean up off-screen enemies and manage arrow indicators
    this.enemies.children.entries.forEach((enemy: any, index: number) => {
      // Removed enemy tracking debug for performance
      
      // Remove arrow when enemy is on screen (visible)
      if (enemy.arrow && enemy.x < this.player.x + 640) {
// console.log(`[DEBUG ARROW] Destroying arrow as enemy is on screen at X=${enemy.x}`);
        enemy.arrow.destroy();
        enemy.arrow = null;
      }
      
      // Clean up off-screen enemies
      if (enemy.x < this.cameras.main.scrollX - 200) {
        // Also remove arrow if still exists
        if (enemy.arrow) {
          enemy.arrow.destroy();
        }
        this.enemies.remove(enemy);
        enemy.destroy();
      }
    });
    
    // Check if player fell too far (infinite runner should never end)
    if (this.player.y > 1200) {
// console.log('Player fell - restarting scene');
      this.scene.restart();
    }
    
    // Get physics body for ground checks
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    
    // Disable gravity when on ground to prevent constant downward force
    if (this.isGrounded) {
      body.allowGravity = false;
    } else {
      body.allowGravity = true;
    }
    
    // Predict if player will land this frame and prevent overshooting
    if (!this.isGrounded && body.velocity.y > 0) {
      const nextY = this.player.y + (body.velocity.y * this.game.loop.delta / 1000);
      
      // If next position would be at or below ground, land NOW
      if (nextY >= PLAYER_GROUND_Y) {
        // Set to exact ground position before overshooting
        this.player.y = PLAYER_GROUND_Y;
        this.handleLanding();
      }
    }
    
    // Jump tracking removed - no longer needed
    
    // Keep zombie absolutely stable on ground when grounded
    if (this.isGrounded) {
      // Lock to exact ground position
      this.player.y = PLAYER_GROUND_Y;
      // Zero all Y velocity
      this.player.setVelocityY(0);
      body.velocity.y = 0;
    }
    
    // Update combo system with ground state
    if (this.comboTracker) {
      const starsEarned = this.comboTracker.updateAirState(this.score, this.wasGrounded, this.isGrounded);
      this.wasGrounded = this.isGrounded;
      
      // Update combo UI every frame to ensure it's hidden when inactive
      this.updateComboUI();
    }
  }
  
  setupComboUI() {
    // No longer create a separate comboUI object - use text management system instead
  }
  
  updateComboUI() {
    // Remove all combo UI updates - we don't want any active combo display
    // Only the trick messages and end combo message will show
  }
  
  // Removed showComboEndEffect - now handled directly in comboEnded event
  
  onWaveChange(wave: number) {
    // Check if all waves are complete
    if (this.waveManager.isWaveComplete()) {
      this.showResultsScreen();
      return;
    }
    
    // Generate new challenges for the wave
    this.challengeManager.generateChallengesForWave(wave);
    
    // Force spawn rate update for new wave
    const gameTime = this.time.now - this.gameStartTime;
    const difficulty = this.getDifficulty(gameTime);
    this.lastDifficulty = -1; // Reset to force update
    this.updateSpawnRate(difficulty);
    this.updateEnemySpawnRate(difficulty);
    
    // Update UI display
    this.updateChallengeDisplay();
  }
  
  showResultsScreen() {
    // Make player invulnerable once they've won
    this.invulnerable = true;
    this.gameOverTriggered = true; // Prevent game over from triggering
    
    // Stop spawning
    if (this.obstacleTimer) {
      this.obstacleTimer.remove();
      this.obstacleTimer = null;
    }
    if (this.enemyTimer) {
      this.enemyTimer.remove();
      this.enemyTimer = null;
    }
    if (this.powerUpTimer) {
      this.powerUpTimer.remove();
      this.powerUpTimer = null;
    }
    
    // Create dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, 640, 960);
    overlay.setScrollFactor(0);
    overlay.setDepth(300);
    
    // Create results container
    const resultsContainer = this.add.container(320, 480);
    resultsContainer.setScrollFactor(0);
    resultsContainer.setDepth(301);
    
    // Title
    const titleText = this.add.text(0, -200, 'WAVES COMPLETE!', {
      fontSize: '32px',
      color: '#ffd700',
      fontFamily: '"Press Start 2P", monospace',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    resultsContainer.add(titleText);
    
    // Stats
    const statsText = [
      `SCORE: ${this.score}`,
      `STARS: ${this.stars}`,
      `ENEMIES: ${this.enemiesDefeated}`,
      `SANDWICHES: ${this.sandwichesCollected}`,
      `ENERGY DRINKS: ${this.cansCollected}`
    ];
    
    statsText.forEach((stat, index) => {
      const text = this.add.text(0, -100 + (index * 40), stat, {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: '"Press Start 2P", monospace',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5);
      resultsContainer.add(text);
    });
    
    // Continue button
    const continueBg = this.add.graphics();
    continueBg.fillStyle(0x4caf50, 1);
    continueBg.fillRoundedRect(-150, 140, 300, 60, 10);
    resultsContainer.add(continueBg);
    
    const continueText = this.add.text(0, 170, 'CONTINUE', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: '"Press Start 2P", monospace',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    continueText.setInteractive();
    resultsContainer.add(continueText);
    
    // Continue button handler
    continueText.on('pointerdown', () => {
      // Reset wave manager
      this.waveManager.reset();
      this.challengeManager.reset();
      
      // Generate new challenges for Wave 1
      this.challengeManager.generateChallengesForWave(1);
      
      // Reset challenge timer flag so it starts at 0
      this.hasResetChallengeTimer = false;
      
      // Reset speed
      this.speedMultiplier = 1.0;
      
      // Destroy results screen
      overlay.destroy();
      resultsContainer.destroy();
      
      // Restart spawning
      this.restartSpawning();
      
      // Update display
      this.updateChallengeDisplay();
    });
    
    // Hover effect
    continueText.on('pointerover', () => {
      continueBg.clear();
      continueBg.fillStyle(0x66bb6a, 1);
      continueBg.fillRoundedRect(-150, 140, 300, 60, 10);
    });
    
    continueText.on('pointerout', () => {
      continueBg.clear();
      continueBg.fillStyle(0x4caf50, 1);
      continueBg.fillRoundedRect(-150, 140, 300, 60, 10);
    });
  }
  
  restartSpawning() {
    // Restart obstacle spawning
    if (this.obstacleTimer) {
      this.obstacleTimer.remove();
    }
    this.obstacleTimer = this.time.addEvent({
      delay: 3000,
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true
    });
    
    // Restart enemy spawning
    if (this.enemyTimer) {
      this.enemyTimer.remove();
    }
    this.enemyTimer = this.time.addEvent({
      delay: 5000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });
    
    // Restart power-up spawning
    if (this.powerUpTimer) {
      this.powerUpTimer.remove();
    }
    this.powerUpTimer = this.time.addEvent({
      delay: 20000,
      callback: this.spawnPowerUp,
      callbackScope: this,
      loop: true
    });
  }
  
  updateChallengeDisplay() {
    // No throttling - allow immediate updates for timer accuracy
    
    // Always update time-based challenges before displaying to ensure accurate values
    try {
      this.challengeManager.updateTimeChallenges();
      this.challengeManager.updateNoDamageChallenge();
    } catch (error) {
      console.error('[DEBUG] Error updating time challenges:', error);
    }
    
    // Check if text objects have valid data (they can lose it during scene restart)
    const needsRecreation = !this.challengeDisplay || 
                           (this.challengeWaveText && !(this.challengeWaveText as any).texture?.frames) ||
                           (this.challengeDescText && !(this.challengeDescText as any).texture?.frames) ||
                           (this.challengeProgressText && !(this.challengeProgressText as any).texture?.frames);
    
    // Create container and text elements if they don't exist or are invalid
    if (needsRecreation) {
      // Clean up any existing invalid objects
      if (this.challengeDisplay) {
        this.challengeDisplay.destroy();
        this.challengeDisplay = undefined;
      }
      // Create new challenge display container - align with song title container
      this.challengeDisplay = this.add.container(520, 230);  // Changed from 510 to 520 to align
      this.challengeDisplay.setScrollFactor(0);
      this.challengeDisplay.setDepth(120);
      
      // Add black background panel for better visibility - align with song title box
      const bgPanel = this.add.graphics();
      bgPanel.fillStyle(0x000000, 0.7);
      bgPanel.fillRoundedRect(-130, -50, 250, 100, 8);  // Changed width from 260 to 250 to match song title
      this.challengeDisplay.add(bgPanel);
      
      // Add wave indicator
      this.challengeWaveText = this.add.text(0, -30, `WAVE ${this.waveManager.getCurrentWave()}`, {
        fontSize: '16px',
        color: '#ff6b6b',
        fontFamily: '"Press Start 2P", monospace',
        stroke: '#000000',
        strokeThickness: 3
      });
      this.challengeWaveText.setOrigin(0.5);
      this.challengeDisplay.add(this.challengeWaveText);
      
      // Pre-create challenge text elements
      this.challengeDescText = this.add.text(0, 0, '', {
        fontSize: '14px',
        color: '#ffd700',
        fontFamily: '"Press Start 2P", monospace',
        stroke: '#000000',
        strokeThickness: 3
      });
      this.challengeDescText.setOrigin(0.5);
      this.challengeDisplay.add(this.challengeDescText);
      
      // Pre-create progress text element
      this.challengeProgressText = this.add.text(0, 25, '', {
        fontSize: '16px',
        color: '#ffd700',
        fontFamily: '"Press Start 2P", monospace',
        stroke: '#000000',
        strokeThickness: 3
      });
      this.challengeProgressText.setOrigin(0.5);
      this.challengeDisplay.add(this.challengeProgressText);
    }
    
    // Update existing elements instead of recreating (with safety checks)
    if (this.challengeWaveText) {
      try {
        this.challengeWaveText.setText(`WAVE ${this.waveManager.getCurrentWave()}`);
      } catch (error) {
        console.error('[DEBUG] Error updating wave text, will recreate on next update:', error);
        this.challengeWaveText = undefined;
        this.challengeDisplay = undefined;
      }
    }
    
    // Get only the first incomplete challenge to display
    const challenges = this.challengeManager.getActiveChallenges();
    const activeChallenge = challenges.find(c => !c.completed);
    
    if (activeChallenge) {
      const color = '#ffd700'; // Yellow color for active challenges
      
      // CRITICAL: For time-based challenges, always use fresh timer values
      let currentValue = activeChallenge.current;
      if (activeChallenge.type === 'survive_time' || activeChallenge.type === 'no_damage') {
        // Calculate fresh time value for display using game time (which pauses)
        const elapsedSeconds = Math.floor((this.time.now - this.challengeManager.getStartTime()) / 1000);
        currentValue = Math.min(elapsedSeconds, activeChallenge.target);
      }
      
      const progress = `${currentValue}/${activeChallenge.target}`;
      
      // Update challenge text (with safety checks)
      if (this.challengeDescText) {
        try {
          this.challengeDescText.setText(activeChallenge.description);
          this.challengeDescText.setColor(color);
          this.challengeDescText.setVisible(true);
        } catch (error) {
          console.error('[DEBUG] Error updating challenge description text, will recreate:', error);
          this.challengeDescText = undefined;
          this.challengeDisplay = undefined;
        }
      }
      
      // Update progress text (with safety checks)
      if (this.challengeProgressText) {
        try {
          this.challengeProgressText.setText(progress);
          this.challengeProgressText.setColor(color);
          this.challengeProgressText.setVisible(true);
        } catch (error) {
          console.error('[DEBUG] Error updating progress text, will recreate:', error);
          this.challengeProgressText = undefined;
          this.challengeDisplay = undefined;
        }
      }
    } else {
      // All challenges complete - reuse the description text for complete message (with safety checks)
      if (this.challengeDescText) {
        try {
          this.challengeDescText.setText('ALL COMPLETE!');
          this.challengeDescText.setColor('#4caf50');
          this.challengeDescText.setFontSize('12px');
          this.challengeDescText.setVisible(true);
        } catch (error) {
          console.error('[DEBUG] Error updating complete text, will recreate:', error);
          this.challengeDescText = undefined;
          this.challengeDisplay = undefined;
        }
      }
      
      // Hide progress when all complete (with safety checks)
      if (this.challengeProgressText) {
        try {
          this.challengeProgressText.setVisible(false);
        } catch (error) {
          console.error('[DEBUG] Error hiding progress text:', error);
          this.challengeProgressText = undefined;
        }
      }
    }
  }
  
  showVictoryScreen() {
    console.log('[VICTORY] Final Wave Complete! Showing victory screen');
    this.gameWon = true;
    
    // Stop all spawning
    if (this.obstacleTimer) this.obstacleTimer.remove();
    if (this.enemyTimer) this.enemyTimer.remove();
    if (this.sandwichTimer) this.sandwichTimer.remove();
    if (this.energyDrinkTimer) this.energyDrinkTimer.remove();
    if (this.powerUpTimer) this.powerUpTimer.remove();
    if (this.starSpawnTimer) this.starSpawnTimer.remove();
    
    // Clear existing enemies and obstacles
    this.enemies.clear(true, true);
    this.obstacles.clear(true, true);
    this.powerUps.clear(true, true);
    
    // Show victory text - centered on screen
    const victoryText = this.add.text(320, 480, 'VICTORY!', {  // Changed from 200 to 480 (center of 960 height)
      fontSize: '48px',
      color: '#00ff00',
      fontFamily: '"Press Start 2P", monospace',
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
    
    this.tweens.add({
      targets: victoryText,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 500,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        victoryText.destroy();
        this.showFinalStats();
      }
    });
  }
  
  showFinalStats() {
    // Create transparent black background
    const bg = this.add.rectangle(320, 480, 600, 500, 0x000000, 0.8);
    bg.setScrollFactor(0).setDepth(400);
    
    // Title
    const titleText = this.add.text(320, 300, 'GAME COMPLETE!', {
      fontSize: '32px',
      color: '#ffff00',
      fontFamily: '"Press Start 2P", monospace'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(401);
    
    // Calculate game time
    const totalTimeMs = this.time.now - this.gameStartTime;
    const totalSeconds = Math.floor(totalTimeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Stats
    const statsY = 360;
    const stats = [
      `FINAL SCORE: ${this.score}`,
      `TIME TAKEN: ${timeStr}`,
      `STARS COLLECTED: ${this.stars}`,
      `ENEMIES CRUSHED: ${this.totalEnemiesStomped}`,
      `BEST COMBO: ${this.bestCombo}X`,
      `POWER-UPS USED: ${this.totalPowerUpsUsed}`
    ];
    
    stats.forEach((stat, index) => {
      this.add.text(320, statsY + index * 30, stat, {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: '"Press Start 2P", monospace'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(401);
    });
    
    // Buttons - Play Again on top, Main Menu below
    const playAgainBtn = this.add.text(320, 550, 'PLAY AGAIN', {
      fontSize: '20px',
      color: '#00ff00',
      fontFamily: '"Press Start 2P", monospace',
      backgroundColor: '#000000',
      padding: { x: 15, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(401);
    
    playAgainBtn.setInteractive({ useHandCursor: true });
    playAgainBtn.on('pointerover', () => {
      playAgainBtn.setScale(1.1);
      playAgainBtn.setColor('#ffff00');
    });
    playAgainBtn.on('pointerout', () => {
      playAgainBtn.setScale(1);
      playAgainBtn.setColor('#00ff00');
    });
    playAgainBtn.on('pointerdown', () => {
      this.sound.stopAll();
      // Just restart the scene - let create() handle the initialization
      this.scene.restart();
    });
    
    const mainMenuBtn = this.add.text(320, 600, 'MAIN MENU', {
      fontSize: '20px',
      color: '#00ff00',
      fontFamily: '"Press Start 2P", monospace',
      backgroundColor: '#000000',
      padding: { x: 15, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(401);
    
    mainMenuBtn.setInteractive({ useHandCursor: true });
    mainMenuBtn.on('pointerover', () => {
      mainMenuBtn.setScale(1.1);
      mainMenuBtn.setColor('#ffff00');
    });
    mainMenuBtn.on('pointerout', () => {
      mainMenuBtn.setScale(1);
      mainMenuBtn.setColor('#00ff00');
    });
    mainMenuBtn.on('pointerdown', () => {
      this.sound.stopAll();
      this.scene.start('MainMenu');
    });
  }
}
