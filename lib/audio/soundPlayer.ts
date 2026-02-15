/**
 * Sound Player for Darts Scoreboard
 * Plays score announcement sounds (Russ Bray voice)
 */

class SoundPlayer {
  private audioCache: Map<number, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.7;

  /**
   * Preload a sound file for a specific score
   */
  private preloadSound(score: number): HTMLAudioElement {
    if (this.audioCache.has(score)) {
      return this.audioCache.get(score)!;
    }

    const audio = new Audio(`/sounds/scoring/${score}.wav`);
    audio.volume = this.volume;
    this.audioCache.set(score, audio);
    return audio;
  }

  /**
   * Play sound for a score
   */
  async playScore(score: number): Promise<void> {
    if (!this.enabled) return;

    try {
      const audio = this.preloadSound(score);
      // Reset audio to start if it's already playing
      audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      console.warn(`Failed to play sound for score ${score}:`, error);
    }
  }

  /**
   * Preload commonly used sounds for better performance
   */
  preloadCommonSounds(): void {
    const commonScores = [
      0, 26, 41, 45, 60, 81, 85, 100, 121, 125, 140, 180
    ];

    commonScores.forEach(score => {
      this.preloadSound(score);
    });
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.audioCache.forEach(audio => {
      audio.volume = this.volume;
    });
  }

  /**
   * Enable or disable sound
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Clear audio cache
   */
  clearCache(): void {
    this.audioCache.clear();
  }
}

// Singleton instance
export const soundPlayer = new SoundPlayer();
