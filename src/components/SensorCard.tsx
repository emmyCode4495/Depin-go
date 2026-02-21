/**
 * SensorCard - Display sensor information and controls
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SensorType } from '@/src/types';

interface SensorCardProps {
  sensorType: SensorType | string;
  isActive?: boolean;
  lastReading?: any;
  proofCount?: number;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onGenerateProof?: () => void;
}

export function SensorCard({
  sensorType,
  isActive = false,
  lastReading,
  proofCount = 0,
  onActivate,
  onDeactivate,
  onGenerateProof,
}: SensorCardProps) {
  const sensorConfig = getSensorConfig(sensorType);

  return (
    <View style={[styles.card, isActive && styles.cardActive]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons
            name={sensorConfig.icon as any}
            size={24}
            color={isActive ? '#9945FF' : '#666'}
          />
          <Text style={styles.title}>{sensorConfig.name}</Text>
        </View>
        <View style={[styles.statusBadge, isActive && styles.statusBadgeActive]}>
          <Text style={[styles.statusText, isActive && styles.statusTextActive]}>
            {isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{sensorConfig.description}</Text>

      {/* Last Reading */}
      {lastReading && (
        <View style={styles.readingContainer}>
          <Text style={styles.readingLabel}>Last Reading:</Text>
          <Text style={styles.readingValue}>{formatReading(sensorType, lastReading)}</Text>
        </View>
      )}

      {/* Proof Count */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{proofCount}</Text>
          <Text style={styles.statLabel}>Proofs</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {!isActive ? (
          <TouchableOpacity style={styles.button} onPress={onActivate}>
            <Text style={styles.buttonText}>Activate</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.buttonSecondary} onPress={onDeactivate}>
              <Text style={styles.buttonTextSecondary}>Deactivate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={onGenerateProof}>
              <Text style={styles.buttonText}>Generate Proof</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function getSensorConfig(sensorType: string) {
  const configs: Record<
    string,
    { name: string; icon: string; description: string }
  > = {
    gps: {
      name: 'GPS Location',
      icon: 'location',
      description: 'Track location with cryptographic proof',
    },
    accelerometer: {
      name: 'Accelerometer',
      icon: 'fitness',
      description: 'Detect movement and physical activity',
    },
    gyroscope: {
      name: 'Gyroscope',
      icon: 'compass',
      description: 'Measure device orientation',
    },
    magnetometer: {
      name: 'Magnetometer',
      icon: 'magnet',
      description: 'Detect magnetic fields',
    },
    network_speed: {
      name: 'Network Speed',
      icon: 'wifi',
      description: 'Measure network connectivity',
    },
  };

  return (
    configs[sensorType] || {
      name: 'Unknown Sensor',
      icon: 'hardware-chip',
      description: 'Sensor description',
    }
  );
}

function formatReading(sensorType: string, reading: any): string {
  switch (sensorType) {
    case 'gps':
      return `${reading.latitude?.toFixed(6)}, ${reading.longitude?.toFixed(6)}`;
    case 'accelerometer':
      return `X: ${reading.x?.toFixed(2)}, Y: ${reading.y?.toFixed(2)}, Z: ${reading.z?.toFixed(2)}`;
    default:
      return JSON.stringify(reading);
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  cardActive: {
    borderColor: '#9945FF',
    backgroundColor: '#F9F7FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E5E5E5',
  },
  statusBadgeActive: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  statusTextActive: {
    color: '#4CAF50',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  readingContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  readingLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  readingValue: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
    marginRight: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9945FF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    backgroundColor: '#9945FF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9945FF',
  },
  buttonTextSecondary: {
    color: '#9945FF',
    fontSize: 14,
    fontWeight: '600',
  },
});