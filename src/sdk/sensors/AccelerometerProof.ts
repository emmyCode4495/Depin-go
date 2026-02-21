/**
 * AccelerometerProof - Generate proofs from accelerometer data
 * Used for proof-of-physical-activity, movement detection, and anti-cheat
 */

import * as Sensors from 'expo-sensors';
import { SensorData, SensorType, AccelerometerData } from '@/src/types';
import { SeedVaultSigner } from '../crypto/SeedVaultSigner';
import { ProofGenerator } from '../crypto/ProofGenerator';
import * as Device from 'expo-device';

export class AccelerometerProofGenerator {
  private signer: SeedVaultSigner;
  private proofGen: ProofGenerator;
  private deviceId: string;
  private subscription: any = null;

  constructor(signer: SeedVaultSigner) {
    this.signer = signer;
    this.proofGen = new ProofGenerator(signer);
    this.deviceId = Device.modelId || 'unknown';
  }

  /**
   * Check if accelerometer is available on device
   */
  async isAvailable(): Promise<boolean> {
    return await Sensors.Accelerometer.isAvailableAsync();
  }

  /**
   * Set update interval for accelerometer
   */
  setUpdateInterval(intervalMs: number): void {
    Sensors.Accelerometer.setUpdateInterval(intervalMs);
  }

  /**
   * Get current accelerometer reading with a 5s timeout
   */
  async getCurrentReading(): Promise<AccelerometerData> {
    return new Promise((resolve, reject) => {
      const subscription = Sensors.Accelerometer.addListener((data) => {
        clearTimeout(timeout);
        subscription.remove();
        resolve({ x: data.x, y: data.y, z: data.z });
      });

      // Declared after subscription so it can reference it safely
      const timeout = setTimeout(() => {
        subscription.remove();
        reject(new Error('Accelerometer reading timeout after 5s'));
      }, 5000);
    });
  }

  /**
   * Generate a single movement proof by averaging multiple samples.
   *
   * Fix: added an overall timeout (duration + 3s buffer) so the promise
   * never hangs indefinitely if the sensor fires fewer events than expected
   * (common on simulators or devices with slow sensor init).
   */
  async generateMovementProof(options?: {
    duration?: number; // milliseconds to sample
    samples?: number;  // number of samples to collect
  }): Promise<any> {
    const { duration = 1000, samples = 10 } = options || {};

    return new Promise(async (resolve, reject) => {
      const readings: AccelerometerData[] = [];
      let count = 0;
      let resolved = false;

      const interval = Math.max(50, Math.floor(duration / samples));
      this.setUpdateInterval(interval);

      // Timeout guard: fire after duration + 3s buffer regardless
      const hardTimeout = setTimeout(async () => {
        if (resolved) return;
        resolved = true;
        accelSubscription.remove();

        if (readings.length === 0) {
          return reject(new Error('No accelerometer data received — is the sensor available?'));
        }

        try {
          resolve(await this.buildMovementProof(readings, samples, duration));
        } catch (err) {
          reject(err);
        }
      }, duration + 3000);

      const accelSubscription = Sensors.Accelerometer.addListener(async (data) => {
        if (resolved) return;

        readings.push({ x: data.x, y: data.y, z: data.z });
        count++;

        if (count >= samples) {
          resolved = true;
          clearTimeout(hardTimeout);
          accelSubscription.remove();

          try {
            resolve(await this.buildMovementProof(readings, samples, duration));
          } catch (err) {
            reject(err);
          }
        }
      });
    });
  }

  /**
   * Shared helper to build and sign a movement proof from collected readings
   */
  private async buildMovementProof(
    readings: AccelerometerData[],
    samples: number,
    duration: number
  ): Promise<any> {
    const avgReading = this.averageReadings(readings);
    const magnitude = this.calculateMagnitude(avgReading);

    const sensorData: SensorData = {
      type: SensorType.ACCELEROMETER,
      timestamp: Date.now(),
      data: {
        ...avgReading,
        magnitude,
        sampleCount: readings.length, // actual collected, not requested
        duration,
      },
      deviceId: this.deviceId,
    };

    return await this.proofGen.generateProof(sensorData);
  }

