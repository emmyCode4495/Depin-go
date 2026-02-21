

// /**
//  * useSensorProof Hook
//  * Simplified hook for generating sensor proofs
//  */

// import { useState, useCallback, useEffect } from 'react';
// import { SensorType, SensorProof } from '@/src/types';
// import { seedVaultSigner } from '../sdk/crypto/SeedVaultSigner';
// import { GPSProofGenerator } from '../sdk/sensors/GPSProof';
// import { AccelerometerProofGenerator } from '../sdk/sensors/AccelerometerProof';
// import { proofStorage } from '../sdk/storage/ProofStorage';

// export function useSensorProof(
//   sensorType: SensorType,
//   options?: { autoSave?: boolean }
// ) {
//   const { autoSave = true } = options || {};

//   const [proof, setProof] = useState<SensorProof | null>(null);
//   const [isGenerating, setIsGenerating] = useState(false);
//   const [error, setError] = useState<Error | null>(null);
//   const [permissionGranted, setPermissionGranted] = useState(false);

//   // Initialize generators once
//   const [gpsGenerator] = useState(
//     () => new GPSProofGenerator(seedVaultSigner)
//   );
//   const [accelGenerator] = useState(
//     () => new AccelerometerProofGenerator(seedVaultSigner)
//   );

//   /**
//    * Request sensor permissions on mount
//    */
//   useEffect(() => {
//     requestPermissions();
//   }, [sensorType]); // re-run if sensor type changes

//   /**
//    * Request sensor permissions
//    */
//   const requestPermissions = useCallback(async () => {
//     try {
//       if (sensorType === SensorType.GPS) {
//         const granted = await gpsGenerator.requestPermissions();
//         setPermissionGranted(granted);
//         return granted;
//       }

//       if (sensorType === SensorType.ACCELEROMETER) {
//         const available = await accelGenerator.isAvailable();
//         setPermissionGranted(available);
//         return available;
//       }

//       // Other sensors not implemented yet
//       setPermissionGranted(false);
//       return false;
//     } catch (err) {
//       setError(
//         err instanceof Error
//           ? err
//           : new Error('Permission request failed')
//       );
//       return false;
//     }
//   }, [sensorType, gpsGenerator, accelGenerator]);

//   /**
//    * Generate a location proof (GPS only)
//    */
//   const generateLocationProof = useCallback(
//     async (options?: {
//       minAccuracy?: number;
//       includeAltitude?: boolean;
//       includeSpeed?: boolean;
//     }): Promise<SensorProof | null> => {
//       if (sensorType !== SensorType.GPS) {
//         setError(new Error('Location proof requires GPS sensor type'));
//         return null;
//       }

//       if (!seedVaultSigner.isAuthorized()) {
//         setError(new Error('Wallet not authorized'));
//         return null;
//       }

//       try {
//         setIsGenerating(true);
//         setError(null);

//         const newProof = await gpsGenerator.generateLocationProof(options);
//         setProof(newProof);

//         if (autoSave) {
//           await proofStorage.saveProof(newProof);
//         }

//         return newProof;
//       } catch (err) {
//         const error =
//           err instanceof Error
//             ? err
//             : new Error('Proof generation failed');
//         setError(error);
//         return null;
//       } finally {
//         setIsGenerating(false);
//       }
//     },
//     [sensorType, gpsGenerator, autoSave]
//   );

//   /**
//    * Generate a movement proof (Accelerometer only)
//    */
//   const generateMovementProof = useCallback(
//     async (options?: {
//       duration?: number;
//       samples?: number;
//     }): Promise<SensorProof | null> => {
//       if (sensorType !== SensorType.ACCELEROMETER) {
//         setError(
//           new Error('Movement proof requires ACCELEROMETER sensor type')
//         );
//         return null;
//       }

//       if (!seedVaultSigner.isAuthorized()) {
//         setError(new Error('Wallet not authorized'));
//         return null;
//       }

//       try {
//         setIsGenerating(true);
//         setError(null);

//         const newProof =
//           await accelGenerator.generateMovementProof(options);

//         setProof(newProof);

//         if (autoSave) {
//           await proofStorage.saveProof(newProof);
//         }

