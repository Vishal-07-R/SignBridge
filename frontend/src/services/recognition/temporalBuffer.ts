/**
 * Sliding temporal buffer managing windowed landmark sequences for gesture recognition.
 */

import { FrameLandmarks } from '../../api/recognition.ts';

export class TemporalFrameBuffer {
  private buffer: FrameLandmarks[] = [];
  private readonly maxFrames: number;

  constructor(maxFrames: number = 30) {
    this.maxFrames = Math.max(15, Math.min(maxFrames, 60));
  }

  push(frame: FrameLandmarks): void {
    this.buffer.push(frame);
    if (this.buffer.length > this.maxFrames) {
      this.buffer.shift();
    }
  }

  getFrames(): FrameLandmarks[] {
    return [...this.buffer];
  }

  size(): number {
    return this.buffer.length;
  }

  isFull(): boolean {
    return this.buffer.length >= this.maxFrames;
  }

  clear(): void {
    this.buffer = [];
  }

  /**
   * Calculate cumulative kinetic motion delta between adjacent frames.
   */
  computeMotionVelocity(): number {
    if (this.buffer.length < 2) return 0.0;

    let totalDelta = 0.0;
    let comparisons = 0;

    for (let i = 1; i < this.buffer.length; i++) {
      const prev = this.buffer[i - 1];
      const curr = this.buffer[i];

      // Measure right hand wrist motion
      if (prev.right_hand && curr.right_hand && prev.right_hand[0] && curr.right_hand[0]) {
        const dx = curr.right_hand[0].x - prev.right_hand[0].x;
        const dy = curr.right_hand[0].y - prev.right_hand[0].y;
        totalDelta += Math.sqrt(dx * dx + dy * dy);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalDelta / comparisons : 0.0;
  }

  /**
   * Determine if motion is sufficient to indicate an active sign gesture.
   */
  isMotionActive(threshold: number = 0.015): boolean {
    return this.computeMotionVelocity() > threshold;
  }
}
