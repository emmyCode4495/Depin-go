import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SensorCard } from '@/src/components/SensorCard';
import { useSensorProof } from '@/src/hooks/useSensorProof';
import { useMWA } from '@/src/context/MWAContext';
import { proofStorage } from '@/src/sdk/storage/ProofStorage';
import { SensorType } from '@/src/types';

const { width } = Dimensions.get('window');

export default function SensorsScreen() {
  const { isConnected } = useMWA();
  const [gpsActive, setGpsActive] = useState(false);
  const [accelActive, setAccelActive] = useState(false);
  const [lastGpsReading, setLastGpsReading] = useState<any>(null);
  const [lastAccelReading, setLastAccelReading] = useState<any>(null);
  const [gpsProofCount, setGpsProofCount] = useState(0);
  const [accelProofCount, setAccelProofCount] = useState(0);

  const gpsProof = useSensorProof(SensorType.GPS);
  const accelProof = useSensorProof(SensorType.ACCELEROMETER);

  useEffect(() => {
    loadProofCounts();
  }, []);

  const loadProofCounts = async () => {
    const allProofs = await proofStorage.getAllProofs();
    setGpsProofCount(allProofs.filter(p => p.proof.sensorData.type === 'gps').length);
    setAccelProofCount(allProofs.filter(p => p.proof.sensorData.type === 'accelerometer').length);
  };

  // ── GPS Handlers ──────────────────────────────────────────────────────────

  const handleActivateGps = async () => {
    if (!isConnected) {
      Alert.alert('Wallet Not Connected', 'Connect your wallet from the Dashboard tab first.');
      return;
    }
    try {
      const hasPermission = await gpsProof.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'GPS access is required for location proofs.');
        return;
      }
      setGpsActive(true);
    } catch (error) {
      Alert.alert('Error', `Failed to activate GPS: ${error}`);
    }
  };

  const handleDeactivateGps = () => setGpsActive(false);

  const handleGenerateGpsProof = async () => {
    if (!isConnected) {
      Alert.alert('Wallet Not Connected', 'Connect your wallet first.');
      return;
    }
    try {
      const proof = await gpsProof.generateLocationProof({
        minAccuracy: 200,
        includeAltitude: true,
        includeSpeed: true,
      });
      if (proof) {
        setLastGpsReading(proof.sensorData.data);
        await loadProofCounts();
        Alert.alert(
          'GPS Proof Generated ✓',
          `${proof.sensorData.data.latitude.toFixed(6)}, ${proof.sensorData.data.longitude.toFixed(6)}\n` +
          `Accuracy: ±${proof.sensorData.data.accuracy?.toFixed(1)}m\n\n` +
          `Hash: ${proof.proofHash.slice(0, 20)}...`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('GPS Error', error?.message || 'Failed to generate GPS proof.');
    }
  };

  // ── Accelerometer Handlers ────────────────────────────────────────────────

  const handleActivateAccel = async () => {
    if (!isConnected) {
      Alert.alert('Wallet Not Connected', 'Connect your wallet from the Dashboard tab first.');
      return;
    }
    try {
      const available = await accelProof.accelGenerator.isAvailable();
      if (!available) {
        Alert.alert('Not Available', 'Accelerometer not available on this device.');
        return;
      }
      setAccelActive(true);
    } catch (error) {
      Alert.alert('Error', `Failed to activate accelerometer: ${error}`);
    }
  };

  const handleDeactivateAccel = () => setAccelActive(false);

  const handleGenerateAccelProof = async () => {
    if (!isConnected) {
      Alert.alert('Wallet Not Connected', 'Connect your wallet first.');
      return;
    }
    try {
      Alert.alert('Detecting Movement', 'Move your device for 2 seconds…', [{ text: 'OK' }]);
      const proof = await accelProof.generateMovementProof({ duration: 2000, samples: 20 });
      if (proof) {
        setLastAccelReading(proof.sensorData.data);
        await loadProofCounts();
        Alert.alert(
          'Movement Proof Generated ✓',
          `Magnitude: ${proof.sensorData.data.magnitude?.toFixed(2) ?? 'N/A'}\n` +
          `X: ${proof.sensorData.data.x?.toFixed(2)}  Y: ${proof.sensorData.data.y?.toFixed(2)}  Z: ${proof.sensorData.data.z?.toFixed(2)}\n\n` +
          `Hash: ${proof.proofHash.slice(0, 20)}...`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Motion Error', error?.message || 'Failed to generate movement proof.');
    }
  };

  // ── Not connected view ────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
        <View style={styles.heroBg}>
          <View style={styles.glowPurple} />
          <View style={styles.glowGreen} />
        </View>

        <PageHeader />

        {/* Warning card */}
        <View style={styles.warningCard}>
          <LinearGradient colors={['#FF4444', '#FF6B00']} style={styles.warningIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="warning" size={16} color="#fff" />
          </LinearGradient>
          <View style={styles.warningBody}>
            <Text style={styles.warningTitle}>Wallet Not Connected</Text>
            <Text style={styles.warningText}>
              Connect your wallet from the Dashboard tab to activate sensors and generate proofs.
            </Text>
          </View>
        </View>

        {/* Inactive sensor cards */}
        <SensorCard sensorType={SensorType.GPS} isActive={false} proofCount={gpsProofCount} />
        <SensorCard sensorType={SensorType.ACCELEROMETER} isActive={false} proofCount={accelProofCount} />
      </ScrollView>
    );
  }

  // ── Connected view ────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <View style={styles.heroBg}>
        <View style={styles.glowPurple} />
        <View style={styles.glowGreen} />
      </View>

      <PageHeader />

      {/* GPS Sensor Card */}
      <SensorCard
        sensorType={SensorType.GPS}
        isActive={gpsActive}
        lastReading={lastGpsReading}
        proofCount={gpsProofCount}
        onActivate={handleActivateGps}
        onDeactivate={handleDeactivateGps}
        onGenerateProof={handleGenerateGpsProof}
      />

      {gpsProof.isGenerating && <LoadingCard label="Generating GPS proof…" />}

      {/* Accelerometer Sensor Card */}
      <SensorCard
        sensorType={SensorType.ACCELEROMETER}
        isActive={accelActive}
        lastReading={lastAccelReading}
        proofCount={accelProofCount}
        onActivate={handleActivateAccel}
        onDeactivate={handleDeactivateAccel}
        onGenerateProof={handleGenerateAccelProof}
      />

      {accelProof.isGenerating && <LoadingCard label="Generating movement proof…" />}

      {/* Stats summary */}
      <Text style={styles.sectionLabel}>SESSION STATS</Text>
      <View style={styles.statsRow}>
        <StatChip icon="location" label="GPS" value={gpsProofCount} color="#14F195" />
        <StatChip icon="fitness" label="Motion" value={accelProofCount} color="#F5A623" />
        <StatChip icon="layers" label="Total" value={gpsProofCount + accelProofCount} color="#9945FF" />
      </View>

      {/* How it works */}
      <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
      <View style={styles.infoCard}>
        {[
          { icon: 'wallet-outline', text: 'Wallet connected via Mobile Wallet Adapter' },
          { icon: 'radio-button-on', text: 'Tap Activate to enable a sensor' },
          { icon: 'shield-checkmark-outline', text: 'Generate Proof creates a hardware-signed record' },
          { icon: 'server-outline', text: 'Proofs are stored locally and ready for on-chain submission' },
          { icon: 'lock-closed-outline', text: 'Seed Vault ensures proofs cannot be faked or spoofed' },
        ].map((item, i) => (
          <View key={i} style={[styles.infoRow, i === 4 && styles.infoRowLast]}>
            <View style={styles.infoIconWrap}>
              <Ionicons name={item.icon as any} size={14} color="#9945FF" />
            </View>
            <Text style={styles.infoText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <View style={styles.headerRow}>
      <View>
        <Text style={styles.pageTitle}>Sensors</Text>
        <Text style={styles.pageSub}>Generate cryptographic sensor proofs</Text>
      </View>
      <View style={styles.seedVaultBadge}>
        <LinearGradient colors={['#9945FF', '#14F195']} style={styles.seedVaultGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name="hardware-chip" size={12} color="#fff" />
        </LinearGradient>
        <Text style={styles.seedVaultText}>Seed Vault</Text>
      </View>
    </View>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <View style={styles.loadingCard}>
      <ActivityIndicator size="small" color="#9945FF" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

function StatChip({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={[styles.statChip, { borderColor: color + '33' }]}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080810',
  },
  scroll: {
    paddingBottom: 48,
  },

  // Glow background (matches dashboard)
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    overflow: 'hidden',
  },
  glowPurple: {
    position: 'absolute',
    top: -60,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#9945FF',
    opacity: 0.15,
    shadowColor: '#9945FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
  },
  glowGreen: {
    position: 'absolute',
    top: 10,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#14F195',
    opacity: 0.10,
    shadowColor: '#14F195',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  pageSub: {
    fontSize: 12,
    color: '#444',
    marginTop: 3,
  },
  seedVaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#9945FF14',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#9945FF33',
  },
  seedVaultGrad: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seedVaultText: {
    fontSize: 11,
    color: '#9945FF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Warning (not connected)
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#FF440011',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FF440033',
  },
  warningIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  warningBody: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6655',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#664444',
    lineHeight: 19,
  },

  // Loading card
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#111118',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#9945FF44',
  },
  loadingText: {
    fontSize: 14,
    color: '#9945FF',
    fontWeight: '600',
  },

  // Section label (matches dashboard)
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 28,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#111118',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: '#444',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Info card
  infoCard: {
    marginHorizontal: 16,
    backgroundColor: '#111118',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1C1C2E',
    overflow: 'hidden',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#9945FF18',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    flex: 1,
    lineHeight: 19,
  },
});