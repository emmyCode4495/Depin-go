// import {
//   StyleSheet,
//   Text,
//   View,
//   ScrollView,
//   Alert,
//   ActivityIndicator,
//   TouchableOpacity,
//   Dimensions,
// } from 'react-native';
// import { useState, useEffect } from 'react';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { SensorCard } from '@/src/components/SensorCard';
// import { useSensorProof } from '@/src/hooks/useSensorProof';
// import { useMWA } from '@/src/context/MWAContext';
// import { proofStorage } from '@/src/sdk/storage/ProofStorage';
// import { SensorType } from '@/src/types';

// const { width } = Dimensions.get('window');

// export default function SensorsScreen() {
//   const { isConnected } = useMWA();
//   const [gpsActive, setGpsActive] = useState(false);
//   const [accelActive, setAccelActive] = useState(false);
//   const [lastGpsReading, setLastGpsReading] = useState<any>(null);
//   const [lastAccelReading, setLastAccelReading] = useState<any>(null);
//   const [gpsProofCount, setGpsProofCount] = useState(0);
//   const [accelProofCount, setAccelProofCount] = useState(0);

//   const gpsProof = useSensorProof(SensorType.GPS);
//   const accelProof = useSensorProof(SensorType.ACCELEROMETER);

//   useEffect(() => {
//     loadProofCounts();
//   }, []);

//   const loadProofCounts = async () => {
//     const allProofs = await proofStorage.getAllProofs();
//     setGpsProofCount(allProofs.filter(p => p.proof.sensorData.type === 'gps').length);
//     setAccelProofCount(allProofs.filter(p => p.proof.sensorData.type === 'accelerometer').length);
//   };

//   // ── GPS Handlers ──────────────────────────────────────────────────────────

//   const handleActivateGps = async () => {
//     if (!isConnected) {
//       Alert.alert('Wallet Not Connected', 'Connect your wallet from the Dashboard tab first.');
//       return;
//     }
//     try {
//       const hasPermission = await gpsProof.requestPermissions();
//       if (!hasPermission) {
//         Alert.alert('Permission Denied', 'GPS access is required for location proofs.');
//         return;
//       }
//       setGpsActive(true);
//     } catch (error) {
//       Alert.alert('Error', `Failed to activate GPS: ${error}`);
//     }
//   };

//   const handleDeactivateGps = () => setGpsActive(false);

//   const handleGenerateGpsProof = async () => {
//     if (!isConnected) {
//       Alert.alert('Wallet Not Connected', 'Connect your wallet first.');
//       return;
//     }
//     try {
//       const proof = await gpsProof.generateLocationProof({
//         minAccuracy: 200,
//         includeAltitude: true,
//         includeSpeed: true,
//       });
//       if (proof) {
//         setLastGpsReading(proof.sensorData.data);
//         await loadProofCounts();
//         Alert.alert(
//           'GPS Proof Generated ✓',
//           `${proof.sensorData.data.latitude.toFixed(6)}, ${proof.sensorData.data.longitude.toFixed(6)}\n` +
//           `Accuracy: ±${proof.sensorData.data.accuracy?.toFixed(1)}m\n\n` +
//           `Hash: ${proof.proofHash.slice(0, 20)}...`,
//           [{ text: 'OK' }]
//         );
//       }
//     } catch (error: any) {
//       Alert.alert('GPS Error', error?.message || 'Failed to generate GPS proof.');
//     }
//   };

//   // ── Accelerometer Handlers ────────────────────────────────────────────────

//   const handleActivateAccel = async () => {
//     if (!isConnected) {
//       Alert.alert('Wallet Not Connected', 'Connect your wallet from the Dashboard tab first.');
//       return;
//     }
//     try {
//       const available = await accelProof.accelGenerator.isAvailable();
//       if (!available) {
//         Alert.alert('Not Available', 'Accelerometer not available on this device.');
//         return;
//       }
//       setAccelActive(true);
//     } catch (error) {
//       Alert.alert('Error', `Failed to activate accelerometer: ${error}`);
//     }
//   };

//   const handleDeactivateAccel = () => setAccelActive(false);

