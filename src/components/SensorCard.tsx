/**
 * SensorCard - Display sensor information and controls
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  const config = getSensorConfig(sensorType);
  const accentColor = sensorType === 'gps' ? '#14F195' : '#F5A623';

  return (
    <View style={[
      styles.card,
      isActive && { borderColor: accentColor + '55' },
      { marginHorizontal: 16, marginBottom: 12 }
    ]}>
      {/* Active glow strip */}
      {isActive && (
        <LinearGradient
          colors={[accentColor + '22', 'transparent']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          pointerEvents="none"
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: accentColor + '18' }]}>
          <Ionicons name={config.icon as any} size={20} color={isActive ? accentColor : '#444'} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{config.name}</Text>
          <Text style={styles.description}>{config.description}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: isActive ? accentColor + '20' : '#1A1A2E' }]}>
          <View style={[styles.statusDot, { backgroundColor: isActive ? accentColor : '#333' }]} />
          <Text style={[styles.statusText, { color: isActive ? accentColor : '#444' }]}>
            {isActive ? 'Active' : 'Idle'}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Last Reading */}
      {lastReading && (
        <View style={styles.readingBox}>
          <Text style={styles.readingLabel}>LAST READING</Text>
          <Text style={styles.readingValue}>{formatReading(sensorType, lastReading)}</Text>
        </View>
      )}

      {/* Proof count */}
      <View style={styles.proofRow}>
        <Ionicons name="shield-checkmark-outline" size={13} color="#9945FF" />
        <Text style={styles.proofCount}>{proofCount}</Text>
        <Text style={styles.proofLabel}>proof{proofCount !== 1 ? 's' : ''} generated</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {!isActive ? (
          <TouchableOpacity style={styles.activateBtn} onPress={onActivate} activeOpacity={0.8}>
            <LinearGradient
              colors={['#9945FF', accentColor]}
              style={styles.activateBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="power" size={15} color="#fff" />
              <Text style={styles.activateBtnText}>Activate</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.deactivateBtn} onPress={onDeactivate} activeOpacity={0.8}>
              <Ionicons name="power" size={14} color="#555" />
              <Text style={styles.deactivateBtnText}>Deactivate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.generateBtn} onPress={onGenerateProof} activeOpacity={0.8}>
              <LinearGradient
                colors={['#9945FF', accentColor]}
                style={styles.generateBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="shield-checkmark" size={15} color="#fff" />
                <Text style={styles.generateBtnText}>Generate Proof</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Config ───────────────────────────────────────────────────────────────────

function getSensorConfig(sensorType: string) {
  const configs: Record<string, { name: string; icon: string; description: string }> = {
    gps: {
      name: 'GPS Location',
      icon: 'location',
      description: 'Signed location proof via satellite',
    },
    accelerometer: {
      name: 'Accelerometer',
      icon: 'fitness',
      description: 'Detect and prove physical movement',
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

  return configs[sensorType] || { name: 'Unknown Sensor', icon: 'hardware-chip', description: 'Sensor data' };
}

function formatReading(sensorType: string, reading: any): string {
  switch (sensorType) {
    case 'gps':
      return `${reading.latitude?.toFixed(6)},  ${reading.longitude?.toFixed(6)}`;
    case 'accelerometer':
      return `x ${reading.x?.toFixed(3)}   y ${reading.y?.toFixed(3)}   z ${reading.z?.toFixed(3)}`;
    default:
      return JSON.stringify(reading).slice(0, 80);
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111118',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1C1C2E',
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EEE',
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 12,
    color: '#444',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#1A1A2E',
    marginBottom: 14,
  },

  // Reading
  readingBox: {
    backgroundColor: '#0D0D18',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1C1C30',
  },
  readingLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  readingValue: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#9945FF',
    letterSpacing: 0.5,
  },

  // Proof count
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 16,
  },
  proofCount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9945FF',
  },
  proofLabel: {
    fontSize: 12,
    color: '#444',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  activateBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activateBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
  },
  activateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  deactivateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    backgroundColor: '#0D0D18',
  },
  deactivateBtnText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
  },
  generateBtn: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  generateBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});