export type ChallengeType =
  | 'collect_stars'
  | 'stomp_enemies'
  | 'survive_time'
  | 'get_combo'
  | 'no_damage'
  | 'perform_tricks'
  | 'collect_powerups';

export interface Challenge {
  id: string;
  type: ChallengeType;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  waveNumber: number;
}

export class ChallengeManager {
  private scene: Phaser.Scene;
  private challenges: Challenge[] = [];
  private activeChallenges: Challenge[] = [];
  private onChallengeComplete?: (challenge: Challenge) => void;
  private onAllChallengesComplete?: () => void;
  private startTime: number = 0;
  
  // Available challenge types per wave
  private availableChallengesByWave: { [key: number]: ChallengeType[] } = {
    1: ['collect_stars', 'perform_tricks', 'no_damage', 'get_combo', 'stomp_enemies', 'survive_time'],
    2: ['stomp_enemies', 'collect_stars', 'get_combo', 'perform_tricks', 'no_damage', 'survive_time'],
    3: ['stomp_enemies', 'collect_stars', 'get_combo', 'perform_tricks', 'no_damage', 'survive_time']
  };
  
  // Track recently used challenges to avoid repetition
  private recentChallenges: ChallengeType[] = [];
  
  // Challenge parameters based on type and wave
  private challengeParams: { [key in ChallengeType]: { [wave: number]: { description: string, target: number } } } = {
    'collect_stars': {
      1: { description: 'Collect 30 Stars', target: 30 },
      2: { description: 'Collect 50 Stars', target: 50 },
      3: { description: 'Collect 75 Stars', target: 75 }
    },
    'stomp_enemies': {
      1: { description: 'Crush 3 Enemies', target: 3 },
      2: { description: 'Crush 5 Enemies', target: 5 },
      3: { description: 'Crush 8 Enemies', target: 8 }
    },
    'survive_time': {
      1: { description: 'Survive 30 Seconds', target: 30 },
      2: { description: 'Survive 45 Seconds', target: 45 },
      3: { description: 'Survive 60 Seconds', target: 60 }
    },
    'get_combo': {
      1: { description: 'Get 3x Combo', target: 3 },
      2: { description: 'Get 4x Combo', target: 4 },
      3: { description: 'Get 5x Combo', target: 5 }
    },
    'no_damage': {
      1: { description: 'No Damage for 15s', target: 15 },
      2: { description: 'No Damage for 20s', target: 20 },
      3: { description: 'No Damage for 30s', target: 30 }
    },
    'perform_tricks': {
      1: { description: 'Perform 5 Tricks', target: 5 },
      2: { description: 'Perform 8 Tricks', target: 8 },
      3: { description: 'Perform 12 Tricks', target: 12 }
    },
    'collect_powerups': {
      1: { description: 'Collect 3 Power-ups', target: 3 },
      2: { description: 'Collect 5 Power-ups', target: 5 },
      3: { description: 'Collect 7 Power-ups', target: 7 }
    }
  };
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  generateChallengesForWave(waveNumber: number): Challenge[] {
    const availableTypes = this.availableChallengesByWave[waveNumber] || this.availableChallengesByWave[1];
    
    // Better randomization: shuffle available types and pick 3 unique ones
    let shuffled = this.shuffleArray([...availableTypes]);
    
    // Special handling for wave 1: Don't start with ANY timed challenges
    const timedChallenges: ChallengeType[] = ['survive_time', 'no_damage']; // BOTH are timed challenges
    if (waveNumber === 1 && this.challenges.length === 0) {
      // Remove ALL timed challenges from possible first challenge
      shuffled = shuffled.filter(t => !timedChallenges.includes(t));
    }
    
    const selectedTypes: ChallengeType[] = [];
    
    // Pick 3 unique challenges, avoiding recent ones if possible
    for (let i = 0; i < 3 && selectedTypes.length < 3; i++) {
      // Try to find a challenge not in recent list
      let candidateType = shuffled[i];
      
      // If this type was recently used, try to find another
      if (this.recentChallenges.includes(candidateType) && shuffled.length > 3) {
        // Find the first non-recent challenge
        const nonRecent = shuffled.find(t => !this.recentChallenges.includes(t) && !selectedTypes.includes(t));
        if (nonRecent) {
          candidateType = nonRecent;
        }
      }
      
      // Add to selected if not already there
      if (!selectedTypes.includes(candidateType)) {
        selectedTypes.push(candidateType);
      }
    }
    
    // If we need more challenges and can add timed challenges now (not first), add them
    if (waveNumber === 1 && selectedTypes.length < 3) {
      // Add any missing timed challenges (they won't be first since we have at least one non-timed)
      for (const timed of timedChallenges) {
        if (availableTypes.includes(timed) && !selectedTypes.includes(timed) && selectedTypes.length < 3) {
          selectedTypes.push(timed);
        }
      }
    }
    
    // If we still need more challenges (shouldn't happen but just in case)
    while (selectedTypes.length < 3 && shuffled.length > selectedTypes.length) {
      const remaining = shuffled.find(t => !selectedTypes.includes(t));
      if (remaining) selectedTypes.push(remaining);
      else break;
    }
    
    // Update recent challenges list (keep last 4)
    this.recentChallenges = [...this.recentChallenges, ...selectedTypes].slice(-4);
    
    // Shuffle the order of selected challenges for more variety
    let finalOrder = this.shuffleArray(selectedTypes);
    
    // CRITICAL: For Wave 1, ensure NO timed challenge is first
    if (waveNumber === 1 && this.challenges.length === 0) {
      // Check if first challenge is timed
      if (timedChallenges.includes(finalOrder[0])) {
        // Find the first non-timed challenge and swap it to position 0
        const nonTimedIndex = finalOrder.findIndex(t => !timedChallenges.includes(t));
        if (nonTimedIndex > 0) {
          // Swap the non-timed challenge to first position
          [finalOrder[0], finalOrder[nonTimedIndex]] = [finalOrder[nonTimedIndex], finalOrder[0]];
        }
      }
    }
    
    this.activeChallenges = finalOrder.map((type, index) => {
      const baseParams = this.challengeParams[type][waveNumber] || this.challengeParams[type][1];
      
      // Use exact target values - no random variation
      const target = baseParams.target;
      const description = this.formatDescription(type, target);
      
      return {
        id: `wave${waveNumber}_challenge${index + 1}`,
        type: type,
        description: description,
        target: target,
        current: 0,
        completed: false,
        waveNumber: waveNumber
      };
    });
    
    this.startTime = this.scene.time.now;
    return this.activeChallenges;
  }
  
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    // Use Date.now() to add more randomness
    const seed = Date.now() % 1000;
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor((Math.random() + seed / 1000) * (i + 1)) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  private formatDescription(type: ChallengeType, target: number): string {
    switch (type) {
      case 'collect_stars':
        return `Collect ${target} Stars`;
      case 'stomp_enemies':
        return `Crush ${target} Enemies`;
      case 'survive_time':
        return `Survive ${target} Seconds`;
      case 'get_combo':
        return `Get ${target}x Combo`;
      case 'no_damage':
        return `No Damage for ${target}s`;
      case 'perform_tricks':
        return `Perform ${target} Tricks`;
      default:
        return 'Complete Challenge';
    }
  }
  