//   const handleGenerateAccelProof = async () => {
//     if (!isConnected) {
//       Alert.alert('Wallet Not Connected', 'Connect your wallet first.');
//       return;
//     }
//     try {
//       Alert.alert('Detecting Movement', 'Move your device for 2 seconds…', [{ text: 'OK' }]);
//       const proof = await accelProof.generateMovementProof({ duration: 2000, samples: 20 });
//       if (proof) {
//         setLastAccelReading(proof.sensorData.data);
//         await loadProofCounts();
//         Alert.alert(
//           'Movement Proof Generated ✓',
//           `Magnitude: ${proof.sensorData.data.magnitude?.toFixed(2) ?? 'N/A'}\n` +
//           `X: ${proof.sensorData.data.x?.toFixed(2)}  Y: ${proof.sensorData.data.y?.toFixed(2)}  Z: ${proof.sensorData.data.z?.toFixed(2)}\n\n` +
//           `Hash: ${proof.proofHash.slice(0, 20)}...`,
//           [{ text: 'OK' }]
//         );
//       }
//     } catch (error: any) {
//       Alert.alert('Motion Error', error?.message || 'Failed to generate movement proof.');
//     }
//   };

//   // ── Not connected view ────────────────────────────────────────────────────

//   if (!isConnected) {
//     return (
//       <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
//         <View style={styles.heroBg}>
//           <View style={styles.glowPurple} />
//           <View style={styles.glowGreen} />
//         </View>

//         <PageHeader />

//         {/* Warning card */}
//         <View style={styles.warningCard}>
//           <LinearGradient colors={['#FF4444', '#FF6B00']} style={styles.warningIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
//             <Ionicons name="warning" size={16} color="#fff" />
//           </LinearGradient>
//           <View style={styles.warningBody}>
//             <Text style={styles.warningTitle}>Wallet Not Connected</Text>
//             <Text style={styles.warningText}>
//               Connect your wallet from the Dashboard tab to activate sensors and generate proofs.
//             </Text>
//           </View>
//         </View>

//         {/* Inactive sensor cards */}
//         <SensorCard sensorType={SensorType.GPS} isActive={false} proofCount={gpsProofCount} />
//         <SensorCard sensorType={SensorType.ACCELEROMETER} isActive={false} proofCount={accelProofCount} />
//       </ScrollView>
//     );
//   }

//   // ── Connected view ────────────────────────────────────────────────────────

//   return (
//     <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
//       <View style={styles.heroBg}>
//         <View style={styles.glowPurple} />
//         <View style={styles.glowGreen} />
//       </View>

//       <PageHeader />

//       {/* GPS Sensor Card */}
//       <SensorCard
//         sensorType={SensorType.GPS}
//         isActive={gpsActive}
//         lastReading={lastGpsReading}
//         proofCount={gpsProofCount}
//         onActivate={handleActivateGps}
//         onDeactivate={handleDeactivateGps}
//         onGenerateProof={handleGenerateGpsProof}
//       />

//       {gpsProof.isGenerating && <LoadingCard label="Generating GPS proof…" />}

//       {/* Accelerometer Sensor Card */}
//       <SensorCard
//         sensorType={SensorType.ACCELEROMETER}
//         isActive={accelActive}
//         lastReading={lastAccelReading}
//         proofCount={accelProofCount}
//         onActivate={handleActivateAccel}
//         onDeactivate={handleDeactivateAccel}
//         onGenerateProof={handleGenerateAccelProof}
//       />

//       {accelProof.isGenerating && <LoadingCard label="Generating movement proof…" />}

//       {/* Stats summary */}
//       <Text style={styles.sectionLabel}>SESSION STATS</Text>
//       <View style={styles.statsRow}>
//         <StatChip icon="location" label="GPS" value={gpsProofCount} color="#14F195" />
//         <StatChip icon="fitness" label="Motion" value={accelProofCount} color="#F5A623" />
//         <StatChip icon="layers" label="Total" value={gpsProofCount + accelProofCount} color="#9945FF" />
//       </View>

