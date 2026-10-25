/**
 * Sound Player for Darts Scoreboard
 * Plays score announcement sounds (Russ Bray voice)
 */

// /public/sounds/scoring has <score>.wav for 0–180 except these (all impossible 3-dart totals)
const MISSING_SCORE_SOUNDS = new Set([176, 178, 179]);

/** True when /sounds/scoring/<score>.wav exists. */
export function hasScoreSound(score: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= 180 && !MISSING_SCORE_SOUNDS.has(score);
}

class SoundPlayer {
  private audioCache: Map<number, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.7;
  private current: HTMLAudioElement | null = null;
  /** Celebration clip; kept apart from the caller so the two can overlap */
  private clip: HTMLAudioElement | null = null;

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
   * Play sound for a score (0 = "no score", used for busts)
   */
  async playScore(score: number): Promise<void> {
    if (!this.enabled) return;
    // Never request a file that does not exist
    if (!hasScoreSound(score)) return;

    try {
      const audio = this.preloadSound(score);
      // Stop the previous announcement so quick entries don't talk over each other
      if (this.current && this.current !== audio) {
        this.current.pause();
      }
      this.current = audio;
      // Reset audio to start if it's already playing
      audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      // play() is aborted when a newer announcement interrupts it — not an error
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.warn(`Failed to play sound for score ${score}:`, error);
    }
  }

  /**
   * Play a celebration clip (the anthem after a won leg, set or match). It runs
   * alongside the caller instead of replacing it, and a new one restarts it.
   */
  async playClip(src: string): Promise<void> {
    if (!this.enabled) return;

    try {
      if (this.clip) {
        this.clip.pause();
      }
      const audio = new Audio(src);
      audio.volume = this.volume;
      this.clip = audio;
      await audio.play();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.warn(`Failed to play clip ${src}:`, error);
    }
  }

  /** Stop a celebration clip that is still playing */
  stopClip(): void {
    if (!this.clip) return;
    this.clip.pause();
    this.clip = null;
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
    if (this.clip) this.clip.volume = this.volume;
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
