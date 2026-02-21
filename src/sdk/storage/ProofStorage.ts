/**
 * ProofStorage - Local storage for sensor proofs
 * Handles caching, offline support, and proof history
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SensorProof } from '@/src/types';

const STORAGE_KEYS = {
  PROOFS: '@depin-go:proofs',
  PENDING_SUBMISSIONS: '@depin-go:pending',
  SETTINGS: '@depin-go:settings',
};

export interface StoredProof {
  proof: SensorProof;
  submitted: boolean;
  submittedAt?: number;
  transactionSignature?: string;
  error?: string;
}

export class ProofStorage {
  /**
   * Save a proof to local storage
   */
  async saveProof(proof: SensorProof): Promise<void> {
    try {
      const storedProof: StoredProof = {
        proof,
        submitted: false,
      };

      // Get existing proofs
      const proofs = await this.getAllProofs();
      
      // Add new proof
      proofs.push(storedProof);

      // Save back to storage
      await AsyncStorage.setItem(STORAGE_KEYS.PROOFS, JSON.stringify(proofs));
    } catch (error) {
      console.error('Failed to save proof:', error);
      throw error;
    }
  }

  /**
   * Save multiple proofs at once
   */
  async saveBatchProofs(proofs: SensorProof[]): Promise<void> {
    try {
      const storedProofs: StoredProof[] = proofs.map((proof) => ({
        proof,
        submitted: false,
      }));

      const existingProofs = await this.getAllProofs();
      const allProofs = [...existingProofs, ...storedProofs];

      await AsyncStorage.setItem(STORAGE_KEYS.PROOFS, JSON.stringify(allProofs));
    } catch (error) {
      console.error('Failed to save batch proofs:', error);
      throw error;
    }
  }

  /**
   * Get all stored proofs
   */
  async getAllProofs(): Promise<StoredProof[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PROOFS);
      if (!data) return [];

      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to get proofs:', error);
      return [];
    }
  }

  /**
   * Get proofs by sensor type
   */
  async getProofsBySensorType(sensorType: string): Promise<StoredProof[]> {
    const allProofs = await this.getAllProofs();
    return allProofs.filter((sp) => sp.proof.sensorData.type === sensorType);
  }

  /**
   * Get unsubmitted proofs
   */
  async getPendingProofs(): Promise<StoredProof[]> {
    const allProofs = await this.getAllProofs();
    return allProofs.filter((sp) => !sp.submitted);
  }

  /**
   * Mark proof as submitted
   */
  async markAsSubmitted(
    proofHash: string,
    transactionSignature: string
  ): Promise<void> {
    try {
      const proofs = await this.getAllProofs();
      
      const index = proofs.findIndex(
        (sp) => sp.proof.proofHash === proofHash
      );

      if (index !== -1) {
        proofs[index].submitted = true;
        proofs[index].submittedAt = Date.now();
        proofs[index].transactionSignature = transactionSignature;

        await AsyncStorage.setItem(STORAGE_KEYS.PROOFS, JSON.stringify(proofs));
      }
    } catch (error) {
      console.error('Failed to mark proof as submitted:', error);
      throw error;
    }
  }

  /**
   * Mark proof as failed
   */
  async markAsFailed(proofHash: string, error: string): Promise<void> {
    try {
      const proofs = await this.getAllProofs();
      
      const index = proofs.findIndex(
        (sp) => sp.proof.proofHash === proofHash
      );

      if (index !== -1) {
        proofs[index].error = error;

        await AsyncStorage.setItem(STORAGE_KEYS.PROOFS, JSON.stringify(proofs));
      }
    } catch (error) {
      console.error('Failed to mark proof as failed:', error);
      throw error;
    }
  }

  /**
   * Get proof by hash
   */
  async getProofByHash(proofHash: string): Promise<StoredProof | null> {
    const proofs = await this.getAllProofs();
    return proofs.find((sp) => sp.proof.proofHash === proofHash) || null;
  }

  /**
   * Get proofs within time range
   */
  async getProofsByTimeRange(
    startTimestamp: number,
    endTimestamp: number
  ): Promise<StoredProof[]> {
    const allProofs = await this.getAllProofs();
    return allProofs.filter(
      (sp) =>
        sp.proof.sensorData.timestamp >= startTimestamp &&
        sp.proof.sensorData.timestamp <= endTimestamp
    );
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalProofs: number;
    submittedProofs: number;
    pendingProofs: number;
    failedProofs: number;
    storageSize: number; // bytes
  }> {
    const proofs = await this.getAllProofs();
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PROOFS);

    return {
      totalProofs: proofs.length,
      submittedProofs: proofs.filter((p) => p.submitted).length,
      pendingProofs: proofs.filter((p) => !p.submitted && !p.error).length,
      failedProofs: proofs.filter((p) => p.error).length,
      storageSize: data ? new Blob([data]).size : 0,
    };
  }

  /**
   * Clear old proofs (older than X days)
   */
  async clearOldProofs(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = Date.now() - daysOld * 24 * 60 * 60 * 1000;
      const proofs = await this.getAllProofs();

      const recentProofs = proofs.filter(
        (sp) => sp.proof.sensorData.timestamp > cutoffDate
      );

      await AsyncStorage.setItem(
        STORAGE_KEYS.PROOFS,
        JSON.stringify(recentProofs)
      );

      return proofs.length - recentProofs.length;
    } catch (error) {
      console.error('Failed to clear old proofs:', error);
      return 0;
    }
  }

  /**
   * Clear all proofs
   */
  async clearAllProofs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PROOFS);
    } catch (error) {
      console.error('Failed to clear all proofs:', error);
      throw error;
    }
  }

  /**
   * Export proofs to JSON
   */
  async exportProofs(): Promise<string> {
    const proofs = await this.getAllProofs();
    return JSON.stringify(proofs, null, 2);
  }

  /**
   * Import proofs from JSON
   */
  async importProofs(jsonData: string): Promise<number> {
    try {
      const importedProofs: StoredProof[] = JSON.parse(jsonData);
      const existingProofs = await this.getAllProofs();

      // Merge without duplicates
      const allProofs = [...existingProofs];
      let importCount = 0;

      for (const proof of importedProofs) {
        const exists = allProofs.some(
          (p) => p.proof.proofHash === proof.proof.proofHash
        );

        if (!exists) {
          allProofs.push(proof);
          importCount++;
        }
      }

      await AsyncStorage.setItem(STORAGE_KEYS.PROOFS, JSON.stringify(allProofs));

      return importCount;
    } catch (error) {
      console.error('Failed to import proofs:', error);
      throw error;
    }
  }

  /**
   * Get submission queue (proofs ready to be submitted)
   */
  async getSubmissionQueue(limit?: number): Promise<StoredProof[]> {
    const pending = await this.getPendingProofs();
    
    // Sort by timestamp (oldest first)
    const sorted = pending.sort(
      (a, b) => a.proof.sensorData.timestamp - b.proof.sensorData.timestamp
    );

    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Save settings
   */
  async saveSettings(settings: Record<string, any>): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  /**
   * Get settings
   */
  async getSettings(): Promise<Record<string, any>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {};
    }
  }

  /**
   * Compact storage by removing duplicate proofs
   */
  async compactStorage(): Promise<number> {
    try {
      const proofs = await this.getAllProofs();
      const uniqueProofs = new Map<string, StoredProof>();

      for (const proof of proofs) {
        if (!uniqueProofs.has(proof.proof.proofHash)) {
          uniqueProofs.set(proof.proof.proofHash, proof);
        }
      }

      const compactedProofs = Array.from(uniqueProofs.values());
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.PROOFS,
        JSON.stringify(compactedProofs)
      );

      return proofs.length - compactedProofs.length;
    } catch (error) {
      console.error('Failed to compact storage:', error);
      return 0;
    }
  }
}

/**
 * Singleton instance for app-wide use
 */
export const proofStorage = new ProofStorage();