//       {/* How it works */}
//       <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
//       <View style={styles.infoCard}>
//         {[
//           { icon: 'wallet-outline', text: 'Wallet connected via Mobile Wallet Adapter' },
//           { icon: 'radio-button-on', text: 'Tap Activate to enable a sensor' },
//           { icon: 'shield-checkmark-outline', text: 'Generate Proof creates a hardware-signed record' },
//           { icon: 'server-outline', text: 'Proofs are stored locally and ready for on-chain submission' },
//           { icon: 'lock-closed-outline', text: 'Seed Vault ensures proofs cannot be faked or spoofed' },
//         ].map((item, i) => (
//           <View key={i} style={[styles.infoRow, i === 4 && styles.infoRowLast]}>
//             <View style={styles.infoIconWrap}>
//               <Ionicons name={item.icon as any} size={14} color="#9945FF" />
//             </View>
//             <Text style={styles.infoText}>{item.text}</Text>
//           </View>
//         ))}
//       </View>
//     </ScrollView>
//   );
// }

// // ─── Sub-components ───────────────────────────────────────────────────────────

// function PageHeader() {
//   return (
//     <View style={styles.headerRow}>
//       <View>
//         <Text style={styles.pageTitle}>Sensors</Text>
//         <Text style={styles.pageSub}>Generate cryptographic sensor proofs</Text>
//       </View>
//       <View style={styles.seedVaultBadge}>
//         <LinearGradient colors={['#9945FF', '#14F195']} style={styles.seedVaultGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
//           <Ionicons name="hardware-chip" size={12} color="#fff" />
//         </LinearGradient>
//         <Text style={styles.seedVaultText}>Seed Vault</Text>
//       </View>
//     </View>
//   );
// }

// function LoadingCard({ label }: { label: string }) {
//   return (
//     <View style={styles.loadingCard}>
//       <ActivityIndicator size="small" color="#9945FF" />
//       <Text style={styles.loadingText}>{label}</Text>
//     </View>
//   );
// }

// function StatChip({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
//   return (
//     <View style={[styles.statChip, { borderColor: color + '33' }]}>
//       <Ionicons name={icon as any} size={16} color={color} />
//       <Text style={[styles.statValue, { color }]}>{value}</Text>
//       <Text style={styles.statLabel}>{label}</Text>
//     </View>
//   );
// }

// // ─── Styles ───────────────────────────────────────────────────────────────────

// const styles = StyleSheet.create({
//   root: {
//     flex: 1,
//     backgroundColor: '#080810',
//   },
//   scroll: {
//     paddingBottom: 48,
//   },

//   // Glow background (matches dashboard)
//   heroBg: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     height: 280,
//     overflow: 'hidden',
//   },
//   glowPurple: {
//     position: 'absolute',
//     top: -60,
//     left: -40,
//     width: 200,
//     height: 200,
//     borderRadius: 100,
//     backgroundColor: '#9945FF',
//     opacity: 0.15,
//     shadowColor: '#9945FF',
//     shadowOffset: { width: 0, height: 0 },
//     shadowOpacity: 1,
//     shadowRadius: 80,
//   },
//   glowGreen: {
//     position: 'absolute',
//     top: 10,
//     right: -60,
//     width: 160,
//     height: 160,
//     borderRadius: 80,
//     backgroundColor: '#14F195',
//     opacity: 0.10,
//     shadowColor: '#14F195',
//     shadowOffset: { width: 0, height: 0 },
//     shadowOpacity: 1,
//     shadowRadius: 80,
//   },

//   // Header
//   headerRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingTop: 56,
//     paddingBottom: 24,
//   },
//   pageTitle: {
//     fontSize: 28,
//     fontWeight: '900',
//     color: '#FFFFFF',
//     letterSpacing: -0.8,
//   },
//   pageSub: {
//     fontSize: 12,
//     color: '#444',
//     marginTop: 3,
//   },
//   seedVaultBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     backgroundColor: '#9945FF14',
//     borderRadius: 20,
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     borderWidth: 1,
//     borderColor: '#9945FF33',
//   },
//   seedVaultGrad: {
//     width: 20,
//     height: 20,
//     borderRadius: 6,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   seedVaultText: {
//     fontSize: 11,
//     color: '#9945FF',
//     fontWeight: '700',
//     letterSpacing: 0.3,
//   },

