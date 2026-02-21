

/**
 * useSensorProof Hook
 * Simplified hook for generating sensor proofs
 */

import { useState, useCallback, useEffect } from 'react';
import { SensorType, SensorProof } from '@/src/types';
import { seedVaultSigner } from '../sdk/crypto/SeedVaultSigner';
import { GPSProofGenerator } from '../sdk/sensors/GPSProof';
import { AccelerometerProofGenerator } from '../sdk/sensors/AccelerometerProof';
import { proofStorage } from '../sdk/storage/ProofStorage';

export function useSensorProof(
  sensorType: SensorType,
  options?: { autoSave?: boolean }
) {
  const { autoSave = true } = options || {};

  const [proof, setProof] = useState<SensorProof | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Initialize generators once
  const [gpsGenerator] = useState(
    () => new GPSProofGenerator(seedVaultSigner)
  );
  const [accelGenerator] = useState(
    () => new AccelerometerProofGenerator(seedVaultSigner)
  );

  /**
   * Request sensor permissions on mount
   */
  useEffect(() => {
    requestPermissions();
  }, [sensorType]); // re-run if sensor type changes

  /**
   * Request sensor permissions
   */
  const requestPermissions = useCallback(async () => {
    try {
      if (sensorType === SensorType.GPS) {
        const granted = await gpsGenerator.requestPermissions();
        setPermissionGranted(granted);
        return granted;
      }

      if (sensorType === SensorType.ACCELEROMETER) {
        const available = await accelGenerator.isAvailable();
        setPermissionGranted(available);
        return available;
      }

      // Other sensors not implemented yet
      setPermissionGranted(false);
      return false;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error('Permission request failed')
      );
      return false;
    }
  }, [sensorType, gpsGenerator, accelGenerator]);

  /**
   * Generate a location proof (GPS only)
   */
  const generateLocationProof = useCallback(
    async (options?: {
      minAccuracy?: number;
      includeAltitude?: boolean;
      includeSpeed?: boolean;
    }): Promise<SensorProof | null> => {
      if (sensorType !== SensorType.GPS) {
        setError(new Error('Location proof requires GPS sensor type'));
        return null;
      }

      if (!seedVaultSigner.isAuthorized()) {
        setError(new Error('Wallet not authorized'));
        return null;
      }

      try {
        setIsGenerating(true);
        setError(null);

        const newProof = await gpsGenerator.generateLocationProof(options);
        setProof(newProof);

        if (autoSave) {
          await proofStorage.saveProof(newProof);
        }

        return newProof;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error('Proof generation failed');
        setError(error);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [sensorType, gpsGenerator, autoSave]
  );

  /**
   * Generate a movement proof (Accelerometer only)
   */
  const generateMovementProof = useCallback(
    async (options?: {
      duration?: number;
      samples?: number;
    }): Promise<SensorProof | null> => {
      if (sensorType !== SensorType.ACCELEROMETER) {
        setError(
          new Error('Movement proof requires ACCELEROMETER sensor type')
        );
        return null;
      }

      if (!seedVaultSigner.isAuthorized()) {
        setError(new Error('Wallet not authorized'));
        return null;
      }

      try {
        setIsGenerating(true);
        setError(null);

        const newProof =
          await accelGenerator.generateMovementProof(options);

        setProof(newProof);

        if (autoSave) {
          await proofStorage.saveProof(newProof);
        }

        return newProof;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error('Proof generation failed');
        setError(error);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [sensorType, accelGenerator, autoSave]
  );

  /**
   * Detect steps with proof (Accelerometer only)
   */
  const detectSteps = useCallback(
    async (
      durationMs?: number
    ): Promise<{ steps: number; proof: SensorProof } | null> => {
      if (sensorType !== SensorType.ACCELEROMETER) {
        setError(
          new Error('Step detection requires ACCELEROMETER sensor type')
        );
        return null;
      }

      if (!seedVaultSigner.isAuthorized()) {
        setError(new Error('Wallet not authorized'));
        return null;
      }

      try {
        setIsGenerating(true);
        setError(null);

        const result =
          await accelGenerator.detectStepsWithProof(durationMs);

        setProof(result.proof);

        if (autoSave) {
          await proofStorage.saveProof(result.proof);
        }

        return result;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error('Step detection failed');
        setError(error);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [sensorType, accelGenerator, autoSave]
  );

  /**
   * Subscribe to continuous GPS proofs
   */
  const subscribeToLocationProofs = useCallback(
    async (
      callback: (proof: SensorProof) => void,
      options?: {
        distanceInterval?: number;
        timeInterval?: number;
      }
    ): Promise<{ remove: () => void } | null> => {
      if (sensorType !== SensorType.GPS) {
        setError(new Error('Location subscription requires GPS'));
        return null;
      }

      if (!seedVaultSigner.isAuthorized()) {
        setError(new Error('Wallet not authorized'));
        return null;
      }

      try {
        return await gpsGenerator.watchLocationWithProofs(
          async (proof) => {
            setProof(proof);

            if (autoSave) {
              await proofStorage.saveProof(proof);
            }

            callback(proof);
          },
          options
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Subscription failed')
        );
        return null;
      }
    },
    [sensorType, gpsGenerator, autoSave]
  );

  /**
   * Subscribe to continuous accelerometer proofs
   */
  const subscribeToMovementProofs = useCallback(
    (
      callback: (proof?: SensorProof) => void,
      options?: {
        updateInterval?: number;
        proofInterval?: number;
      }
    ): { remove: () => void } | null => {
      if (sensorType !== SensorType.ACCELEROMETER) {
        setError(
          new Error('Movement subscription requires ACCELEROMETER')
        );
        return null;
      }

      if (!seedVaultSigner.isAuthorized()) {
        setError(new Error('Wallet not authorized'));
        return null;
      }

      try {
        return accelGenerator.subscribeWithProofs(
          async (data, proof) => {
            if (proof) {
              setProof(proof);

              if (autoSave) {
                await proofStorage.saveProof(proof);
              }

              callback(proof);
            }
          },
          options
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Subscription failed')
        );
        return null;
      }
    },
    [sensorType, accelGenerator, autoSave]
  );

  /**
   * Clear proof state
   */
  const clearProof = useCallback(() => {
    setProof(null);
    setError(null);
  }, []);

  return {
    // State
    proof,
    isGenerating,
    error,
    permissionGranted,

    // Actions
    requestPermissions,
    generateLocationProof,
    generateMovementProof,
    detectSteps,
    subscribeToLocationProofs,
    subscribeToMovementProofs,
    clearProof,

    // Utilities
    gpsGenerator,
    accelGenerator,
  };
}
