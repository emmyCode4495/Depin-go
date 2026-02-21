import { StyleSheet, Text, View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { SensorCard } from '@/src/components/SensorCard';
import { useSensorProof } from '@/src/hooks/useSensorProof';
import { useMWA } from '@/src/context/MWAContext';
import { proofStorage } from '@/src/sdk/storage/ProofStorage';
import { SensorType } from '@/src/types';

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

  // Load proof counts on mount
  useEffect(() => {
    loadProofCounts();
  }, []);

  const loadProofCounts = async () => {
    const allProofs = await proofStorage.getAllProofs();
    const gpsCount = allProofs.filter(p => p.proof.sensorData.type === 'gps').length;
    const accelCount = allProofs.filter(p => p.proof.sensorData.type === 'accelerometer').length;
    
    setGpsProofCount(gpsCount);
    setAccelProofCount(accelCount);
  };

  // GPS Sensor Handlers
  const handleActivateGps = async () => {
    if (!isConnected) {
      Alert.alert(
        'Wallet Not Connected',
        'Please connect your wallet first from the Dashboard tab',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const hasPermission = await gpsProof.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'GPS access is required for location proofs');
        return;
      }
      setGpsActive(true);
      Alert.alert('GPS Active ✓', 'GPS sensor is now active. You can now generate proofs.');
    } catch (error) {
      Alert.alert('Error', `Failed to activate GPS: ${error}`);
      console.error('GPS activation error:', error);
    }
  };

  const handleDeactivateGps = () => {
    setGpsActive(false);
  };

  const handleGenerateGpsProof = async () => {
    if (!isConnected) {
      Alert.alert('Wallet Not Connected', 'Please connect your wallet first');
      return;
    }

    try {
      console.log('Starting GPS proof generation...');
      
      const proof = await gpsProof.generateLocationProof({
        minAccuracy: 50,
        includeAltitude: true,
        includeSpeed: true,
      });

      console.log('GPS proof generated:', proof);

      if (proof) {
        setLastGpsReading(proof.sensorData.data);
        await loadProofCounts();
        
        Alert.alert(
          'GPS Proof Generated ✓',
          `Location: ${proof.sensorData.data.latitude.toFixed(6)}, ${proof.sensorData.data.longitude.toFixed(6)}\n\n` +
          `Accuracy: ${proof.sensorData.data.accuracy?.toFixed(2)}m\n\n` +
          `Proof Hash: ${proof.proofHash.slice(0, 16)}...`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to generate GPS proof - no proof returned');
      }
    } catch (error: any) {
      console.error('GPS proof generation error:', error);
      Alert.alert(
        'GPS Proof Error',
        error?.message || 'Failed to generate GPS proof. Make sure location services are enabled.',
        [{ text: 'OK' }]
      );
    }
  };

  // Accelerometer Sensor Handlers
  const handleActivateAccel = async () => {
    if (!isConnected) {
      Alert.alert(
        'Wallet Not Connected',
        'Please connect your wallet first from the Dashboard tab',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const available = await accelProof.accelGenerator.isAvailable();
      if (!available) {
        Alert.alert('Not Available', 'Accelerometer not available on this device');
        return;
      }
      setAccelActive(true);
      Alert.alert('Accelerometer Active ✓', 'Accelerometer sensor is now active. You can now generate proofs.');
    } catch (error) {
      Alert.alert('Error', `Failed to activate accelerometer: ${error}`);
      console.error('Accelerometer activation error:', error);
    }
  };

  const handleDeactivateAccel = () => {
    setAccelActive(false);
  };

  const handleGenerateAccelProof = async () => {
    if (!isConnected) {
      Alert.alert('Wallet Not Connected', 'Please connect your wallet first');
      return;
    }

    try {
      Alert.alert('Detecting Movement', 'Move your device for 2 seconds...', [{ text: 'OK' }]);
      
      console.log('Starting accelerometer proof generation...');
      
      const proof = await accelProof.generateMovementProof({
        duration: 2000,
        samples: 20,
      });

      console.log('Accelerometer proof generated:', proof);

      if (proof) {
        setLastAccelReading(proof.sensorData.data);
        await loadProofCounts();
        
        const magnitude = proof.sensorData.data.magnitude?.toFixed(2) || 'N/A';
        Alert.alert(
          'Movement Proof Generated ✓',
          `Magnitude: ${magnitude}\n\n` +
          `X: ${proof.sensorData.data.x?.toFixed(2)}, ` +
          `Y: ${proof.sensorData.data.y?.toFixed(2)}, ` +
          `Z: ${proof.sensorData.data.z?.toFixed(2)}\n\n` +
          `Proof Hash: ${proof.proofHash.slice(0, 16)}...`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to generate movement proof - no proof returned');
      }
    } catch (error: any) {
      console.error('Accelerometer proof generation error:', error);
      Alert.alert(
        'Movement Proof Error',
        error?.message || 'Failed to generate movement proof',
        [{ text: 'OK' }]
      );
    }
  };

  // Show wallet connection warning if not connected
  if (!isConnected) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Sensor Management</Text>
        <Text style={styles.subtitle}>
          Activate sensors and generate cryptographically signed proofs
        </Text>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ Wallet Not Connected</Text>
          <Text style={styles.warningText}>
            You need to connect your wallet before generating sensor proofs.
          </Text>
          <Text style={styles.warningText}>
            Go to the Dashboard tab and tap "Connect Wallet" to get started.
          </Text>
        </View>

        {/* Show inactive sensors */}
        <SensorCard
          sensorType={SensorType.GPS}
          isActive={false}
          proofCount={gpsProofCount}
        />

        <SensorCard
          sensorType={SensorType.ACCELEROMETER}
          isActive={false}
          proofCount={accelProofCount}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Sensor Management</Text>
      <Text style={styles.subtitle}>
        Activate sensors and generate cryptographically signed proofs
      </Text>

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

      {/* Show loading indicator if generating GPS proof */}
      {gpsProof.isGenerating && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9945FF" />
          <Text style={styles.loadingText}>Generating GPS proof...</Text>
        </View>
      )}

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

      {/* Show loading indicator if generating accel proof */}
      {accelProof.isGenerating && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9945FF" />
          <Text style={styles.loadingText}>Generating movement proof...</Text>
        </View>
      )}

      {/* Stats Summary */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Total Proofs Generated</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{gpsProofCount}</Text>
            <Text style={styles.statLabel}>GPS</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{accelProofCount}</Text>
            <Text style={styles.statLabel}>Movement</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{gpsProofCount + accelProofCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💡 How It Works</Text>
        <Text style={styles.infoText}>
          1. Make sure your wallet is connected (Dashboard tab)
        </Text>
        <Text style={styles.infoText}>
          2. Tap "Activate" to enable a sensor
        </Text>
        <Text style={styles.infoText}>
          3. Tap "Generate Proof" to create a cryptographically signed proof
        </Text>
        <Text style={styles.infoText}>
          4. All proofs are stored locally and can be submitted to blockchain
        </Text>
        <Text style={styles.infoText}>
          5. Seed Vault ensures proofs can't be faked or spoofed
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9945FF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#E65100',
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    marginBottom: 8,
    lineHeight: 20,
  },
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#9945FF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9945FF',
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#9945FF',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#9945FF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
});