//   // Warning (not connected)
//   warningCard: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     gap: 14,
//     marginHorizontal: 16,
//     marginBottom: 20,
//     backgroundColor: '#FF440011',
//     borderRadius: 14,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: '#FF440033',
//   },
//   warningIcon: {
//     width: 32,
//     height: 32,
//     borderRadius: 10,
//     alignItems: 'center',
//     justifyContent: 'center',
//     flexShrink: 0,
//   },
//   warningBody: {
//     flex: 1,
//   },
//   warningTitle: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: '#FF6655',
//     marginBottom: 4,
//   },
//   warningText: {
//     fontSize: 13,
//     color: '#664444',
//     lineHeight: 19,
//   },

//   // Loading card
//   loadingCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//     marginHorizontal: 16,
//     marginBottom: 12,
//     backgroundColor: '#111118',
//     borderRadius: 12,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: '#9945FF44',
//   },
//   loadingText: {
//     fontSize: 14,
//     color: '#9945FF',
//     fontWeight: '600',
//   },

//   // Section label (matches dashboard)
//   sectionLabel: {
//     fontSize: 10,
//     fontWeight: '700',
//     color: '#444',
//     letterSpacing: 2,
//     paddingHorizontal: 20,
//     marginTop: 8,
//     marginBottom: 12,
//   },

//   // Stats
//   statsRow: {
//     flexDirection: 'row',
//     paddingHorizontal: 16,
//     gap: 10,
//     marginBottom: 28,
//   },
//   statChip: {
//     flex: 1,
//     backgroundColor: '#111118',
//     borderRadius: 14,
//     padding: 14,
//     alignItems: 'center',
//     gap: 6,
//     borderWidth: 1,
//   },
//   statValue: {
//     fontSize: 22,
//     fontWeight: '800',
//   },
//   statLabel: {
//     fontSize: 10,
//     color: '#444',
//     fontWeight: '600',
//     letterSpacing: 0.5,
//   },

//   // Info card
//   infoCard: {
//     marginHorizontal: 16,
//     backgroundColor: '#111118',
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: '#1C1C2E',
//     overflow: 'hidden',
//     marginBottom: 12,
//   },
//   infoRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 13,
//     borderBottomWidth: 1,
//     borderBottomColor: '#1A1A2E',
//   },
//   infoRowLast: {
//     borderBottomWidth: 0,
//   },
//   infoIconWrap: {
//     width: 28,
//     height: 28,
//     borderRadius: 8,
//     backgroundColor: '#9945FF18',
//     alignItems: 'center',
//     justifyContent: 'center',
//     flexShrink: 0,
//   },
//   infoText: {
//     fontSize: 13,
//     color: '#555',
//     flex: 1,
//     lineHeight: 19,
//   },
// });

import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SensorCard } from '@/src/components/SensorCard';
import { useSensorProof } from '@/src/hooks/useSensorProof';
import { useMWA } from '@/src/context/MWAContext';
import { proofStorage } from '@/src/sdk/storage/ProofStorage';
import { SensorType } from '@/src/types';

