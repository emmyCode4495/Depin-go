/**
 * Proof Helpers
 * Utility functions for working with sensor proofs
 */

import { PublicKey } from '@solana/web3.js';
import { SensorData, SensorProof } from '@/src/types';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import * as Crypto from 'expo-crypto';

/**
 * Create a deterministic message from sensor data
 * Format: type|timestamp|data_json|device_id
 * 
 * This must match the format in SeedVaultSigner and ProofGenerator
 */
export function createSensorMessage(sensorData: SensorData): string {
  // Sort data keys for deterministic JSON
  const dataJson = JSON.stringify(
    sensorData.data,
    Object.keys(sensorData.data).sort()
  );

  return `${sensorData.type}|${sensorData.timestamp}|${dataJson}|${sensorData.deviceId}`;
}

/**
 * Verify a sensor proof's signature
 * Returns true if signature is valid
 */
export function verifySensorProof(proof: SensorProof): boolean {
  try {
    // Recreate the message
    const message = createSensorMessage(proof.sensorData);
    const messageBytes = new TextEncoder().encode(message);

    // Verify signature using ed25519
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      proof.signature,
      proof.publicKey.toBytes()
    );

    return isValid;
  } catch (error) {
    console.error('Proof verification failed:', error);
    return false;
  }
}

/**
 * Serialize a proof to JSON string for storage/transmission
 */
export function serializeProof(proof: SensorProof): string {
  return JSON.stringify({
    sensorData: proof.sensorData,
    signature: bs58.encode(proof.signature),
    publicKey: proof.publicKey.toBase58(),
    proofHash: proof.proofHash,
  });
}

/**
 * Deserialize a proof from JSON string
 */
export function deserializeProof(serialized: string): SensorProof {
  const parsed = JSON.parse(serialized);

  return {
    sensorData: parsed.sensorData,
    signature: bs58.decode(parsed.signature),
    publicKey: new PublicKey(parsed.publicKey),
    proofHash: parsed.proofHash,
  };
}

/**
 * Hash sensor data to create a proof hash
 */
export async function hashSensorData(sensorData: SensorData): Promise<string> {
  const message = createSensorMessage(sensorData);
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    message
  );
  return hash;
}

/**
 * Validate sensor data format
 */
