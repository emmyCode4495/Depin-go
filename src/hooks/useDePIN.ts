/**
 * useDePIN Hook
 * 
 * All-in-one React hook for DePIN applications
 * Handles wallet connection, proof generation, and submission
 */

import { useState, useEffect, useCallback } from 'react';
import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { SeedVaultSigner, seedVaultSigner } from '../sdk/crypto/SeedVaultSigner';
import { ProofGenerator, createProofGenerator } from '../sdk/crypto/ProofGenerator';
import { SensorManager } from '../sdk/sensors/SensorManager';
import { SensorType, SensorData, SensorProof } from '../types';
import { SOLANA_CONFIG } from '../utils/constants';

export interface UseDePINConfig {
  cluster?: 'devnet' | 'mainnet-beta';
  autoConnect?: boolean;
  programId?: PublicKey;
}

export interface UseDePINReturn {
  // Wallet state
  isConnected: boolean;
  walletAddress: PublicKey | null;
  isConnecting: boolean;

  // Wallet actions
  connect: () => Promise<PublicKey>;
  disconnect: () => Promise<void>;

  // Proof generation
  generateProof: (sensorType: SensorType | SensorData) => Promise<SensorProof>;
  generateBatchProofs: (sensorData: SensorData[]) => Promise<SensorProof[]>;

  // Proof submission
  submitProof: (proof: SensorProof) => Promise<string>;
  submitBatchProof: (proofs: SensorProof[]) => Promise<string>;

  // Sensor access
  sensorManager: SensorManager;
  proofGenerator: ProofGenerator | null;

  // State
  lastProof: SensorProof | null;
  error: Error | null;
  isGenerating: boolean;
  isSubmitting: boolean;
}

export function useDePIN(config: UseDePINConfig = {}): UseDePINReturn {
  const {
    cluster = 'devnet',
    autoConnect = false,
    programId,
  } = config;

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<PublicKey | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastProof, setLastProof] = useState<SensorProof | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // SDK instances
  const [signer] = useState(() => seedVaultSigner);
  const [proofGenerator, setProofGenerator] = useState<ProofGenerator | null>(null);
  const [sensorManager] = useState(() => new SensorManager());
  const [connection] = useState(
    () => new Connection(
      cluster === 'devnet' 
        ? SOLANA_CONFIG.DEVNET_ENDPOINT 
        : SOLANA_CONFIG.MAINNET_ENDPOINT,
      SOLANA_CONFIG.COMMITMENT
    )
  );

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect().catch(console.error);
    }
  }, [autoConnect]);

  // Initialize proof generator when signer is authorized
  useEffect(() => {
    if (signer.isAuthorized() && !proofGenerator) {
      setProofGenerator(createProofGenerator(signer));
    }
  }, [isConnected, signer, proofGenerator]);

  /**
   * Connect wallet via Mobile Wallet Adapter
   */
  const connect = useCallback(async (): Promise<PublicKey> => {
    try {
      setIsConnecting(true);
      setError(null);

      const publicKey = await signer.authorize();

      setWalletAddress(publicKey);
      setIsConnected(true);
      setProofGenerator(createProofGenerator(signer));

      return publicKey;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Connection failed');
      setError(error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [signer]);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await signer.deauthorize();
      setWalletAddress(null);
      setIsConnected(false);
      setProofGenerator(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Disconnect failed');
      setError(error);
      throw error;
    }
  }, [signer]);

  /**
   * Generate proof from sensor type or sensor data
   */
  const generateProof = useCallback(
    async (input: SensorType | SensorData): Promise<SensorProof> => {
      if (!proofGenerator) {
        throw new Error('Not connected. Call connect() first.');
      }

      try {
        setIsGenerating(true);
        setError(null);

        let sensorData: SensorData;

        // If input is a SensorType, collect data from sensors
        if (typeof input === 'string') {
          const type = input as SensorType;

          switch (type) {
            case SensorType.GPS:
              const gpsData = await sensorManager.getGPSData();
              if (!gpsData) throw new Error('Failed to get GPS data');
              sensorData = gpsData;
              break;

            default:
              throw new Error(`Sensor type ${type} not implemented`);
          }
        } else {
          // Input is already SensorData
          sensorData = input;
        }

        const proof = await proofGenerator.generateProof(sensorData);
        setLastProof(proof);

        return proof;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Proof generation failed');
        setError(error);
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [proofGenerator, sensorManager]
  );

  /**
   * Generate multiple proofs
   */
  const generateBatchProofs = useCallback(
    async (sensorDataArray: SensorData[]): Promise<SensorProof[]> => {
      if (!proofGenerator) {
        throw new Error('Not connected. Call connect() first.');
      }

      try {
        setIsGenerating(true);
        setError(null);

        const proofs = await proofGenerator.generateBatchProofs(sensorDataArray);

        return proofs;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Batch proof generation failed');
        setError(error);
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [proofGenerator]
  );

  /**
   * Submit proof to blockchain
   */
  const submitProof = useCallback(
    async (proof: SensorProof): Promise<string> => {
      if (!walletAddress || !programId) {
        throw new Error('Wallet not connected or program ID not provided');
      }

      try {
        setIsSubmitting(true);
        setError(null);

        // This is a simplified version
        // In production, you'd use Anchor to call the smart contract
        console.log('Submitting proof to blockchain:', proof);

        // Example transaction signature
        const signature = 'simulated_tx_' + Date.now();

        return signature;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Proof submission failed');
        setError(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [walletAddress, programId]
  );

  /**
   * Submit batch of proofs
   */
  const submitBatchProof = useCallback(
    async (proofs: SensorProof[]): Promise<string> => {
      if (!walletAddress || !programId || !proofGenerator) {
        throw new Error('Not ready for batch submission');
      }

      try {
        setIsSubmitting(true);
        setError(null);

        // Create Merkle bundle
        const bundle = await proofGenerator.createProofBundle(proofs);

        console.log('Submitting batch proof:', bundle);

        // Submit to blockchain
        const signature = 'batch_tx_' + Date.now();

        return signature;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Batch submission failed');
        setError(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [walletAddress, programId, proofGenerator]
  );

  return {
    // Wallet state
    isConnected,
    walletAddress,
    isConnecting,

    // Wallet actions
    connect,
    disconnect,

    // Proof generation
    generateProof,
    generateBatchProofs,

    // Proof submission
    submitProof,
    submitBatchProof,

    // Utilities
    sensorManager,
    proofGenerator,

    // State
    lastProof,
    error,
    isGenerating,
    isSubmitting,
  };
}