  updateChallenge(type: ChallengeType, value: number = 1) {
    // Debug: Log the state of active challenges
    console.log('[DEBUG CHALLENGE] updateChallenge called:', type, value);
    console.log('[DEBUG CHALLENGE] Active challenges count:', this.activeChallenges.length);
    if (this.activeChallenges.length > 0) {
      console.log('[DEBUG CHALLENGE] Active challenges:', this.activeChallenges.map(c => ({
        type: c.type,
        completed: c.completed,
        current: c.current,
        target: c.target
      })));
    }
    
    // Find the first incomplete challenge (the one being displayed)
    const displayedChallenge = this.activeChallenges.find(c => !c.completed);
    
    // CRITICAL FIX: Strict type checking to prevent wrong updates
    if (!displayedChallenge) {
      console.log('[DEBUG CHALLENGE] No active/incomplete challenge found');
      return; // No active challenge to update
    }
    
    // Only update if the challenge type matches exactly
    if (displayedChallenge.type !== type) {
      // Silent return - this is expected when events fire for non-active challenges
      return;
    }
    
    // Update only the displayed challenge
    // NOTE: This block should NEVER run for time-based challenges from this method
    // Time-based challenges should ONLY be updated via updateTimeChallenges/updateNoDamageChallenge
    if (type === 'survive_time' || type === 'no_damage') {
      console.error(`[CHALLENGE BUG] updateChallenge called for time-based challenge ${type}! This should not happen.`);
      return; // Don't update time challenges through this method
    } else {
      // Debug logging for trick counter bug
      if (type === 'perform_tricks') {
        console.log(`[DEBUG CHALLENGE] Updating perform_tricks: current=${displayedChallenge.current}, adding=${value}, will be=${displayedChallenge.current + value}`);
      }
      // For counting challenges, increment
      displayedChallenge.current += value;
    }
    
    // Check if challenge is complete
    if (displayedChallenge.current >= displayedChallenge.target && !displayedChallenge.completed) {
      displayedChallenge.completed = true;
      displayedChallenge.current = displayedChallenge.target; // Cap at target
      this.onChallengeCompleted(displayedChallenge);
    }
  }
  
