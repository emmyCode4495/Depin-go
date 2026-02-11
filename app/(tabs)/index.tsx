import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { useMWA } from '@/src/hooks/useMWA';
import { SensorManager } from '@/src/sdk/sensors/SensorManager';

export default function DashboardScreen() {
  const { walletAddress, isConnecting, connect, disconnect, isConnected } = useMWA();
  const [gpsData, setGpsData] = useState<any>(null);

  const handleConnect = async () => {
    try {
      await connect();
      Alert.alert('Success', 'Wallet connected!');
    } catch (error) {
      Alert.alert('Error', 'Failed to connect wallet');
    }
  };

  const handleGetGPS = async () => {
    const sensorManager = new SensorManager();
    const hasPermission = await sensorManager.requestPermissions();
    
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'GPS access is required');
      return;
    }

    const data = await sensorManager.getGPSData();
    setGpsData(data);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DePIN-Go Dashboard</Text>
      
      {/* Wallet Connection */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Wallet Status</Text>
        {isConnected ? (
          <>
            <Text style={styles.address}>
              {walletAddress?.toBase58().slice(0, 8)}...
              {walletAddress?.toBase58().slice(-8)}
            </Text>
            <TouchableOpacity style={styles.buttonSecondary} onPress={disconnect}>
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleConnect}
            disabled={isConnecting}
          >
            <Text style={styles.buttonText}>
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* GPS Test */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>GPS Sensor</Text>
        <TouchableOpacity style={styles.button} onPress={handleGetGPS}>
          <Text style={styles.buttonText}>Get GPS Data</Text>
        </TouchableOpacity>
        {gpsData && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataText}>
              Lat: {gpsData.data.latitude.toFixed(6)}
            </Text>
            <Text style={styles.dataText}>
              Lng: {gpsData.data.longitude.toFixed(6)}
            </Text>
            <Text style={styles.dataText}>
              Accuracy: {gpsData.data.accuracy}m
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#9945FF',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#9945FF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#666',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  address: {
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 12,
    color: '#666',
  },
  dataContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  dataText: {
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});