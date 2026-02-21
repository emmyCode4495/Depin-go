/**
 * NetworkSpeedProof - Generate proofs from network speed measurements
 * The "Proof of Coverage" primitive — signed WiFi/cellular readings at a GPS
 * location are the core data primitive for a Helium-style coverage map on Solana.
 */

import NetInfo from '@react-native-community/netinfo';
import { SensorData, SensorType, NetworkSpeedData } from '@/src/types';
import { SeedVaultSigner } from '../crypto/SeedVaultSigner';
import { ProofGenerator } from '../crypto/ProofGenerator';
import * as Device from 'expo-device';

// Public servers used for latency + download tests — no auth required
const SPEED_TEST_URL = 'https://httpbin.org/bytes/500000'; // ~500 KB payload
const LATENCY_URL    = 'https://httpbin.org/get';

export class NetworkSpeedProofGenerator {
  private signer: SeedVaultSigner;
  private proofGen: ProofGenerator;
  private deviceId: string;

  constructor(signer: SeedVaultSigner) {
    this.signer = signer;
    this.proofGen = new ProofGenerator(signer);
    this.deviceId = Device.modelId || 'unknown';
  }

  /**
   * Network is always "available" as a sensor — no special permissions needed.
   */
  async isAvailable(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isInternetReachable === true;
  }

  /**
   * Generate a signed network speed proof.
   *
   * Measures:
   * - Download speed (Mbps) via timed fetch of a known payload
   * - Latency (ms) via round-trip ping
   * - WiFi SSID and signal strength (dBm) where available
   * - Connection type (wifi / cellular / none) and cellular generation
   *
   * This is the "Proof of Coverage" data type — paired with a GPS proof,
   * it proves that a real device measured real network conditions at a real place.
   */
  async generateCoverageProof(): Promise<any> {
    const [netState, latencyMs, downloadMbps] = await Promise.all([
      NetInfo.fetch(),
      this.measureLatency(),
      this.measureDownloadSpeed(),
    ]);

    const details = netState.details as any;

    const data: NetworkSpeedData = {
      downloadMbps,
      latencyMs,
      connectionType: netState.type,
      isInternetReachable: netState.isInternetReachable ?? false,
      // WiFi-specific fields
      ...(netState.type === 'wifi' && details ? {
        wifiSsid: details.ssid ?? undefined,
        wifiSignalStrength: details.strength ?? undefined,
      } : {}),
      // Cellular-specific
      ...(netState.type === 'cellular' && details ? {
        cellularGeneration: details.cellularGeneration ?? undefined,
      } : {}),
    };

    const sensorData: SensorData = {
      type: SensorType.NETWORK_SPEED,
      timestamp: Date.now(),
      data: {
        ...data,
        coverageRating: this.rateCoverage(data),
      },
      deviceId: this.deviceId,
    };

    return await this.proofGen.generateProof(sensorData);
  }

  /**
   * Measure round-trip latency in milliseconds
   */
  private async measureLatency(): Promise<number> {
    try {
      const start = Date.now();
      await fetch(LATENCY_URL, { method: 'GET', cache: 'no-store' });
      return Date.now() - start;
    } catch {
      return -1; // unreachable
    }
  }

  /**
   * Estimate download speed in Mbps by timing a fetch of a known payload
   */
  private async measureDownloadSpeed(): Promise<number> {
    try {
      const start = Date.now();
      const response = await fetch(SPEED_TEST_URL, { cache: 'no-store' });
      const buffer = await response.arrayBuffer();
      const elapsed = (Date.now() - start) / 1000; // seconds
      const bytes = buffer.byteLength;
      const mbps = (bytes * 8) / (elapsed * 1_000_000);
      return parseFloat(mbps.toFixed(2));
    } catch {
      return 0;
    }
  }

  /**
   * Human-readable coverage rating — useful as a proof payload field
   * that downstream DePIN apps can filter on.
   */
  rateCoverage(data: NetworkSpeedData): string {
    if (!data.isInternetReachable) return 'no_coverage';
    if (data.downloadMbps >= 50 && data.latencyMs < 50)  return 'excellent';
    if (data.downloadMbps >= 10 && data.latencyMs < 100) return 'good';
    if (data.downloadMbps >= 1  && data.latencyMs < 300) return 'fair';
    return 'poor';
  }

  /**
   * Subscribe to network state changes with proofs
   */
  subscribeToNetworkChanges(
    callback: (proof: any) => void
  ): { remove: () => void } {
    const unsub = NetInfo.addEventListener(async (state) => {
      if (state.isInternetReachable) {
        try {
          const proof = await this.generateCoverageProof();
          callback(proof);
        } catch (err) {
          console.error('[NetworkProof] Failed on network change:', err);
        }
      }
    });
    return { remove: unsub };
  }
}