  updateTimeChallenges() {
    // Guard: Don't update if challenges haven't been properly initialized
    if (this.startTime === 0 || this.activeChallenges.length === 0) {
      return;
    }
    
    const elapsedSeconds = Math.floor((this.scene.time.now - this.startTime) / 1000);
    
    // Find the first incomplete challenge (the one being displayed)
    const displayedChallenge = this.activeChallenges.find(c => !c.completed);
    if (!displayedChallenge || displayedChallenge.type !== 'survive_time') {
      return; // Only update if the displayed challenge is survive_time
    }
    
    displayedChallenge.current = elapsedSeconds;
    
    if (displayedChallenge.current >= displayedChallenge.target) {
      displayedChallenge.completed = true;
      displayedChallenge.current = displayedChallenge.target;
      this.onChallengeCompleted(displayedChallenge);
    }
  }
  
  resetNoDamageChallenge() {
    // Find the first incomplete challenge (the one being displayed)
    const displayedChallenge = this.activeChallenges.find(c => !c.completed);
    if (displayedChallenge && displayedChallenge.type === 'no_damage') {
      displayedChallenge.current = 0;
      this.startTime = this.scene.time.now; // Reset timer for no damage
    }
  }
  
  resetSurviveChallenge() {
    // Find the first incomplete challenge (the one being displayed)
    const displayedChallenge = this.activeChallenges.find(c => !c.completed);
    if (displayedChallenge && displayedChallenge.type === 'survive_time') {
      displayedChallenge.current = 0;
      this.startTime = this.scene.time.now; // Reset timer for survive challenge
    }
  }
  
  updateNoDamageChallenge() {
    // Guard: Don't update if challenges haven't been properly initialized
    if (this.startTime === 0 || this.activeChallenges.length === 0) {
      return;
    }
    
    const elapsedSeconds = Math.floor((this.scene.time.now - this.startTime) / 1000);
    
    // Find the first incomplete challenge (the one being displayed)
    const displayedChallenge = this.activeChallenges.find(c => !c.completed);
    if (!displayedChallenge || displayedChallenge.type !== 'no_damage') {
      return; // Only update if the displayed challenge is no_damage
    }
    
    displayedChallenge.current = elapsedSeconds;
    
    if (displayedChallenge.current >= displayedChallenge.target) {
      displayedChallenge.completed = true;
      displayedChallenge.current = displayedChallenge.target;
      this.onChallengeCompleted(displayedChallenge);
    }
  }
  
