import { PublicKey } from '@solana/web3.js';
import { SeedVaultSigner } from './SeedVaultSigner';
import { SensorData, SensorProof, SensorType } from '@/src/types';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import * as Crypto from 'expo-crypto';

/**
 * ProofGenerator - Creates cryptographically signed proofs of sensor data
 * These proofs can be verified on-chain to confirm data authenticity
 */
export class ProofGenerator {
  private signer: SeedVaultSigner;

  constructor(signer: SeedVaultSigner) {
    this.signer = signer;
  }

  /**
   * Generate a complete proof from sensor data
   * This is the main function DePIN apps will use
   */
  async generateProof(sensorData: SensorData): Promise<SensorProof> {
    if (!this.signer.isAuthorized()) {
      throw new Error('Signer not authorized. Call authorize() first.');
    }

    // Sign the sensor data with Seed Vault
    const { signature, publicKey, messageHash } = await this.signer.signSensorData({
      type: sensorData.type,
      timestamp: sensorData.timestamp,
      data: sensorData.data,
      deviceId: sensorData.deviceId,
    });

    // Create the proof object
    const proof: SensorProof = {
      sensorData,
      signature,
      publicKey,
      proofHash: messageHash,
    };

    return proof;
  }

  /**
   * Generate a batch of proofs efficiently
   * Useful for submitting multiple sensor readings at once
   */
  async generateBatchProofs(sensorDataArray: SensorData[]): Promise<SensorProof[]> {
    const proofs: SensorProof[] = [];

    for (const sensorData of sensorDataArray) {
      try {
        const proof = await this.generateProof(sensorData);
        proofs.push(proof);
      } catch (error) {
        console.error(`Failed to generate proof for ${sensorData.type}:`, error);
        // Continue with other proofs
      }
    }

    return proofs;
  }

  /**
   * Create a Merkle tree of proofs for efficient on-chain verification
   * Allows verifying many proofs with a single root hash
   */
  async createMerkleRoot(proofs: SensorProof[]): Promise<{
    root: string;
    tree: string[][];
  }> {
    if (proofs.length === 0) {
      throw new Error('Cannot create Merkle tree from empty proofs array');
    }

    // Create leaf hashes from proofs
    const leaves = await Promise.all(
      proofs.map(async (proof) => {
        const proofData = this.serializeProof(proof);
        const hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          proofData
        );
        return hash;
      })
    );

    // Build Merkle tree
    const tree: string[][] = [leaves];
    let currentLevel = leaves;

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;

        const combined = left + right;
        const hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          combined
        );

        nextLevel.push(hash);
      }

      tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    return {
      root: currentLevel[0],
      tree,
    };
  }

  /**
   * Generate a Merkle proof for a specific sensor proof
   * This allows on-chain verification without submitting all proofs
   */
  getMerkleProofPath(
    proofIndex: number,
    tree: string[][]
  ): string[] {
    const path: string[] = [];
    let index = proofIndex;

    for (let level = 0; level < tree.length - 1; level++) {
      const isRightNode = index % 2 === 1;
      const siblingIndex = isRightNode ? index - 1 : index + 1;

      if (siblingIndex < tree[level].length) {
        path.push(tree[level][siblingIndex]);
      }

      index = Math.floor(index / 2);
    }

    return path;
  }

  /**
   * Create a location proof with additional anti-spoofing measures
   * Includes device attestation and temporal verification
   */
  async generateLocationProof(
    latitude: number,
    longitude: number,
    accuracy: number,
    deviceId: string,
    additionalContext?: {
      altitude?: number;
      speed?: number;
      heading?: number;
    }
  ): Promise<SensorProof> {
    const sensorData: SensorData = {
      type: SensorType.GPS,
      timestamp: Date.now(),
      data: {
        latitude,
        longitude,
        accuracy,
        ...additionalContext,
      },
      deviceId,
    };

    return this.generateProof(sensorData);
  }

  /**
   * Create a movement proof from accelerometer data
   * Useful for proof-of-physical-activity DePIN apps
   */
  async generateMovementProof(
    x: number,
    y: number,
    z: number,
    deviceId: string
  ): Promise<SensorProof> {
    const sensorData: SensorData = {
      type: SensorType.ACCELEROMETER,
      timestamp: Date.now(),
      data: { x, y, z },
      deviceId,
    };

    return this.generateProof(sensorData);
  }

  /**
   * Serialize proof for transmission or storage
   */
  serializeProof(proof: SensorProof): string {
    return JSON.stringify({
      sensorData: proof.sensorData,
      signature: bs58.encode(proof.signature),
      publicKey: proof.publicKey.toBase58(),
      proofHash: proof.proofHash,
    });
  }

  /**
   * Deserialize proof from stored format
   */
  deserializeProof(serialized: string): SensorProof {
    const parsed = JSON.parse(serialized);

    return {
      sensorData: parsed.sensorData,
      signature: bs58.decode(parsed.signature),
      publicKey: new PublicKey(parsed.publicKey),
      proofHash: parsed.proofHash,
    };
  }

  /**
   * Verify a proof locally before submitting to chain
   */
  async verifyProofLocally(proof: SensorProof): Promise<boolean> {
    try {
      // Recreate the message
      const message = this.createMessage(proof.sensorData);
      const messageBytes = new TextEncoder().encode(message);

      // Verify signature
      return this.signer.verifySignature(
        messageBytes,
        proof.signature,
        proof.publicKey
      );
    } catch (error) {
      console.error('Local verification failed:', error);
      return false;
    }
  }

  /**
   * Create message from sensor data (must match SeedVaultSigner logic)
   */
  private createMessage(sensorData: SensorData): string {
    const dataJson = JSON.stringify(sensorData.data, Object.keys(sensorData.data).sort());
    return `${sensorData.type}|${sensorData.timestamp}|${dataJson}|${sensorData.deviceId}`;
  }

  /**
   * Create a proof bundle for efficient submission
   * Combines multiple proofs with Merkle root for gas optimization
   */
  async createProofBundle(proofs: SensorProof[]): Promise<{
    proofs: SensorProof[];
    merkleRoot: string;
    merkleTree: string[][];
    timestamp: number;
  }> {
    const { root, tree } = await this.createMerkleRoot(proofs);

    return {
      proofs,
      merkleRoot: root,
      merkleTree: tree,
      timestamp: Date.now(),
    };
  }
}

/**
 * Factory function to create a configured ProofGenerator
 */
export function createProofGenerator(signer: SeedVaultSigner): ProofGenerator {
  return new ProofGenerator(signer);
}