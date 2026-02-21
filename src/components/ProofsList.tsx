/**
 * ProofsList - Display list of generated proofs
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SensorProof } from '@/src/types';

interface ProofsListProps {
  proofs: SensorProof[];
  onProofPress?: (proof: SensorProof) => void;
  onSubmit?: (proof: SensorProof) => void;
  showSubmitButton?: boolean;
}

export function ProofsList({
  proofs,
  onProofPress,
  onSubmit,
  showSubmitButton = true,
}: ProofsListProps) {
  if (proofs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-outline" size={48} color="#CCC" />
        <Text style={styles.emptyText}>No proofs generated yet</Text>
        <Text style={styles.emptySubtext}>
          Generate your first proof using a sensor
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={proofs}
      keyExtractor={(item) => item.proofHash}
      renderItem={({ item }) => (
        <ProofItem
          proof={item}
          onPress={() => onProofPress?.(item)}
          onSubmit={() => onSubmit?.(item)}
          showSubmitButton={showSubmitButton}
        />
      )}
      contentContainerStyle={styles.list}
    />
  );
}

interface ProofItemProps {
  proof: SensorProof;
  onPress?: () => void;
  onSubmit?: () => void;
  showSubmitButton?: boolean;
}

function ProofItem({ proof, onPress, onSubmit, showSubmitButton }: ProofItemProps) {
  const sensorIcon = getSensorIcon(proof.sensorData.type);
  const timestamp = new Date(proof.sensorData.timestamp);

  return (
    <TouchableOpacity
      style={styles.proofCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.proofHeader}>
        <View style={styles.proofTitleContainer}>
          <Ionicons name={sensorIcon as any} size={20} color="#9945FF" />
          <View style={styles.proofInfo}>
            <Text style={styles.proofType}>{proof.sensorData.type.toUpperCase()}</Text>
            <Text style={styles.proofTime}>
              {timestamp.toLocaleDateString()} {timestamp.toLocaleTimeString()}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#CCC" />
      </View>

      <View style={styles.proofData}>
        <Text style={styles.dataLabel}>Data:</Text>
        <Text style={styles.dataValue} numberOfLines={2}>
          {formatProofData(proof.sensorData.type, proof.sensorData.data)}
        </Text>
      </View>

      <View style={styles.proofFooter}>
        <View style={styles.hashContainer}>
          <Text style={styles.hashLabel}>Proof Hash:</Text>
          <Text style={styles.hash} numberOfLines={1}>
            {proof.proofHash.slice(0, 16)}...
          </Text>
        </View>

        {showSubmitButton && onSubmit && (
          <TouchableOpacity style={styles.submitButton} onPress={onSubmit}>
            <Ionicons name="cloud-upload-outline" size={16} color="white" />
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function getSensorIcon(sensorType: string): string {
  const icons: Record<string, string> = {
    gps: 'location',
    accelerometer: 'fitness',
    gyroscope: 'compass',
    magnetometer: 'magnet',
    network_speed: 'wifi',
  };
  return icons[sensorType] || 'hardware-chip';
}

function formatProofData(sensorType: string, data: any): string {
  switch (sensorType) {
    case 'gps':
      return `Lat: ${data.latitude?.toFixed(6)}, Lng: ${data.longitude?.toFixed(6)}, Accuracy: ${data.accuracy}m`;
    case 'accelerometer':
      return `X: ${data.x?.toFixed(2)}, Y: ${data.y?.toFixed(2)}, Z: ${data.z?.toFixed(2)}`;
    default:
      return JSON.stringify(data).slice(0, 100);
  }
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  proofCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  proofHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  proofTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proofInfo: {
    flex: 1,
  },
  proofType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  proofTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  proofData: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  dataLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#333',
  },
  proofFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hashContainer: {
    flex: 1,
    marginRight: 12,
  },
  hashLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  hash: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9945FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});