//         return newProof;
//       } catch (err) {
//         const error =
//           err instanceof Error
//             ? err
//             : new Error('Proof generation failed');
//         setError(error);
//         return null;
//       } finally {
//         setIsGenerating(false);
//       }
//     },
//     [sensorType, accelGenerator, autoSave]
//   );

//   /**
//    * Detect steps with proof (Accelerometer only)
//    */
//   const detectSteps = useCallback(
//     async (
//       durationMs?: number
//     ): Promise<{ steps: number; proof: SensorProof } | null> => {
//       if (sensorType !== SensorType.ACCELEROMETER) {
//         setError(
//           new Error('Step detection requires ACCELEROMETER sensor type')
//         );
//         return null;
//       }

//       if (!seedVaultSigner.isAuthorized()) {
//         setError(new Error('Wallet not authorized'));
//         return null;
//       }

//       try {
//         setIsGenerating(true);
//         setError(null);

//         const result =
//           await accelGenerator.detectStepsWithProof(durationMs);

//         setProof(result.proof);

//         if (autoSave) {
//           await proofStorage.saveProof(result.proof);
//         }

//         return result;
//       } catch (err) {
//         const error =
//           err instanceof Error
//             ? err
//             : new Error('Step detection failed');
//         setError(error);
//         return null;
//       } finally {
//         setIsGenerating(false);
//       }
//     },
//     [sensorType, accelGenerator, autoSave]
//   );

//   /**
//    * Subscribe to continuous GPS proofs
//    */
//   const subscribeToLocationProofs = useCallback(
//     async (
//       callback: (proof: SensorProof) => void,
//       options?: {
//         distanceInterval?: number;
//         timeInterval?: number;
//       }
//     ): Promise<{ remove: () => void } | null> => {
//       if (sensorType !== SensorType.GPS) {
//         setError(new Error('Location subscription requires GPS'));
//         return null;
//       }

//       if (!seedVaultSigner.isAuthorized()) {
//         setError(new Error('Wallet not authorized'));
//         return null;
//       }

//       try {
//         return await gpsGenerator.watchLocationWithProofs(
//           async (proof) => {
//             setProof(proof);

//             if (autoSave) {
//               await proofStorage.saveProof(proof);
//             }

//             callback(proof);
//           },
//           options
//         );
//       } catch (err) {
//         setError(
//           err instanceof Error
//             ? err
//             : new Error('Subscription failed')
//         );
//         return null;
//       }
//     },
//     [sensorType, gpsGenerator, autoSave]
//   );

//   /**
//    * Subscribe to continuous accelerometer proofs
//    */
//   const subscribeToMovementProofs = useCallback(
//     (
//       callback: (proof?: SensorProof) => void,
//       options?: {
//         updateInterval?: number;
//         proofInterval?: number;
//       }
//     ): { remove: () => void } | null => {
//       if (sensorType !== SensorType.ACCELEROMETER) {
//         setError(
//           new Error('Movement subscription requires ACCELEROMETER')
//         );
//         return null;
//       }

//       if (!seedVaultSigner.isAuthorized()) {
//         setError(new Error('Wallet not authorized'));
//         return null;
//       }

//       try {
//         return accelGenerator.subscribeWithProofs(
//           async (data, proof) => {
//             if (proof) {
//               setProof(proof);

//               if (autoSave) {
//                 await proofStorage.saveProof(proof);
//               }

//               callback(proof);
//             }
//           },
//           options
//         );
//       } catch (err) {
//         setError(
//           err instanceof Error
//             ? err
//             : new Error('Subscription failed')
//         );
//         return null;
//       }
//     },
//     [sensorType, accelGenerator, autoSave]
//   );

//   /**
//    * Clear proof state
//    */
//   const clearProof = useCallback(() => {
//     setProof(null);
//     setError(null);
//   }, []);

//   return {
//     // State
//     proof,
//     isGenerating,
//     error,
//     permissionGranted,

//     // Actions
//     requestPermissions,
//     generateLocationProof,
//     generateMovementProof,
//     detectSteps,
//     subscribeToLocationProofs,
//     subscribeToMovementProofs,
//     clearProof,