  private onChallengeCompleted(challenge: Challenge) {
    console.log('[DEBUG CHALLENGE] Challenge completed:', challenge);
    console.log('[DEBUG CHALLENGE] Active challenges:', this.activeChallenges.map(c => ({ 
      type: c.type, 
      completed: c.completed, 
      current: c.current, 
      target: c.target 
    })));
    
    // Show completion notification
    try {
      console.log('[DEBUG CHALLENGE] Showing completion notification');
      this.showChallengeComplete(challenge);
    } catch (error) {
      console.error('[DEBUG CHALLENGE] Error showing completion:', error);
    }
    
    // Update the challenge display immediately to show the next challenge
    if ((this.scene as any).updateChallengeDisplay) {
      (this.scene as any).updateChallengeDisplay();
    }
    
    if (this.onChallengeComplete) {
      try {
        console.log('[DEBUG CHALLENGE] Calling onChallengeComplete callback');
        this.onChallengeComplete(challenge);
      } catch (error) {
        console.error('[DEBUG CHALLENGE] Error in onChallengeComplete callback:', error);
      }
    }
    
    // Reset timer when moving to next challenge for time-based challenges
    const nextChallenge = this.activeChallenges.find(c => !c.completed);
    if (nextChallenge && (nextChallenge.type === 'survive_time' || nextChallenge.type === 'no_damage')) {
      console.log('[DEBUG CHALLENGE] Resetting timer for next challenge:', nextChallenge.type);
      this.startTime = this.scene.time.now;
      nextChallenge.current = 0;
    }
    
    // Check if all challenges are complete
    const allComplete = this.activeChallenges.every(c => c.completed);
    console.log('[DEBUG CHALLENGE] All challenges complete?', allComplete);
    
    if (allComplete && this.onAllChallengesComplete) {
      try {
        console.log('[DEBUG CHALLENGE] Calling onAllChallengesComplete');
        this.onAllChallengesComplete();
      } catch (error) {
        console.error('[DEBUG CHALLENGE] Error in onAllChallengesComplete:', error);
      }
    }
  }
  
  private showChallengeComplete(challenge: Challenge) {
    // Use the trickMessageManager's priority message system
    const gameScene = this.scene as any;
    if (gameScene.trickMessageManager && gameScene.trickMessageManager.addPriorityMessage) {
      // Use priority message that clears other messages
      gameScene.trickMessageManager.addPriorityMessage('CHALLENGE COMPLETE!', challenge.description, 4000);
    } else {
      // Fallback if no message manager
      const completeText = this.scene.add.text(320, 300, 'CHALLENGE COMPLETE!', {
        fontSize: '20px',
        color: '#4caf50',
        fontFamily: '"Press Start 2P", monospace',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
      completeText.setScrollFactor(0);
      completeText.setDepth(200);
      
      const descText = this.scene.add.text(320, 330, challenge.description, {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: '"Press Start 2P", monospace',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5);
      descText.setScrollFactor(0);
      descText.setDepth(200);
      
      // Animate both texts
      [completeText, descText].forEach(text => {
        text.setScale(0);
        this.scene.tweens.add({
          targets: text,
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.scene.time.delayedCall(4000, () => {
              this.scene.tweens.add({
                targets: text,
                alpha: 0,
                duration: 500,
                onComplete: () => text.destroy()
              });
            });
          }
        });
      });
    }
  }
  
  getActiveChallenges(): Challenge[] {
    return this.activeChallenges;
  }
  
  getStartTime(): number {
    return this.startTime;
  }
  
  resetStartTime(): void {
    this.startTime = this.scene.time.now;
  }
  
  getCompletedCount(): number {
    return this.activeChallenges.filter(c => c.completed).length;
  }
  
  reset() {
    this.activeChallenges = [];
    this.challenges = [];
    this.startTime = this.scene.time.now;
  }
  
  setOnChallengeComplete(callback: (challenge: Challenge) => void) {
    this.onChallengeComplete = callback;
  }
  
  setOnAllChallengesComplete(callback: () => void) {
    this.onAllChallengesComplete = callback;
  }
}