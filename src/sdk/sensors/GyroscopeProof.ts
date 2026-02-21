/**
 * GyroscopeProof - Generate proofs from gyroscope data
 * Rotation rate sensor — enables road quality, vehicle, and orientation DePIN use cases
 */

import * as Sensors from 'expo-sensors';
import { SensorData, SensorType, GyroscopeData } from '@/src/types';
import { SeedVaultSigner } from '../crypto/SeedVaultSigner';
import { ProofGenerator } from '../crypto/ProofGenerator';
import * as Device from 'expo-device';

export class GyroscopeProofGenerator {
  private signer: SeedVaultSigner;
  private proofGen: ProofGenerator;
  private deviceId: string;
  private subscription: any = null;

  constructor(signer: SeedVaultSigner) {
    this.signer = signer;
    this.proofGen = new ProofGenerator(signer);
    this.deviceId = Device.modelId || 'unknown';
  }

  async isAvailable(): Promise<boolean> {
    return await Sensors.Gyroscope.isAvailableAsync();
  }

  setUpdateInterval(intervalMs: number): void {
    Sensors.Gyroscope.setUpdateInterval(intervalMs);
  }

  /**
   * Collect samples and generate a signed gyroscope proof.
   * Useful for road quality sensing — bumps and vibrations produce
   * characteristic rotation spikes that can be mapped to GPS coordinates.
   */
  async generateRotationProof(options?: {
    duration?: number;
    samples?: number;
  }): Promise<any> {
    const { duration = 1000, samples = 10 } = options || {};

    return new Promise(async (resolve, reject) => {
      const readings: GyroscopeData[] = [];
      let count = 0;
      let resolved = false;

      const interval = Math.max(50, Math.floor(duration / samples));
      this.setUpdateInterval(interval);

      const hardTimeout = setTimeout(async () => {
        if (resolved) return;
        resolved = true;
        sub.remove();
        if (readings.length === 0) {
          return reject(new Error('No gyroscope data received.'));
        }
        try { resolve(await this.buildProof(readings, duration)); }
        catch (err) { reject(err); }
      }, duration + 3000);

      const sub = Sensors.Gyroscope.addListener(async (data) => {
        if (resolved) return;
        readings.push({ x: data.x, y: data.y, z: data.z });
        count++;
        if (count >= samples) {
          resolved = true;
          clearTimeout(hardTimeout);
          sub.remove();
          try { resolve(await this.buildProof(readings, duration)); }
          catch (err) { reject(err); }
        }
      });
    });
  }

  private async buildProof(readings: GyroscopeData[], duration: number): Promise<any> {
    const avg = this.average(readings);
    const magnitude = Math.sqrt(avg.x ** 2 + avg.y ** 2 + avg.z ** 2);

    const sensorData: SensorData = {
      type: SensorType.GYROSCOPE,
      timestamp: Date.now(),
      data: { ...avg, magnitude, sampleCount: readings.length, duration },
      deviceId: this.deviceId,
    };

    return await this.proofGen.generateProof(sensorData);
  }

  private average(readings: GyroscopeData[]): GyroscopeData {
    if (readings.length === 0) return { x: 0, y: 0, z: 0 };
    const sum = readings.reduce(
      (acc, r) => ({ x: acc.x + r.x, y: acc.y + r.y, z: acc.z + r.z }),
      { x: 0, y: 0, z: 0 }
    );
    return {
      x: sum.x / readings.length,
      y: sum.y / readings.length,
      z: sum.z / readings.length,
    };
  }

  /**
   * Classify rotation intensity — useful for road quality DePIN
   */
  classifyRotation(magnitude: number): 'still' | 'gentle' | 'moderate' | 'intense' {
    if (magnitude < 0.05) return 'still';
    if (magnitude < 0.5) return 'gentle';
    if (magnitude < 2.0) return 'moderate';
    return 'intense';
  }

  cleanup(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}