export function validateSensorData(sensorData: SensorData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!sensorData.type) {
    errors.push('Missing sensor type');
  }

  if (!sensorData.timestamp) {
    errors.push('Missing timestamp');
  } else {
    // Check timestamp is not in the future
    if (sensorData.timestamp > Date.now()) {
      errors.push('Timestamp is in the future');
    }

    // Check timestamp is not too old (e.g., more than 1 day)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    if (sensorData.timestamp < oneDayAgo) {
      errors.push('Timestamp is too old (>24 hours)');
    }
  }

  if (!sensorData.data) {
    errors.push('Missing sensor data');
  }

  if (!sensorData.deviceId) {
    errors.push('Missing device ID');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate proof structure
 */
export function validateProof(proof: SensorProof): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate sensor data
  const sensorDataValidation = validateSensorData(proof.sensorData);
  if (!sensorDataValidation.isValid) {
    errors.push(...sensorDataValidation.errors);
  }

  // Check signature
  if (!proof.signature || proof.signature.length !== 64) {
    errors.push('Invalid signature format');
  }

  // Check public key
  if (!proof.publicKey) {
    errors.push('Missing public key');
  }

  // Check proof hash
  if (!proof.proofHash) {
    errors.push('Missing proof hash');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Compare two proofs for equality
 */
export function proofsEqual(proof1: SensorProof, proof2: SensorProof): boolean {
  return proof1.proofHash === proof2.proofHash;
}

/**
 * Extract location from GPS proof
 */
export function extractLocation(proof: SensorProof): {
  latitude: number;
  longitude: number;
} | null {
  if (proof.sensorData.type !== 'gps') {
    return null;
  }

  const data = proof.sensorData.data;
  if (!data.latitude || !data.longitude) {
    return null;
  }

  return {
    latitude: data.latitude,
    longitude: data.longitude,
  };
}

/**
 * Calculate proof age in milliseconds
 */
export function getProofAge(proof: SensorProof): number {
  return Date.now() - proof.sensorData.timestamp;
}

/**
 * Check if proof is expired
 */
export function isProofExpired(proof: SensorProof, expiryMs: number = 3600000): boolean {
  return getProofAge(proof) > expiryMs;
}

/**
 * Group proofs by sensor type
 */
export function groupProofsBySensorType(
  proofs: SensorProof[]
): Record<string, SensorProof[]> {
  return proofs.reduce((acc, proof) => {
    const type = proof.sensorData.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(proof);
    return acc;
  }, {} as Record<string, SensorProof[]>);
}

/**
 * Sort proofs by timestamp (newest first)
 */
export function sortProofsByTime(
  proofs: SensorProof[],
  ascending: boolean = false
): SensorProof[] {
  return [...proofs].sort((a, b) => {
    const diff = a.sensorData.timestamp - b.sensorData.timestamp;
    return ascending ? diff : -diff;
  });
}

/**
 * Filter proofs by time range
 */
export function filterProofsByTimeRange(
  proofs: SensorProof[],
  startTime: number,
  endTime: number
): SensorProof[] {
  return proofs.filter(
    (proof) =>
      proof.sensorData.timestamp >= startTime &&
      proof.sensorData.timestamp <= endTime
  );
}

/**
 * Get unique device IDs from proofs
 */
export function getUniqueDeviceIds(proofs: SensorProof[]): string[] {
  return [...new Set(proofs.map((proof) => proof.sensorData.deviceId))];
}

/**
 * Calculate proof statistics
 */
export function calculateProofStats(proofs: SensorProof[]): {
  totalProofs: number;
  sensorTypes: Record<string, number>;
  devices: number;
  timeRange: { start: number; end: number } | null;
  averageProofsPerHour: number;
} {
  if (proofs.length === 0) {
    return {
      totalProofs: 0,
      sensorTypes: {},
      devices: 0,
      timeRange: null,
      averageProofsPerHour: 0,
    };
  }

  const sensorTypes = proofs.reduce((acc, proof) => {
    const type = proof.sensorData.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const timestamps = proofs.map((p) => p.sensorData.timestamp);
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps);
  const durationHours = (end - start) / (1000 * 60 * 60);

  return {
    totalProofs: proofs.length,
    sensorTypes,
    devices: getUniqueDeviceIds(proofs).length,
    timeRange: { start, end },
    averageProofsPerHour: durationHours > 0 ? proofs.length / durationHours : 0,
  };
}

/**
 * Format proof for display
 */
export function formatProofForDisplay(proof: SensorProof): {
  type: string;
  timestamp: string;
  data: string;
  hash: string;
  publicKey: string;
} {
  const date = new Date(proof.sensorData.timestamp);

  return {
    type: proof.sensorData.type.toUpperCase(),
    timestamp: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
    data: formatSensorDataForDisplay(proof.sensorData),
    hash: `${proof.proofHash.slice(0, 8)}...${proof.proofHash.slice(-8)}`,
    publicKey: `${proof.publicKey.toBase58().slice(0, 8)}...`,
  };
}

/**
 * Format sensor data for display
 */
function formatSensorDataForDisplay(sensorData: SensorData): string {
  const data = sensorData.data;

  switch (sensorData.type) {
    case 'gps':
      return `Lat: ${data.latitude?.toFixed(6)}, Lng: ${data.longitude?.toFixed(6)}`;
    case 'accelerometer':
      return `X: ${data.x?.toFixed(2)}, Y: ${data.y?.toFixed(2)}, Z: ${data.z?.toFixed(2)}`;
    default:
      return JSON.stringify(data).slice(0, 50);
  }
}

/**
 * Create a proof bundle summary
 */
export function createProofBundleSummary(proofs: SensorProof[]): {
  count: number;
  types: string[];
  timeRange: string;
  devices: number;
} {
  const stats = calculateProofStats(proofs);
  const types = Object.keys(stats.sensorTypes);

  let timeRange = 'N/A';
  if (stats.timeRange) {
    const start = new Date(stats.timeRange.start).toLocaleString();
    const end = new Date(stats.timeRange.end).toLocaleString();
    timeRange = `${start} - ${end}`;
  }

  return {
    count: stats.totalProofs,
    types,
    timeRange,
    devices: stats.devices,
  };
}

/**
 * Export proofs to CSV format
 */
export function exportProofsToCSV(proofs: SensorProof[]): string {
  const headers = [
    'Timestamp',
    'Sensor Type',
    'Device ID',
    'Data',
    'Proof Hash',
    'Public Key',
  ];

  const rows = proofs.map((proof) => {
    const date = new Date(proof.sensorData.timestamp).toISOString();
    const data = JSON.stringify(proof.sensorData.data);

    return [
      date,
      proof.sensorData.type,
      proof.sensorData.deviceId,
      data,
      proof.proofHash,
      proof.publicKey.toBase58(),
    ].map((field) => `"${field}"`);
  });

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Import proofs from CSV format
 */
export function importProofsFromCSV(csv: string): SensorProof[] {
  const lines = csv.split('\n');
  const proofs: SensorProof[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    try {
      // Parse CSV line (simple implementation)
      const fields = line.split(',').map((field) => field.replace(/^"|"$/g, ''));

      const [timestamp, type, deviceId, data, proofHash, publicKey] = fields;

      const proof: SensorProof = {
        sensorData: {
          type: type as any,
          timestamp: new Date(timestamp).getTime(),
          deviceId,
          data: JSON.parse(data),
        },
        signature: new Uint8Array(64), // Placeholder
        publicKey: new PublicKey(publicKey),
        proofHash,
      };

      proofs.push(proof);
    } catch (error) {
      console.error(`Failed to parse line ${i}:`, error);
    }
  }

  return proofs;
}