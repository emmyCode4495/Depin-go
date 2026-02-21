/**
 * MagnetometerProof - Generate proofs from magnetometer data
 * Measures magnetic field strength — enables compass, navigation calibration,
 * and infrastructure anomaly detection DePIN use cases.
 */

import * as Sensors from 'expo-sensors';
import { SensorData, SensorType, MagnetometerData } from '@/src/types';
import { SeedVaultSigner } from '../crypto/SeedVaultSigner';
import { ProofGenerator } from '../crypto/ProofGenerator';
import * as Device from 'expo-device';

export class MagnetometerProofGenerator {
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
    return await Sensors.Magnetometer.isAvailableAsync();
  }

  setUpdateInterval(intervalMs: number): void {
    Sensors.Magnetometer.setUpdateInterval(intervalMs);
  }

  /**
   * Generate a signed magnetometer proof.
   * Includes compass heading — useful for navigation DePIN apps and
   * detecting magnetic anomalies near infrastructure (power lines, sensors).
   */
  async generateMagneticProof(options?: {
    duration?: number;
    samples?: number;
  }): Promise<any> {
    const { duration = 800, samples = 8 } = options || {};

    return new Promise(async (resolve, reject) => {
      const readings: MagnetometerData[] = [];
      let count = 0;
      let resolved = false;

      this.setUpdateInterval(Math.max(50, Math.floor(duration / samples)));

      const hardTimeout = setTimeout(async () => {
        if (resolved) return;
        resolved = true;
        sub.remove();
        if (readings.length === 0) {
          return reject(new Error('No magnetometer data received.'));
        }
        try { resolve(await this.buildProof(readings)); }
        catch (err) { reject(err); }
      }, duration + 3000);

      const sub = Sensors.Magnetometer.addListener(async (data) => {
        if (resolved) return;
        readings.push({ x: data.x, y: data.y, z: data.z });
        count++;
        if (count >= samples) {
          resolved = true;
          clearTimeout(hardTimeout);
          sub.remove();
          try { resolve(await this.buildProof(readings)); }
          catch (err) { reject(err); }
        }
      });
    });
  }

  private async buildProof(readings: MagnetometerData[]): Promise<any> {
    const avg = this.average(readings);
    const magnitude = Math.sqrt(avg.x ** 2 + avg.y ** 2 + avg.z ** 2);

    // Compass heading from X/Y plane (degrees, 0 = North)
    let heading = Math.atan2(avg.y, avg.x) * (180 / Math.PI);
    if (heading < 0) heading += 360;

    const sensorData: SensorData = {
      type: SensorType.MAGNETOMETER,
      timestamp: Date.now(),
      data: {
        ...avg,
        magnitude: parseFloat(magnitude.toFixed(4)),
        heading: parseFloat(heading.toFixed(2)),
        sampleCount: readings.length,
      },
      deviceId: this.deviceId,
    };

    return await this.proofGen.generateProof(sensorData);
  }

  private average(readings: MagnetometerData[]): MagnetometerData {
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
   * Detect potential magnetic anomaly — useful for infrastructure monitoring
   */
  detectAnomaly(magnitude: number): { isAnomalous: boolean; reason?: string } {
    // Earth's natural field is typically 25–65 µT
    if (magnitude < 10)  return { isAnomalous: true, reason: 'Unusually weak field — possible interference' };
    if (magnitude > 100) return { isAnomalous: true, reason: 'Strong anomaly detected — near power lines or large metal structure' };
    return { isAnomalous: false };
  }

  cleanup(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}