  /**
   * Detect steps from accelerometer data and return step count + proof.
   */
  async detectStepsWithProof(
    durationMs: number = 60000
  ): Promise<{ steps: number; proof: any }> {
    return new Promise((resolve, reject) => {
      let steps = 0;
      let lastMagnitude = 0;
      let lastStepTime = 0;
      const readings: AccelerometerData[] = [];

      const minTimeBetweenSteps = 200;
      const stepThreshold = 1.2;

      this.setUpdateInterval(100);

      const subscription = Sensors.Accelerometer.addListener((data) => {
        const accelData: AccelerometerData = { x: data.x, y: data.y, z: data.z };
        readings.push(accelData);

        const magnitude = this.calculateMagnitude(accelData);

        if (
          magnitude > stepThreshold &&
          lastMagnitude <= stepThreshold &&
          Date.now() - lastStepTime > minTimeBetweenSteps
        ) {
          steps++;
          lastStepTime = Date.now();
        }

        lastMagnitude = magnitude;
      });

      setTimeout(async () => {
        subscription.remove();

        const sensorData: SensorData = {
          type: SensorType.ACCELEROMETER,
          timestamp: Date.now(),
          data: {
            steps,
            duration: durationMs,
            averageReading: this.averageReadings(readings),
          },
          deviceId: this.deviceId,
        };

        try {
          const proof = await this.proofGen.generateProof(sensorData);
          resolve({ steps, proof });
        } catch (error) {
          reject(error);
        }
      }, durationMs);
    });
  }

  /**
   * Subscribe to continuous accelerometer updates with periodic proof generation.
   *
   * Fix: properly returns the subscription object (not this.subscription)
   * so multiple concurrent subscriptions don't overwrite each other.
   */
  subscribeWithProofs(
    callback: (data: AccelerometerData, proof?: any) => void,
    options?: {
      updateInterval?: number;
      proofInterval?: number;
    }
  ): { remove: () => void } {
    const { updateInterval = 100, proofInterval = 10 } = options || {};

    let updateCount = 0;
    const readings: AccelerometerData[] = [];

    this.setUpdateInterval(updateInterval);

    const subscription = Sensors.Accelerometer.addListener(async (data) => {
      const accelData: AccelerometerData = { x: data.x, y: data.y, z: data.z };

      readings.push(accelData);
      updateCount++;

      callback(accelData);

      if (updateCount % proofInterval === 0) {
        try {
          const window = readings.slice(-proofInterval);
          const avgReading = this.averageReadings(window);

          const sensorData: SensorData = {
            type: SensorType.ACCELEROMETER,
            timestamp: Date.now(),
            data: {
              ...avgReading,
              magnitude: this.calculateMagnitude(avgReading),
              sampleCount: proofInterval,
            },
            deviceId: this.deviceId,
          };

          const proof = await this.proofGen.generateProof(sensorData);
          callback(accelData, proof);
        } catch (error) {
          console.error('[AccelProof] Failed to generate periodic proof:', error);
        }
      }
    });

    // Store reference for cleanup() while also returning for caller control
    this.subscription = subscription;
    return subscription;
  }

  /**
   * Detect device shake and return result + optional proof
   */
  async detectShake(
    thresholdG: number = 2.5,
    durationMs: number = 5000
  ): Promise<{ shakeDetected: boolean; maxMagnitude: number; proof?: any }> {
    return new Promise((resolve) => {
      let maxMagnitude = 0;
      let shakeDetected = false;

      this.setUpdateInterval(50);

      const subscription = Sensors.Accelerometer.addListener((data) => {
        const magnitude = this.calculateMagnitude(data);

        if (magnitude > maxMagnitude) maxMagnitude = magnitude;
        if (magnitude > thresholdG) shakeDetected = true;
      });

      setTimeout(async () => {
        subscription.remove();

        if (!shakeDetected) {
          return resolve({ shakeDetected, maxMagnitude });
        }

        try {
          const sensorData: SensorData = {
            type: SensorType.ACCELEROMETER,
            timestamp: Date.now(),
            data: { event: 'shake', maxMagnitude, threshold: thresholdG },
            deviceId: this.deviceId,
          };

          const proof = await this.proofGen.generateProof(sensorData);
          resolve({ shakeDetected, maxMagnitude, proof });
        } catch (error) {
          console.error('[AccelProof] Failed to generate shake proof:', error);
          resolve({ shakeDetected, maxMagnitude });
        }
      }, durationMs);
    });
  }

  /**
   * Calculate magnitude of acceleration vector
   */
  private calculateMagnitude(data: { x: number; y: number; z: number }): number {
    return Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
  }

  /**
   * Average multiple readings
   */
  private averageReadings(readings: AccelerometerData[]): AccelerometerData {
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
   * Classify activity type from acceleration magnitude
   */
  classifyActivity(magnitude: number): 'still' | 'walking' | 'running' | 'vehicle' {
    if (magnitude < 0.2) return 'still';
    if (magnitude < 1.5) return 'walking';
    if (magnitude < 2.5) return 'running';
    return 'vehicle';
  }

  /**
   * Stop the active subscription from subscribeWithProofs()
   */
  cleanup(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}