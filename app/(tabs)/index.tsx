import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMWA } from '@/src/context/MWAContext';
import { WalletConnect } from '@/src/components/WalletConnect';
import { ProofsList } from '@/src/components/ProofsList';
import { proofStorage } from '@/src/sdk/storage/ProofStorage';
import { SensorProof } from '@/src/types';

export default function DashboardScreen() {
  const { walletAddress, isConnecting, connect, disconnect, isConnected } = useMWA();
  const [proofs, setProofs] = useState<SensorProof[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    submitted: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load recent proofs (last 10)
      const allStoredProofs = await proofStorage.getAllProofs();
      const recentProofs = allStoredProofs
        .slice(-10)
        .reverse()
        .map(sp => sp.proof);
      
      setProofs(recentProofs);

      // Load stats
      const storageStats = await proofStorage.getStats();
      setStats({
        total: storageStats.totalProofs,
        pending: storageStats.pendingProofs,
        submitted: storageStats.submittedProofs,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleProofPress = (proof: SensorProof) => {
    const data = JSON.stringify(proof.sensorData.data, null, 2);
    Alert.alert(
      'Proof Details',
      `Type: ${proof.sensorData.type}\n\nData:\n${data}\n\nHash: ${proof.proofHash}`,
      [{ text: 'OK' }]
    );
  };

  const handleClearStorage = async () => {
    Alert.alert(
      'Clear All Proofs',
      'Are you sure you want to delete all stored proofs? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await proofStorage.clearAllProofs();
            await loadData();
            Alert.alert('Success', 'All proofs have been deleted');
          },
        },
      ]
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.title}>DePIN-Go Dashboard</Text>
      <Text style={styles.subtitle}>
        Decentralized Physical Infrastructure SDK
      </Text>

      {/* Wallet Connection Card */}
      <WalletConnect
        isConnected={isConnected}
        isConnecting={isConnecting}
        walletAddress={walletAddress}
        onConnect={connect}
        onDisconnect={disconnect}
        cluster="devnet"
      />

      {/* Stats Overview */}
      {isConnected && (
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Proofs</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.submitted}</Text>
              <Text style={styles.statLabel}>Submitted</Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      {isConnected && (
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Ionicons name="location" size={32} color="#9945FF" style={styles.actionIcon} />
              <Text style={styles.actionText}>Generate GPS Proof</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Ionicons name="fitness" size={32} color="#9945FF" style={styles.actionIcon} />
              <Text style={styles.actionText}>Track Movement</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleRefresh}
            >
              <Ionicons name="refresh" size={32} color="#9945FF" style={styles.actionIcon} />
              <Text style={styles.actionText}>Refresh Data</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleClearStorage}
            >
              <Ionicons name="trash-outline" size={32} color="#9945FF" style={styles.actionIcon} />
              <Text style={styles.actionText}>Clear Storage</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Recent Proofs */}
      {isConnected && (
        <View style={styles.proofsSection}>
          <Text style={styles.sectionTitle}>Recent Proofs</Text>
          {proofs.length > 0 ? (
            <ProofsList
              proofs={proofs}
              onProofPress={handleProofPress}
              showSubmitButton={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#CCC" style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No proofs yet</Text>
              <Text style={styles.emptySubtext}>
                Go to Sensors tab to generate your first proof
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Getting Started (when not connected) */}
      {!isConnected && (
        <View style={styles.gettingStarted}>
          <Text style={styles.sectionTitle}>Getting Started</Text>
          <View style={styles.stepCard}>
            <Text style={styles.stepNumber}>1</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Connect Your Wallet</Text>
              <Text style={styles.stepText}>
                Use Mobile Wallet Adapter to connect your Solana wallet
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <Text style={styles.stepNumber}>2</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Generate Proofs</Text>
              <Text style={styles.stepText}>
                Create cryptographically signed sensor proofs with Seed Vault
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <Text style={styles.stepNumber}>3</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Build DePIN Apps</Text>
              <Text style={styles.stepText}>
                Use the SDK to build location-based, activity-based, or any DePIN application
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* About Section */}
      <View style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>About DePIN-Go</Text>
        <Text style={styles.aboutText}>
          DePIN-Go is a middleware SDK that turns any Solana Mobile device into a verified 
          sensor node. It uses Seed Vault for hardware-backed cryptographic signatures, 
          ensuring sensor data cannot be faked or spoofed.
        </Text>
        <Text style={styles.aboutText}>
          Perfect for building Hivemapper-style mapping apps, weather oracles, fitness 
          trackers, and any DePIN application that needs verifiable sensor data.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>DePIN-Go SDK v1.0.0</Text>
        <Text style={styles.footerText}>Built for Solana Mobile Hackathon 2025</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#9945FF',
    marginTop: 20,
    marginHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9945FF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9F7FF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9945FF',
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  proofsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  gettingStarted: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9945FF',
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 40,
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  aboutCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 12,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});