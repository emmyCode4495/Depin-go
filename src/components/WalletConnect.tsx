/**
 * WalletConnect - Mobile Wallet Adapter connection component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PublicKey } from '@solana/web3.js';

interface WalletConnectProps {
  isConnected: boolean;
  isConnecting?: boolean;
  walletAddress?: PublicKey | null;
  onConnect: () => void;
  onDisconnect: () => void;
  cluster?: 'devnet' | 'mainnet-beta';
}

export function WalletConnect({
  isConnected,
  isConnecting = false,
  walletAddress,
  onConnect,
  onDisconnect,
  cluster = 'devnet',
}: WalletConnectProps) {
  if (isConnecting) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#9945FF" />
        <Text style={styles.connectingText}>Connecting to wallet...</Text>
        <Text style={styles.instructionText}>
          Please approve the connection in your Solana wallet app
        </Text>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="wallet-outline" size={48} color="#9945FF" />
        </View>

        <Text style={styles.title}>Connect Your Wallet</Text>
        <Text style={styles.description}>
          Connect your Solana Mobile wallet to generate cryptographically signed sensor
          proofs
        </Text>

        <TouchableOpacity style={styles.connectButton} onPress={onConnect}>
          <Ionicons name="link" size={20} color="white" />
          <Text style={styles.connectButtonText}>Connect Wallet</Text>
        </TouchableOpacity>

        <View style={styles.clusterBadge}>
          <View style={[styles.clusterDot, cluster === 'mainnet-beta' && styles.clusterDotMainnet]} />
          <Text style={styles.clusterText}>{cluster === 'devnet' ? 'Devnet' : 'Mainnet'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cardConnected}>
      <View style={styles.connectedHeader}>
        <View style={styles.statusContainer}>
          <View style={styles.connectedDot} />
          <Text style={styles.connectedLabel}>Connected</Text>
        </View>
        <TouchableOpacity onPress={onDisconnect} style={styles.disconnectButton}>
          <Ionicons name="close-circle-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.addressContainer}>
        <Text style={styles.addressLabel}>Wallet Address</Text>
        <View style={styles.addressRow}>
          <Text style={styles.address} numberOfLines={1}>
            {walletAddress?.toBase58()}
          </Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => {
              // Copy to clipboard
              console.log('Copy address');
            }}
          >
            <Ionicons name="copy-outline" size={16} color="#9945FF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.clusterBadge}>
        <View style={[styles.clusterDot, cluster === 'mainnet-beta' && styles.clusterDotMainnet]} />
        <Text style={styles.clusterText}>{cluster === 'devnet' ? 'Devnet' : 'Mainnet'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  cardConnected: {
    backgroundColor: '#F9F7FF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#9945FF',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9945FF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  connectingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  connectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  connectedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  disconnectButton: {
    padding: 4,
  },
  addressContainer: {
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  address: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#333',
  },
  copyButton: {
    padding: 4,
  },
  clusterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginTop: 12,
  },
  clusterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9800',
  },
  clusterDotMainnet: {
    backgroundColor: '#4CAF50',
  },
  clusterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
});