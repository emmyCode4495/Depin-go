/**
 * GPSProof - Specialized proof generator for GPS/location data
 * Includes anti-spoofing measures and location verification
 */

import * as Location from 'expo-location';
import { SensorData, SensorType, GPSData } from '@/src/types';
import { SeedVaultSigner } from '../crypto/SeedVaultSigner';
import { ProofGenerator } from '../crypto/ProofGenerator';
import * as Device from 'expo-device';

export class GPSProofGenerator {
  private signer: SeedVaultSigner;
  private proofGen: ProofGenerator;
  private deviceId: string;

  constructor(signer: SeedVaultSigner) {
    this.signer = signer;
    this.proofGen = new ProofGenerator(signer);
    this.deviceId = Device.modelId || 'unknown';
  }

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      return false;
    }

    // Best-effort background permission — don't fail if denied
    try {
      await Location.requestBackgroundPermissionsAsync();
    } catch {
      console.warn('Background location permission not granted');
    }

    return true;
  }

  /**
   * Get current GPS location with high accuracy
   */
  async getCurrentLocation(): Promise<Location.LocationObject> {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });

    return location;
  }

  /**
   * Generate a GPS proof with anti-spoofing measures.
   * 
   * Accuracy note: 100–200m is normal indoors or before satellite lock.
   * Rather than hard-rejecting, we attach an accuracyWarning to the proof
   * and let the caller decide how to handle low-accuracy readings.
   */
  async generateLocationProof(options?: {
    includeAltitude?: boolean;
    includeSpeed?: boolean;
    includeHeading?: boolean;
    minAccuracy?: number; // meters — proof is still generated above this, just flagged
  }): Promise<any> {
    const {
      includeAltitude = true,
      includeSpeed = true,
      includeHeading = true,
      minAccuracy = 200, // raised from 50m — real-world GPS is often 100–150m indoors
    } = options || {};

    try {
      const location = await this.getCurrentLocation();

      // Warn instead of throwing — still generate proof but flag low accuracy
      let accuracyWarning: string | null = null;
      if (location.coords.accuracy && location.coords.accuracy > minAccuracy) {
        accuracyWarning = `Low accuracy: ${location.coords.accuracy.toFixed(1)}m exceeds threshold of ${minAccuracy}m`;
        console.warn('[GPSProof]', accuracyWarning);
      }

      const gpsData: GPSData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: includeAltitude ? location.coords.altitude : null,
        accuracy: location.coords.accuracy,
        heading: includeHeading ? location.coords.heading : null,
        speed: includeSpeed ? location.coords.speed : null,
      };

      const sensorData: SensorData = {
        type: SensorType.GPS,
        timestamp: location.timestamp,
        data: {
          ...gpsData,
          ...(accuracyWarning ? { accuracyWarning } : {}),
        },
        deviceId: this.deviceId,
      };

      const proof = await this.proofGen.generateProof(sensorData);
      return proof;
    } catch (error) {
      console.error('[GPSProof] Failed to generate GPS proof:', error);
      throw error;
    }
  }

  /**
   * Watch location and generate proofs at intervals.
   * Returns a subscription that can be removed.
   */
  async watchLocationWithProofs(
    callback: (proof: any) => void,
    options?: {
      distanceInterval?: number; // meters
      timeInterval?: number;     // milliseconds
      accuracy?: Location.Accuracy;
    }
  ): Promise<{ remove: () => void }> {
    const {
      distanceInterval = 10,
      timeInterval = 5000,
      accuracy = Location.Accuracy.High,
    } = options || {};

    const subscription = await Location.watchPositionAsync(
      { accuracy, distanceInterval, timeInterval },
      async (location) => {
        try {
          const gpsData: GPSData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            accuracy: location.coords.accuracy,
            heading: location.coords.heading,
            speed: location.coords.speed,
          };

          const sensorData: SensorData = {
            type: SensorType.GPS,
            timestamp: location.timestamp,
            data: gpsData,
            deviceId: this.deviceId,
          };

          const proof = await this.proofGen.generateProof(sensorData);
          callback(proof);
        } catch (error) {
          console.error('[GPSProof] Failed to generate location proof in watch:', error);
        }
      }
    );

    return subscription;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(
    coord1: { latitude: number; longitude: number },
    coord2: { latitude: number; longitude: number }
  ): number {
    const R = 6371e3;
    const φ1 = (coord1.latitude * Math.PI) / 180;
    const φ2 = (coord2.latitude * Math.PI) / 180;
    const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Verify location proof is within a geofence
   */
  isWithinGeofence(
    proof: any,
    center: { latitude: number; longitude: number },
    radiusMeters: number
  ): boolean {
    const proofLocation = {
      latitude: proof.sensorData.data.latitude,
      longitude: proof.sensorData.data.longitude,
    };

    return this.calculateDistance(proofLocation, center) <= radiusMeters;
  }

  /**
   * Detect if location is likely spoofed.
   * Checks for impossible speeds and accuracy anomalies.
   */
  detectSpoofing(
    currentProof: any,
    previousProof?: any,
    options?: {
      maxSpeedMps?: number;
      maxAccuracy?: number;
    }
  ): { isSuspicious: boolean; reasons: string[] } {
    const { maxSpeedMps = 150, maxAccuracy = 300 } = options || {};

    const reasons: string[] = [];

    const accuracy = currentProof.sensorData.data.accuracy;
    if (accuracy && accuracy > maxAccuracy) {
      reasons.push(`Low accuracy: ${accuracy}m > ${maxAccuracy}m`);
    }

    if (previousProof) {
      const currentLoc = {
        latitude: currentProof.sensorData.data.latitude,
        longitude: currentProof.sensorData.data.longitude,
      };
      const previousLoc = {
        latitude: previousProof.sensorData.data.latitude,
        longitude: previousProof.sensorData.data.longitude,
      };

      const distance = this.calculateDistance(currentLoc, previousLoc);
      const timeDiff =
        (currentProof.sensorData.timestamp - previousProof.sensorData.timestamp) / 1000;

      if (timeDiff > 0) {
        const speed = distance / timeDiff;
        if (speed > maxSpeedMps) {
          reasons.push(`Impossible speed: ${speed.toFixed(2)} m/s > ${maxSpeedMps} m/s`);
        }
      }
    }

    const altitude = currentProof.sensorData.data.altitude;
    if (altitude !== null && altitude !== undefined) {
      if (altitude > 9000 || altitude < -500) {
        reasons.push(`Unrealistic altitude: ${altitude}m`);
      }
    }

    return { isSuspicious: reasons.length > 0, reasons };
  }

  /**
   * Generate a proof with reverse-geocoded address context
   */
  async generateEnrichedLocationProof(): Promise<any> {
    const location = await this.getCurrentLocation();

    const reverseGeocode = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    const address = reverseGeocode[0];

    const enrichedData = {
      ...location.coords,
      address: address
        ? {
            city: address.city,
            region: address.region,
            country: address.country,
            postalCode: address.postalCode,
          }
        : null,
    };

    const sensorData: SensorData = {
      type: SensorType.GPS,
      timestamp: location.timestamp,
      data: enrichedData,
      deviceId: this.deviceId,
    };

    return await this.proofGen.generateProof(sensorData);
  }
}