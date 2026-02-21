/**
 * BarometerProof - Generate proofs from barometer data
 * Atmospheric pressure sensor — enables decentralised weather network DePIN,
 * analogous to WeatherXM but running entirely on Solana Mobile devices.
 */

import { Barometer } from 'expo-sensors';
import { SensorData, SensorType, BarometerData } from '@/src/types';
import { SeedVaultSigner } from '../crypto/SeedVaultSigner';
import { ProofGenerator } from '../crypto/ProofGenerator';
import * as Device from 'expo-device';

export class BarometerProofGenerator {
  private signer: SeedVaultSigner;
  private proofGen: ProofGenerator;
  private deviceId: string;

  constructor(signer: SeedVaultSigner) {
    this.signer = signer;
    this.proofGen = new ProofGenerator(signer);
    this.deviceId = Device.modelId || 'unknown';
  }

  async isAvailable(): Promise<boolean> {
    return await Barometer.isAvailableAsync();
  }

  /**
   * Generate a signed barometer proof.
   * A signed pressure reading pinned to a GPS timestamp is the core primitive
   * for a decentralised weather oracle — proving "this pressure was measured
   * at this location at this time by a real device."
   */
  async generatePressureProof(options?: {
    samples?: number;      // readings to average (reduces sensor noise)
    intervalMs?: number;
  }): Promise<any> {
    const { samples = 5, intervalMs = 200 } = options || {};

    return new Promise(async (resolve, reject) => {
      const readings: BarometerData[] = [];
      let count = 0;
      let resolved = false;

      Barometer.setUpdateInterval(intervalMs);

      const hardTimeout = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        sub.remove();
        if (readings.length === 0) {
          return reject(new Error('No barometer data received — device may not have a barometer.'));
        }
        buildAndResolve();
      }, intervalMs * samples + 3000);

      const buildAndResolve = async () => {
        try { resolve(await this.buildProof(readings)); }
        catch (err) { reject(err); }
      };

      const sub = Barometer.addListener(async (data) => {
        if (resolved) return;

        readings.push({
          pressure: data.pressure,
          relativeAltitude: (data as any).relativeAltitude ?? undefined,
        });

        count++;
        if (count >= samples) {
          resolved = true;
          clearTimeout(hardTimeout);
          sub.remove();
          await buildAndResolve();
        }
      });
    });
  }

  private async buildProof(readings: BarometerData[]): Promise<any> {
    // Average out sensor noise
    const avgPressure = readings.reduce((s, r) => s + r.pressure, 0) / readings.length;
    const avgAltitude = readings.some(r => r.relativeAltitude !== undefined)
      ? readings.reduce((s, r) => s + (r.relativeAltitude ?? 0), 0) / readings.length
      : undefined;

    const data: BarometerData = {
      pressure: parseFloat(avgPressure.toFixed(4)),
      ...(avgAltitude !== undefined ? { relativeAltitude: parseFloat(avgAltitude.toFixed(2)) } : {}),
    };

    const sensorData: SensorData = {
      type: SensorType.BAROMETER,
      timestamp: Date.now(),
      data: {
        ...data,
        weatherCondition: this.classifyWeather(avgPressure),
        sampleCount: readings.length,
      },
      deviceId: this.deviceId,
    };

    return await this.proofGen.generateProof(sensorData);
  }

  /**
   * Rough weather classification from pressure (hPa).
   * Standard sea-level pressure is 1013.25 hPa.
   */
  classifyWeather(pressureHpa: number): string {
    if (pressureHpa >= 1020) return 'High pressure — clear/sunny';
    if (pressureHpa >= 1009) return 'Normal — stable conditions';
    if (pressureHpa >= 995)  return 'Low pressure — cloudy/windy';
    return 'Very low pressure — storm possible';
  }

  /**
   * Convert hPa to approximate altitude above sea level (barometric formula)
   */
  pressureToAltitude(pressureHpa: number, seaLevelHpa: number = 1013.25): number {
    return 44330 * (1 - Math.pow(pressureHpa / seaLevelHpa, 0.1903));
  }
}