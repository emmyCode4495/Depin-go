/**
 * DePIN-Go SDK
 * 
 * A comprehensive toolkit for building DePIN applications on Solana Mobile
 * 
 * @packageDocumentation
 */

// Core exports
export { SeedVaultSigner, seedVaultSigner } from './crypto/SeedVaultSigner';
export { ProofGenerator, createProofGenerator } from './crypto/ProofGenerator';
export { SensorManager } from './sensors/SensorManager';
export { ProofStorage } from './storage/ProofStorage';

// Sensor-specific exports
export { GPSProofGenerator } from './sensors/GPSProof';
export { AccelerometerProofGenerator } from './sensors/AccelerometerProof';

// Hooks
export { useDePIN } from '../hooks/useDePIN';
export { useSensorProof } from '../hooks/useSensorProof';
export { useProofSubmission } from '../hooks/useProofSubmission';
export { useMWA } from '../hooks/useMWA';

// Types
export * from '../types';

// Constants
export { SOLANA_CONFIG, DEPIN_CONFIG, SENSOR_CONFIG } from '../utils/constants';

// Utilities
export { 
  createSensorMessage,
  verifySensorProof,
  serializeProof,
  deserializeProof,
} from '../utils/proof-helpers';

/**
 * DePIN-Go SDK Version
 */
export const SDK_VERSION = '1.0.0';

/**
 * Quick start helper - Initialize DePIN-Go SDK
 * 
 * @example
 * ```typescript
 * import { initializeDePIN } from 'depin-go-sdk';
 * 
 * const depinSDK = await initializeDePIN({
 *   cluster: 'devnet',
 *   sensorTypes: ['gps', 'accelerometer'],
 * });
 * 
 * const proof = await depinSDK.generateLocationProof();
 * ```
 */
export async function initializeDePIN(config: {
  cluster?: 'devnet' | 'mainnet-beta';
  sensorTypes?: string[];
  autoConnect?: boolean;
}) {
  const { SeedVaultSigner } = await import('./crypto/SeedVaultSigner');
  const { ProofGenerator } = await import('./crypto/ProofGenerator');
  const { SensorManager } = await import('./sensors/SensorManager');

  const signer = new SeedVaultSigner();
  const proofGenerator = new ProofGenerator(signer);
  const sensorManager = new SensorManager();

  if (config.autoConnect) {
    await signer.authorize();
  }

  return {
    signer,
    proofGenerator,
    sensorManager,
    version: SDK_VERSION,
  };
}

/**
 * Re-export common Solana types for convenience
 */
export type { PublicKey, Transaction, Connection } from '@solana/web3.js';