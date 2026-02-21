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
   * Get current accelerometer reading
   */
  async getCurrentReading(): Promise<AccelerometerData> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        subscription.remove();
        reject(new Error('Accelerometer reading timeout'));
      }, 5000);

      const subscription = Sensors.Accelerometer.addListener((data) => {
        clearTimeout(timeout);
        subscription.remove();
        resolve({
          x: data.x,
          y: data.y,
          z: data.z,
        });
      });
    });
  }

  /**
   * Generate a single movement proof
   */
  async generateMovementProof(options?: {
    duration?: number; // milliseconds to sample
    samples?: number; // number of samples to average
  }): Promise<any> {
    const { duration = 1000, samples = 10 } = options || {};

    try {
      // Collect multiple samples
      const readings: AccelerometerData[] = [];
      const interval = duration / samples;

      this.setUpdateInterval(interval);

      await new Promise((resolve) => {
        let count = 0;
        const subscription = Sensors.Accelerometer.addListener((data) => {
          readings.push({
            x: data.x,
            y: data.y,
            z: data.z,
          });

          count++;
          if (count >= samples) {
            subscription.remove();
            resolve(undefined);
          }
        });
      });

      // Calculate average and magnitude
      const avgReading = this.averageReadings(readings);
      const magnitude = this.calculateMagnitude(avgReading);

      const sensorData: SensorData = {
        type: SensorType.ACCELEROMETER,
        timestamp: Date.now(),
        data: {
          ...avgReading,
          magnitude,
          sampleCount: samples,
          duration,
        },
        deviceId: this.deviceId,
      };

      return await this.proofGen.generateProof(sensorData);
    } catch (error) {
      console.error('Failed to generate movement proof:', error);
      throw error;
    }
  }

  /**
   * Detect steps from accelerometer data
   * Returns step count and proof
   */
  async detectStepsWithProof(
    durationMs: number = 60000 // 1 minute
  ): Promise<{
    steps: number;
    proof: any;
  }> {
    return new Promise((resolve, reject) => {
      let steps = 0;
      let lastMagnitude = 0;
      let lastStepTime = 0;
      const readings: AccelerometerData[] = [];

      const minTimeBetweenSteps = 200; // ms
      const stepThreshold = 1.2;

      this.setUpdateInterval(100); // 10 Hz

      const subscription = Sensors.Accelerometer.addListener((data) => {
        const accelData = { x: data.x, y: data.y, z: data.z };
        readings.push(accelData);

        const magnitude = this.calculateMagnitude(accelData);

        // Simple step detection
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

      // Stop after duration
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
   * Subscribe to continuous accelerometer updates with periodic proofs
   */
  subscribeWithProofs(
    callback: (data: AccelerometerData, proof?: any) => void,
    options?: {
      updateInterval?: number; // ms
      proofInterval?: number; // number of updates between proofs
    }
  ): { remove: () => void } {
    const { updateInterval = 100, proofInterval = 10 } = options || {};

    let updateCount = 0;
    const readings: AccelerometerData[] = [];

    this.setUpdateInterval(updateInterval);

    this.subscription = Sensors.Accelerometer.addListener(async (data) => {
      const accelData: AccelerometerData = {
        x: data.x,
        y: data.y,
        z: data.z,
      };

      readings.push(accelData);
      updateCount++;

      callback(accelData);

      // Generate proof at intervals
      if (updateCount % proofInterval === 0) {
        try {
          const avgReading = this.averageReadings(readings.slice(-proofInterval));

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
          console.error('Failed to generate periodic proof:', error);
        }
      }
    });

    return this.subscription;
  }

  /**
   * Detect device shake
   */
  async detectShake(
    thresholdG: number = 2.5,
    durationMs: number = 5000
  ): Promise<{
    shakeDetected: boolean;
    maxMagnitude: number;
    proof?: any;
  }> {
    return new Promise((resolve) => {
      let maxMagnitude = 0;
      let shakeDetected = false;

      this.setUpdateInterval(50);

      const subscription = Sensors.Accelerometer.addListener((data) => {
        const magnitude = this.calculateMagnitude(data);

        if (magnitude > maxMagnitude) {
          maxMagnitude = magnitude;
        }

        if (magnitude > thresholdG) {
          shakeDetected = true;
        }
      });

      setTimeout(async () => {
        subscription.remove();

        let proof;
        if (shakeDetected) {
          const sensorData: SensorData = {
            type: SensorType.ACCELEROMETER,
            timestamp: Date.now(),
            data: {
              event: 'shake',
              maxMagnitude,
              threshold: thresholdG,
            },
            deviceId: this.deviceId,
          };

          proof = await this.proofGen.generateProof(sensorData);
        }

        resolve({ shakeDetected, maxMagnitude, proof });
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
    if (readings.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    const sum = readings.reduce(
      (acc, reading) => ({
        x: acc.x + reading.x,
        y: acc.y + reading.y,
        z: acc.z + reading.z,
      }),
      { x: 0, y: 0, z: 0 }
    );

    return {
      x: sum.x / readings.length,
      y: sum.y / readings.length,
      z: sum.z / readings.length,
    };
  }

  /**
   * Classify activity type from accelerometer data
   */
  classifyActivity(magnitude: number): 'still' | 'walking' | 'running' | 'vehicle' {
    if (magnitude < 0.2) return 'still';
    if (magnitude < 1.5) return 'walking';
    if (magnitude < 2.5) return 'running';
    return 'vehicle';
  }

  /**
   * Stop all subscriptions
   */
  cleanup(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}