export default function SensorsScreen() {
  const { isConnected } = useMWA();

  // Active states per sensor
  const [gpsActive,     setGpsActive]     = useState(false);
  const [accelActive,   setAccelActive]   = useState(false);
  const [gyroActive,    setGyroActive]    = useState(false);
  const [magnetoActive, setMagnetoActive] = useState(false);
  const [baroActive,    setBaroActive]    = useState(false);
  const [netActive,     setNetActive]     = useState(false);

  // Last readings
  const [lastGps,     setLastGps]     = useState<any>(null);
  const [lastAccel,   setLastAccel]   = useState<any>(null);
  const [lastGyro,    setLastGyro]    = useState<any>(null);
  const [lastMagneto, setLastMagneto] = useState<any>(null);
  const [lastBaro,    setLastBaro]    = useState<any>(null);
  const [lastNet,     setLastNet]     = useState<any>(null);

  // Proof counts
  const [counts, setCounts] = useState({
    gps: 0, accelerometer: 0, gyroscope: 0,
    magnetometer: 0, barometer: 0, network_speed: 0,
  });

  const gpsProof     = useSensorProof(SensorType.GPS);
  const accelProof   = useSensorProof(SensorType.ACCELEROMETER);
  const gyroProof    = useSensorProof(SensorType.GYROSCOPE);
  const magnetoProof = useSensorProof(SensorType.MAGNETOMETER);
  const baroProof    = useSensorProof(SensorType.BAROMETER);
  const netProof     = useSensorProof(SensorType.NETWORK_SPEED);

  useEffect(() => { loadCounts(); }, []);

  const loadCounts = async () => {
    const all = await proofStorage.getAllProofs();
    setCounts({
      gps:           all.filter(p => p.proof.sensorData.type === 'gps').length,
      accelerometer: all.filter(p => p.proof.sensorData.type === 'accelerometer').length,
      gyroscope:     all.filter(p => p.proof.sensorData.type === 'gyroscope').length,
      magnetometer:  all.filter(p => p.proof.sensorData.type === 'magnetometer').length,
      barometer:     all.filter(p => p.proof.sensorData.type === 'barometer').length,
      network_speed: all.filter(p => p.proof.sensorData.type === 'network_speed').length,
    });
  };

  const notConnectedAlert = () =>
    Alert.alert('Wallet Not Connected', 'Connect your wallet from the Dashboard tab first.');

  // ── GPS ───────────────────────────────────────────────────────────────────
  const handleActivateGps = async () => {
    if (!isConnected) return notConnectedAlert();
    const ok = await gpsProof.requestPermissions();
    if (!ok) { Alert.alert('Permission Denied', 'GPS access required for location proofs.'); return; }
    setGpsActive(true);
  };
  const handleGenerateGpsProof = async () => {
    if (!isConnected) return notConnectedAlert();
    try {
      const proof = await gpsProof.generateLocationProof({ minAccuracy: 200, includeAltitude: true, includeSpeed: true });
      if (!proof) return;
      setLastGps(proof.sensorData.data);
      await loadCounts();
      const d = proof.sensorData.data as any;
      Alert.alert('GPS Proof ✓',
        `${d.latitude?.toFixed(6)}, ${d.longitude?.toFixed(6)}\nAccuracy: ±${d.accuracy?.toFixed(1)}m\n\nHash: ${proof.proofHash.slice(0, 20)}...`);
    } catch (e: any) { Alert.alert('GPS Error', e?.message || 'Failed to generate GPS proof.'); }
  };

  // ── Accelerometer ─────────────────────────────────────────────────────────
  const handleActivateAccel = async () => {
    if (!isConnected) return notConnectedAlert();
    const ok = await accelProof.accelGenerator.isAvailable();
    if (!ok) { Alert.alert('Not Available', 'Accelerometer not available on this device.'); return; }
    setAccelActive(true);
  };
  const handleGenerateAccelProof = async () => {
    if (!isConnected) return notConnectedAlert();
    Alert.alert('Move Device', 'Move your phone for 2 seconds…', [{ text: 'OK' }]);
    try {
      const proof = await accelProof.generateMovementProof({ duration: 2000, samples: 20 });
      if (!proof) return;
      setLastAccel(proof.sensorData.data);
      await loadCounts();
      const d = proof.sensorData.data as any;
      Alert.alert('Motion Proof ✓',
        `Magnitude: ${d.magnitude?.toFixed(3)}\nX: ${d.x?.toFixed(3)}  Y: ${d.y?.toFixed(3)}  Z: ${d.z?.toFixed(3)}\n\nHash: ${proof.proofHash.slice(0, 20)}...`);
    } catch (e: any) { Alert.alert('Motion Error', e?.message || 'Failed to generate motion proof.'); }
  };

  // ── Gyroscope ─────────────────────────────────────────────────────────────
  const handleActivateGyro = async () => {
    if (!isConnected) return notConnectedAlert();
    const ok = await gyroProof.gyroGenerator.isAvailable();
    if (!ok) { Alert.alert('Not Available', 'Gyroscope not available on this device.'); return; }
    setGyroActive(true);
  };
  const handleGenerateGyroProof = async () => {
    if (!isConnected) return notConnectedAlert();
    Alert.alert('Rotate Device', 'Rotate your phone for 1 second…', [{ text: 'OK' }]);
    try {
      const proof = await gyroProof.generateRotationProof({ duration: 1000, samples: 10 });
      if (!proof) return;
      setLastGyro(proof.sensorData.data);
      await loadCounts();
      const d = proof.sensorData.data as any;
      Alert.alert('Rotation Proof ✓',
        `Magnitude: ${d.magnitude?.toFixed(4)} rad/s\nX: ${d.x?.toFixed(4)}  Y: ${d.y?.toFixed(4)}  Z: ${d.z?.toFixed(4)}\n\nHash: ${proof.proofHash.slice(0, 20)}...`);
    } catch (e: any) { Alert.alert('Gyro Error', e?.message || 'Failed to generate rotation proof.'); }
  };

  // ── Magnetometer ──────────────────────────────────────────────────────────
  const handleActivateMagneto = async () => {
    if (!isConnected) return notConnectedAlert();
    const ok = await magnetoProof.magnetoGenerator.isAvailable();
    if (!ok) { Alert.alert('Not Available', 'Magnetometer not available on this device.'); return; }
    setMagnetoActive(true);
  };
  const handleGenerateMagnetoProof = async () => {
    if (!isConnected) return notConnectedAlert();
    try {
      const proof = await magnetoProof.generateMagneticProof({ samples: 8 });
      if (!proof) return;
      setLastMagneto(proof.sensorData.data);
      await loadCounts();
      const d = proof.sensorData.data as any;
      Alert.alert('Magnetic Proof ✓',
        `Field: ${d.magnitude?.toFixed(2)} µT\nHeading: ${d.heading?.toFixed(1)}°\n\nHash: ${proof.proofHash.slice(0, 20)}...`);
    } catch (e: any) { Alert.alert('Magnetometer Error', e?.message || 'Failed to generate magnetic proof.'); }
  };

  // ── Barometer ─────────────────────────────────────────────────────────────
  const handleActivateBaro = async () => {
    if (!isConnected) return notConnectedAlert();
    const ok = await baroProof.barometerGenerator.isAvailable();
    if (!ok) { Alert.alert('Not Available', 'Barometer not available on this device.'); return; }
    setBaroActive(true);
  };
  const handleGenerateBaroProof = async () => {
    if (!isConnected) return notConnectedAlert();
    try {
      const proof = await baroProof.generatePressureProof({ samples: 5 });
      if (!proof) return;
      setLastBaro(proof.sensorData.data);
      await loadCounts();
      const d = proof.sensorData.data as any;
      Alert.alert('Pressure Proof ✓',
        `Pressure: ${d.pressure?.toFixed(2)} hPa\n${d.weatherCondition}\n\nHash: ${proof.proofHash.slice(0, 20)}...`);
    } catch (e: any) { Alert.alert('Barometer Error', e?.message || 'Failed to generate pressure proof.'); }
  };

  // ── Network Speed ─────────────────────────────────────────────────────────
  const handleActivateNet = async () => {
    if (!isConnected) return notConnectedAlert();
    const ok = await netProof.networkGenerator.isAvailable();
    if (!ok) { Alert.alert('No Internet', 'Device has no internet connection.'); return; }
    setNetActive(true);
  };
  const handleGenerateNetProof = async () => {
    if (!isConnected) return notConnectedAlert();
    Alert.alert('Testing Network', 'Running speed test…', [{ text: 'OK' }]);
    try {
      const proof = await netProof.generateCoverageProof();
      if (!proof) return;
      setLastNet(proof.sensorData.data);
      await loadCounts();
      const d = proof.sensorData.data as any;
      Alert.alert('Coverage Proof ✓',
        `Download: ${d.downloadMbps} Mbps\nLatency: ${d.latencyMs}ms\nType: ${d.connectionType}\nRating: ${d.coverageRating}\n\nHash: ${proof.proofHash.slice(0, 20)}...`);
    } catch (e: any) { Alert.alert('Network Error', e?.message || 'Failed to generate coverage proof.'); }
  };

  const anyGenerating =
    gpsProof.isGenerating || accelProof.isGenerating || gyroProof.isGenerating ||
    magnetoProof.isGenerating || baroProof.isGenerating || netProof.isGenerating;

  const totalProofs = Object.values(counts).reduce((a, b) => a + b, 0);

  if (!isConnected) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
        <GlowBg />
        <PageHeader anyGenerating={false} />
        <View style={styles.warningCard}>
          <LinearGradient colors={['#FF4444', '#FF6B00']} style={styles.warningIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="warning" size={16} color="#fff" />
          </LinearGradient>
          <View style={styles.warningBody}>
            <Text style={styles.warningTitle}>Wallet Not Connected</Text>
            <Text style={styles.warningText}>Connect your wallet from the Dashboard tab to activate sensors.</Text>
          </View>
        </View>
        {ALL_TYPES.map(t => <SensorCard key={t} sensorType={t} isActive={false} proofCount={0} />)}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <GlowBg />
      <PageHeader anyGenerating={anyGenerating} />

      <SensorCard sensorType={SensorType.GPS} isActive={gpsActive} lastReading={lastGps}
        proofCount={counts.gps} onActivate={handleActivateGps}
        onDeactivate={() => setGpsActive(false)} onGenerateProof={handleGenerateGpsProof} />
      {gpsProof.isGenerating && <LoadingCard label="Acquiring GPS signal…" />}

      <SensorCard sensorType={SensorType.ACCELEROMETER} isActive={accelActive} lastReading={lastAccel}
        proofCount={counts.accelerometer} onActivate={handleActivateAccel}
        onDeactivate={() => setAccelActive(false)} onGenerateProof={handleGenerateAccelProof} />
      {accelProof.isGenerating && <LoadingCard label="Sampling motion…" />}

      <SensorCard sensorType={SensorType.GYROSCOPE} isActive={gyroActive} lastReading={lastGyro}
        proofCount={counts.gyroscope} onActivate={handleActivateGyro}
        onDeactivate={() => setGyroActive(false)} onGenerateProof={handleGenerateGyroProof} />
      {gyroProof.isGenerating && <LoadingCard label="Measuring rotation…" />}

      <SensorCard sensorType={SensorType.MAGNETOMETER} isActive={magnetoActive} lastReading={lastMagneto}
        proofCount={counts.magnetometer} onActivate={handleActivateMagneto}
        onDeactivate={() => setMagnetoActive(false)} onGenerateProof={handleGenerateMagnetoProof} />
      {magnetoProof.isGenerating && <LoadingCard label="Reading magnetic field…" />}

      <SensorCard sensorType={SensorType.BAROMETER} isActive={baroActive} lastReading={lastBaro}
        proofCount={counts.barometer} onActivate={handleActivateBaro}
        onDeactivate={() => setBaroActive(false)} onGenerateProof={handleGenerateBaroProof} />
      {baroProof.isGenerating && <LoadingCard label="Sampling pressure…" />}

      <SensorCard sensorType={SensorType.NETWORK_SPEED} isActive={netActive} lastReading={lastNet}
        proofCount={counts.network_speed} onActivate={handleActivateNet}
        onDeactivate={() => setNetActive(false)} onGenerateProof={handleGenerateNetProof} />
      {netProof.isGenerating && <LoadingCard label="Running speed test…" />}

      {/* Stats */}
      <Text style={styles.sectionLabel}>SESSION STATS</Text>
      <View style={styles.statsGrid}>
        <StatChip icon="location"    label="GPS"      value={counts.gps}           color="#14F195" />
        <StatChip icon="fitness"     label="Motion"   value={counts.accelerometer} color="#F5A623" />
        <StatChip icon="compass"     label="Gyro"     value={counts.gyroscope}     color="#9945FF" />
        <StatChip icon="magnet"      label="Magnetic" value={counts.magnetometer}  color="#FF6B9D" />
        <StatChip icon="thermometer" label="Pressure" value={counts.barometer}     color="#00C2FF" />
        <StatChip icon="wifi"        label="Coverage" value={counts.network_speed} color="#FFD700" />
      </View>

      <View style={styles.totalRow}>
        <LinearGradient colors={['#9945FF', '#14F195']} style={styles.totalBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="shield-checkmark" size={14} color="#fff" />
          <Text style={styles.totalText}>{totalProofs} total proofs generated</Text>
        </LinearGradient>
      </View>

      {/* Info */}
      <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
      <View style={styles.infoCard}>
        {INFO_STEPS.map((item, i) => (
          <View key={i} style={[styles.infoRow, i === INFO_STEPS.length - 1 && styles.infoRowLast]}>
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

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_TYPES = [
  SensorType.GPS, SensorType.ACCELEROMETER, SensorType.GYROSCOPE,
  SensorType.MAGNETOMETER, SensorType.BAROMETER, SensorType.NETWORK_SPEED,
];

const INFO_STEPS = [
  { icon: 'wallet-outline',           text: 'Wallet connected via Mobile Wallet Adapter' },
  { icon: 'radio-button-on',          text: 'Tap Activate to enable a sensor' },
  { icon: 'shield-checkmark-outline', text: 'Generate Proof creates a Seed Vault signed record' },
  { icon: 'server-outline',           text: 'Proofs stored locally and ready for on-chain submission' },
  { icon: 'globe-outline',            text: 'Network proofs = Proof of Coverage (Helium-style)' },
  { icon: 'rainy-outline',            text: 'Pressure proofs = Decentralised weather oracle (WeatherXM-style)' },
  { icon: 'lock-closed-outline',      text: 'All proofs hardware-signed — cannot be faked or spoofed' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function GlowBg() {
  return (
    <View style={styles.heroBg}>
      <View style={styles.glowPurple} />
      <View style={styles.glowGreen} />
    </View>
  );
}

function PageHeader({ anyGenerating }: { anyGenerating: boolean }) {
  return (
    <View style={styles.headerRow}>
      <View>
        <Text style={styles.pageTitle}>Sensors</Text>
        <Text style={styles.pageSub}>Generate cryptographic sensor proofs</Text>
      </View>
      <View style={styles.seedVaultBadge}>
        <LinearGradient colors={['#9945FF', '#14F195']} style={styles.seedVaultGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {anyGenerating
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="hardware-chip" size={12} color="#fff" />}
        </LinearGradient>
        <Text style={styles.seedVaultText}>{anyGenerating ? 'Signing…' : 'Seed Vault'}</Text>
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
      <Ionicons name={icon as any} size={14} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080810' },
  scroll: { paddingBottom: 48 },

  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 280, overflow: 'hidden' },
  glowPurple: {
    position: 'absolute', top: -60, left: -40, width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#9945FF', opacity: 0.15,
    shadowColor: '#9945FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 80,
  },
  glowGreen: {
    position: 'absolute', top: 10, right: -60, width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#14F195', opacity: 0.10,
    shadowColor: '#14F195', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 80,
  },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 24,
  },
  pageTitle: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.8 },
  pageSub: { fontSize: 12, color: '#444', marginTop: 3 },
  seedVaultBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#9945FF14', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#9945FF33',
  },
  seedVaultGrad: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  seedVaultText: { fontSize: 11, color: '#9945FF', fontWeight: '700', letterSpacing: 0.3 },

  warningCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: '#FF440011', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#FF440033',
  },
  warningIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  warningBody: { flex: 1 },
  warningTitle: { fontSize: 14, fontWeight: '700', color: '#FF6655', marginBottom: 4 },
  warningText: { fontSize: 13, color: '#664444', lineHeight: 19 },

  loadingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#111118', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#9945FF44',
  },
  loadingText: { fontSize: 14, color: '#9945FF', fontWeight: '600' },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#444', letterSpacing: 2,
    paddingHorizontal: 20, marginTop: 8, marginBottom: 12,
  },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  statChip: {
    width: '30%', flexGrow: 1, backgroundColor: '#111118', borderRadius: 12,
    padding: 12, alignItems: 'center', gap: 5, borderWidth: 1,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 9, color: '#444', fontWeight: '600', letterSpacing: 0.5 },

  totalRow: { alignItems: 'center', marginBottom: 28 },
  totalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  totalText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  infoCard: {
    marginHorizontal: 16, backgroundColor: '#111118',
    borderRadius: 16, borderWidth: 1, borderColor: '#1C1C2E', overflow: 'hidden', marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#9945FF18', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  infoText: { fontSize: 13, color: '#555', flex: 1, lineHeight: 19 },
});