//     // Utilities
//     gpsGenerator,
//     accelGenerator,
//   };
// }


/**
 * useSensorProof Hook
 * Unified hook for generating sensor proofs from any supported sensor type.
 */

import { useState, useCallback, useEffect } from 'react';
import { SensorType, SensorProof } from '@/src/types';
import { seedVaultSigner } from '../sdk/crypto/SeedVaultSigner';
import { GPSProofGenerator } from '../sdk/sensors/GPSProof';
import { AccelerometerProofGenerator } from '../sdk/sensors/AccelerometerProof';
import { GyroscopeProofGenerator } from '../sdk/sensors/GyroscopeProof';
import { MagnetometerProofGenerator } from '../sdk/sensors/MagnetometerProof';
import { BarometerProofGenerator } from '../sdk/sensors/BarometerProof';
import { NetworkSpeedProofGenerator } from '../sdk/sensors/NetworkSpeedProof';
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

  // ── Generators (one instance each, stable across renders) ──────────────────
  const [gpsGenerator]         = useState(() => new GPSProofGenerator(seedVaultSigner));
  const [accelGenerator]       = useState(() => new AccelerometerProofGenerator(seedVaultSigner));
  const [gyroGenerator]        = useState(() => new GyroscopeProofGenerator(seedVaultSigner));
  const [magnetoGenerator]     = useState(() => new MagnetometerProofGenerator(seedVaultSigner));
  const [barometerGenerator]   = useState(() => new BarometerProofGenerator(seedVaultSigner));
  const [networkGenerator]     = useState(() => new NetworkSpeedProofGenerator(seedVaultSigner));

  // ── Auto-check availability on mount ──────────────────────────────────────
  useEffect(() => {
    requestPermissions();
  }, [sensorType]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      let granted = false;
      switch (sensorType) {
        case SensorType.GPS:
          granted = await gpsGenerator.requestPermissions();
          break;
        case SensorType.ACCELEROMETER:
          granted = await accelGenerator.isAvailable();
          break;
        case SensorType.GYROSCOPE:
          granted = await gyroGenerator.isAvailable();
          break;
        case SensorType.MAGNETOMETER:
          granted = await magnetoGenerator.isAvailable();
          break;
        case SensorType.BAROMETER:
          granted = await barometerGenerator.isAvailable();
          break;
        case SensorType.NETWORK_SPEED:
          granted = await networkGenerator.isAvailable();
          break;
        default:
          granted = false;
      }
      setPermissionGranted(granted);
      return granted;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Permission check failed'));
      return false;
    }
  }, [sensorType]);

  // ── Shared save + state helper ─────────────────────────────────────────────
  const finalise = useCallback(async (newProof: SensorProof): Promise<SensorProof> => {
    setProof(newProof);
    if (autoSave) await proofStorage.saveProof(newProof);
    return newProof;
  }, [autoSave]);

  // ── GPS ───────────────────────────────────────────────────────────────────
  const generateLocationProof = useCallback(async (opts?: {
    minAccuracy?: number;
    includeAltitude?: boolean;
    includeSpeed?: boolean;
  }): Promise<SensorProof | null> => {
    if (sensorType !== SensorType.GPS) {
      setError(new Error('generateLocationProof requires GPS sensor type'));
      return null;
    }
    if (!seedVaultSigner.isAuthorized()) {
      setError(new Error('Wallet not authorized'));
      return null;
    }
    try {
      setIsGenerating(true);
      setError(null);
      return await finalise(await gpsGenerator.generateLocationProof(opts));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('GPS proof failed'));
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [sensorType, gpsGenerator, finalise]);

  // ── Accelerometer ─────────────────────────────────────────────────────────
  const generateMovementProof = useCallback(async (opts?: {
    duration?: number;
    samples?: number;
  }): Promise<SensorProof | null> => {
    if (sensorType !== SensorType.ACCELEROMETER) {
      setError(new Error('generateMovementProof requires ACCELEROMETER sensor type'));
      return null;
    }
    if (!seedVaultSigner.isAuthorized()) {
      setError(new Error('Wallet not authorized'));
      return null;
    }
    try {
      setIsGenerating(true);
      setError(null);
      return await finalise(await accelGenerator.generateMovementProof(opts));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Accelerometer proof failed'));
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [sensorType, accelGenerator, finalise]);

  // ── Gyroscope ─────────────────────────────────────────────────────────────
  const generateRotationProof = useCallback(async (opts?: {
    duration?: number;
    samples?: number;
  }): Promise<SensorProof | null> => {
    if (sensorType !== SensorType.GYROSCOPE) {
      setError(new Error('generateRotationProof requires GYROSCOPE sensor type'));
      return null;
    }
    if (!seedVaultSigner.isAuthorized()) {
      setError(new Error('Wallet not authorized'));
      return null;
    }
    try {
      setIsGenerating(true);
      setError(null);
      return await finalise(await gyroGenerator.generateRotationProof(opts));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Gyroscope proof failed'));
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [sensorType, gyroGenerator, finalise]);

  // ── Magnetometer ──────────────────────────────────────────────────────────
  const generateMagneticProof = useCallback(async (opts?: {
    duration?: number;
    samples?: number;
  }): Promise<SensorProof | null> => {
    if (sensorType !== SensorType.MAGNETOMETER) {
      setError(new Error('generateMagneticProof requires MAGNETOMETER sensor type'));
      return null;
    }
    if (!seedVaultSigner.isAuthorized()) {
      setError(new Error('Wallet not authorized'));
      return null;
    }
    try {
      setIsGenerating(true);
      setError(null);
      return await finalise(await magnetoGenerator.generateMagneticProof(opts));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Magnetometer proof failed'));
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [sensorType, magnetoGenerator, finalise]);

  // ── Barometer ─────────────────────────────────────────────────────────────
  const generatePressureProof = useCallback(async (opts?: {
    samples?: number;
    intervalMs?: number;
  }): Promise<SensorProof | null> => {
    if (sensorType !== SensorType.BAROMETER) {
      setError(new Error('generatePressureProof requires BAROMETER sensor type'));
      return null;
    }
    if (!seedVaultSigner.isAuthorized()) {
      setError(new Error('Wallet not authorized'));
      return null;
    }
    try {
      setIsGenerating(true);
      setError(null);
      return await finalise(await barometerGenerator.generatePressureProof(opts));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Barometer proof failed'));
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [sensorType, barometerGenerator, finalise]);

  // ── Network Speed ─────────────────────────────────────────────────────────
  const generateCoverageProof = useCallback(async (): Promise<SensorProof | null> => {
    if (sensorType !== SensorType.NETWORK_SPEED) {
      setError(new Error('generateCoverageProof requires NETWORK_SPEED sensor type'));
      return null;
    }
    if (!seedVaultSigner.isAuthorized()) {
      setError(new Error('Wallet not authorized'));
      return null;
    }
    try {
      setIsGenerating(true);
      setError(null);
      return await finalise(await networkGenerator.generateCoverageProof());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Network proof failed'));
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [sensorType, networkGenerator, finalise]);

  // ── Step detection (accelerometer convenience) ────────────────────────────
  const detectSteps = useCallback(async (
    durationMs?: number
  ): Promise<{ steps: number; proof: SensorProof } | null> => {
    if (sensorType !== SensorType.ACCELEROMETER) return null;
    if (!seedVaultSigner.isAuthorized()) return null;
    try {
      setIsGenerating(true);
      setError(null);
      const result = await accelGenerator.detectStepsWithProof(durationMs);
      await finalise(result.proof);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Step detection failed'));
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [sensorType, accelGenerator, finalise]);

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

    // Permissions
    requestPermissions,

    // Proof generators (one per sensor type)
    generateLocationProof,   // GPS
    generateMovementProof,   // ACCELEROMETER
    generateRotationProof,   // GYROSCOPE
    generateMagneticProof,   // MAGNETOMETER
    generatePressureProof,   // BAROMETER
    generateCoverageProof,   // NETWORK_SPEED
    detectSteps,             // ACCELEROMETER convenience

    // Raw generators (for advanced use)
    gpsGenerator,
    accelGenerator,
    gyroGenerator,
    magnetoGenerator,
    barometerGenerator,
    networkGenerator,

    clearProof,
  };
}