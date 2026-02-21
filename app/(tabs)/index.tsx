import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMWA } from '@/src/context/MWAContext';
import { WalletConnect } from '@/src/components/WalletConnect';
import { proofStorage } from '@/src/sdk/storage/ProofStorage';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { walletAddress, isConnecting, connect, disconnect, isConnected } = useMWA();
  const [stats, setStats] = useState({ total: 0, pending: 0, submitted: 0 });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
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
            Alert.alert('Done', 'All proofs cleared.');
          },
        },
      ]
    );
  };

  const shortAddress = walletAddress
    ? walletAddress.toBase58().slice(0, 4) + '...' + walletAddress.toBase58().slice(-4)
    : null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#9945FF" />
      }
    >
      {/* ── Hero Glow Background ── */}
      <View style={styles.heroBg}>
        <View style={styles.glowPurple} />
        <View style={styles.glowGreen} />
      </View>

      {/* ── Wordmark ── */}
      <View style={styles.wordmarkRow}>
        <View style={styles.logoMark}>
          <LinearGradient colors={['#9945FF', '#14F195']} style={styles.logoGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="hardware-chip" size={16} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={styles.wordmark}>DePIN<Text style={styles.wordmarkAccent}>-Go</Text></Text>
        <View style={styles.networkBadge}>
          <View style={styles.networkDot} />
          <Text style={styles.networkLabel}>devnet</Text>
        </View>
      </View>

      {/* ── Hero Wallet Card ── */}
      <LinearGradient
        colors={['#1A0A2E', '#0A1628']}
        style={styles.walletCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* gradient border effect */}
        <LinearGradient
          colors={['#9945FF55', '#14F19555', '#9945FF22']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
        />
        <View style={styles.walletCardInner}>
          <View style={styles.walletTopRow}>
            <Text style={styles.walletLabel}>CONNECTED WALLET</Text>
            <View style={[styles.statusPill, { backgroundColor: isConnected ? '#14F19522' : '#FF444422' }]}>
              <View style={[styles.statusDot, { backgroundColor: isConnected ? '#14F195' : '#FF4444' }]} />
              <Text style={[styles.statusText, { color: isConnected ? '#14F195' : '#FF4444' }]}>
                {isConnected ? 'Active' : 'Offline'}
              </Text>
            </View>
          </View>

          {isConnected && shortAddress ? (
            <>
              <Text style={styles.walletAddress}>{shortAddress}</Text>
              <Text style={styles.walletNetwork}>Solana · Devnet</Text>
            </>
          ) : (
            <Text style={styles.walletEmpty}>No wallet connected</Text>
          )}

          <View style={styles.walletActions}>
            {isConnected ? (
              <TouchableOpacity style={styles.walletBtn} onPress={disconnect}>
                <Text style={styles.walletBtnText}>Disconnect</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={connect} disabled={isConnecting}>
                <LinearGradient
                  colors={['#9945FF', '#14F195']}
                  style={styles.connectBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.connectBtnText}>
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* ── Stats ── */}
      {isConnected && (
        <>
          <Text style={styles.sectionLabel}>OVERVIEW</Text>
          <View style={styles.statsRow}>
            <StatCard label="Total" value={stats.total} icon="layers" color="#9945FF" />
            <StatCard label="Pending" value={stats.pending} icon="time-outline" color="#F5A623" />
            <StatCard label="Submitted" value={stats.submitted} icon="checkmark-circle" color="#14F195" />
          </View>
        </>
      )}

      {/* ── Quick Actions ── */}
      {isConnected && (
        <>
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <View style={styles.actionsGrid}>
            <ActionTile
              icon="location"
              label="GPS Proof"
              color="#9945FF"
              onPress={() => router.push('/(tabs)/explore')}
            />
            <ActionTile
              icon="fitness"
              label="Movement"
              color="#14F195"
              onPress={() => router.push('/(tabs)/explore')}
            />
            <ActionTile
              icon="shield-checkmark"
              label="View Proofs"
              color="#F5A623"
              onPress={() => router.push('/(tabs)/proofs')}
            />
            <ActionTile
              icon="trash-outline"
              label="Clear All"
              color="#FF4444"
              onPress={handleClearStorage}
            />
          </View>
        </>
      )}

      {/* ── Getting Started ── */}
      {!isConnected && (
        <>
          <Text style={styles.sectionLabel}>GET STARTED</Text>
          {[
            { n: '01', title: 'Connect Wallet', body: 'Link your Solana wallet via Mobile Wallet Adapter' },
            { n: '02', title: 'Generate Proofs', body: 'Create hardware-signed sensor proofs via Seed Vault' },
            { n: '03', title: 'Build DePIN', body: 'Location, activity, and environment data — all verifiable on-chain' },
          ].map((s) => (
            <View key={s.n} style={styles.stepRow}>
              <LinearGradient colors={['#9945FF', '#14F195']} style={styles.stepNum} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.stepNumText}>{s.n}</Text>
              </LinearGradient>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepText}>{s.body}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {/* ── About ── */}
      <View style={styles.aboutCard}>
        <View style={styles.aboutHeader}>
          <LinearGradient colors={['#9945FF', '#14F195']} style={styles.aboutIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="information" size={14} color="#fff" />
          </LinearGradient>
          <Text style={styles.aboutTitle}>About DePIN-Go</Text>
        </View>
        <Text style={styles.aboutText}>
          Middleware SDK turning any Solana Mobile device into a verified sensor node.
          Hardware-backed signatures via Seed Vault ensure data cannot be faked or spoofed.
        </Text>
        <Text style={styles.aboutText}>
          Built for mapping, weather oracles, fitness tracking, and any DePIN app that needs
          verifiable physical-world data.
        </Text>
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <LinearGradient colors={['#9945FF', '#14F195']} style={styles.footerLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        <Text style={styles.footerText}>DePIN-Go SDK v1.0.0</Text>
        <Text style={styles.footerSub}>Built for Solana Mobile Hackathon 2025</Text>
      </View>
    </ScrollView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '33' }]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionTile({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.actionTile, { borderColor: color + '33' }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.actionIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={26} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
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

  // Glow background
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    overflow: 'hidden',
  },
  glowPurple: {
    position: 'absolute',
    top: -60,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#9945FF',
    opacity: 0.18,
    // blur-like effect via large shadow
    shadowColor: '#9945FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
  },
  glowGreen: {
    position: 'absolute',
    top: 20,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#14F195',
    opacity: 0.12,
    shadowColor: '#14F195',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
  },

  // Wordmark
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    gap: 10,
  },
  logoMark: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  logoGradient: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    flex: 1,
  },
  wordmarkAccent: {
    color: '#9945FF',
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#14F19514',
    borderWidth: 1,
    borderColor: '#14F19533',
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#14F195',
  },
  networkLabel: {
    fontSize: 11,
    color: '#14F195',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Wallet card
  walletCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    marginBottom: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#9945FF44',
  },
  walletCardInner: {
    padding: 22,
  },
  walletTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  walletAddress: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  walletNetwork: {
    fontSize: 13,
    color: '#555',
    marginBottom: 20,
  },
  walletEmpty: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  walletActions: {
    alignItems: 'flex-start',
  },
  walletBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  walletBtnText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  connectBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  connectBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Section label
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111118',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: '#444',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 28,
  },
  actionTile: {
    width: (width - 52) / 2,
    backgroundColor: '#111118',
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 13,
    color: '#CCC',
    fontWeight: '600',
  },

  // Steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    marginBottom: 14,
    gap: 16,
    backgroundColor: '#111118',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1C1C2E',
  },
  stepNum: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  stepBody: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EEE',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },

  // About
  aboutCard: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 28,
    backgroundColor: '#111118',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1C1C2E',
    gap: 12,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aboutIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EEE',
  },
  aboutText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingBottom: 12,
    gap: 8,
  },
  footerLine: {
    width: 48,
    height: 2,
    borderRadius: 1,
    marginBottom: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  footerSub: {
    fontSize: 11,
    color: '#2A2A2A',
  },
});