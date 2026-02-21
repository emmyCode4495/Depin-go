import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { proofStorage } from '@/src/sdk/storage/ProofStorage';
import { SensorProof } from '@/src/types';

type FilterType = 'all' | 'gps' | 'accelerometer';

const FILTER_OPTIONS: { label: string; value: FilterType; icon: string }[] = [
  { label: 'All', value: 'all', icon: 'layers-outline' },
  { label: 'GPS', value: 'gps', icon: 'location-outline' },
  { label: 'Motion', value: 'accelerometer', icon: 'fitness-outline' },
];

export default function ProofsScreen() {
  const [proofs, setProofs] = useState<SensorProof[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProof, setSelectedProof] = useState<SensorProof | null>(null);
  const [stats, setStats] = useState({ total: 0, gps: 0, accel: 0 });

  useEffect(() => {
    loadProofs();
  }, []);

  const loadProofs = async () => {
    try {
      const stored = await proofStorage.getAllProofs();
      const all = stored.map((sp) => sp.proof).reverse();
      setProofs(all);
      setStats({
        total: all.length,
        gps: all.filter((p) => p.sensorData.type === 'gps').length,
        accel: all.filter((p) => p.sensorData.type === 'accelerometer').length,
      });
    } catch (e) {
      console.error('Failed to load proofs:', e);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProofs();
    setRefreshing(false);
  };

  const handleDelete = (proof: SensorProof) => {
    Alert.alert('Delete Proof', 'Remove this proof from local storage?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await proofStorage.deleteProof(proof.proofHash);
          setSelectedProof(null);
          await loadProofs();
        },
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Clear All Proofs', 'Delete every stored proof? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All',
        style: 'destructive',
        onPress: async () => {
          await proofStorage.clearAllProofs();
          await loadProofs();
        },
      },
    ]);
  };

  const filtered = proofs.filter((p) => {
    if (filter === 'all') return true;
    return p.sensorData.type === filter;
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Proof Archive</Text>
          <Text style={styles.headerSub}>Cryptographically signed sensor records</Text>
        </View>
        {proofs.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll}>
            <Ionicons name="trash-outline" size={18} color="#FF4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatChip icon="layers" label="Total" value={stats.total} color="#9945FF" />
        <StatChip icon="location" label="GPS" value={stats.gps} color="#14F195" />
        <StatChip icon="fitness" label="Motion" value={stats.accel} color="#F5A623" />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.filterChip, filter === opt.value && styles.filterChipActive]}
            onPress={() => setFilter(opt.value)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={opt.icon as any}
              size={14}
              color={filter === opt.value ? '#fff' : '#888'}
            />
            <Text style={[styles.filterLabel, filter === opt.value && styles.filterLabelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.proofHash}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#9945FF" />
        }
        ListEmptyComponent={<EmptyState filter={filter} />}
        renderItem={({ item, index }) => (
          <ProofCard
            proof={item}
            index={index}
            onPress={() => setSelectedProof(item)}
          />
        )}
      />

      {/* Detail Modal */}
      <Modal
        visible={!!selectedProof}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedProof(null)}
      >
        {selectedProof && (
          <ProofDetailSheet
            proof={selectedProof}
            onClose={() => setSelectedProof(null)}
            onDelete={() => handleDelete(selectedProof)}
          />
        )}
      </Modal>
    </View>
  );
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────

function StatChip({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.statChip, { borderColor: color + '33' }]}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Proof Card ───────────────────────────────────────────────────────────────

function ProofCard({
  proof,
  index,
  onPress,
}: {
  proof: SensorProof;
  index: number;
  onPress: () => void;
}) {
  const isGps = proof.sensorData.type === 'gps';
  const ts = new Date(proof.sensorData.timestamp);
  const accentColor = isGps ? '#14F195' : '#F5A623';
  const icon = isGps ? 'location' : 'fitness';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.82}>
      {/* Left accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />

      <View style={styles.cardBody}>
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={[styles.iconBadge, { backgroundColor: accentColor + '22' }]}>
            <Ionicons name={icon as any} size={18} color={accentColor} />
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.cardType}>
              {isGps ? 'GPS Location' : 'Movement'}
            </Text>
            <Text style={styles.cardTime}>
              {ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {'  '}
              {ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#555" />
        </View>

        {/* Data preview */}
        <Text style={styles.cardData} numberOfLines={1}>
          {formatPreview(proof.sensorData.type, proof.sensorData.data)}
        </Text>

        {/* Hash */}
        <View style={styles.hashRow}>
          <View style={styles.hashDot} />
          <Text style={styles.hashText}>{proof.proofHash.slice(0, 24)}...</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

function ProofDetailSheet({
  proof,
  onClose,
  onDelete,
}: {
  proof: SensorProof;
  onClose: () => void;
  onDelete: () => void;
}) {
  const isGps = proof.sensorData.type === 'gps';
  const ts = new Date(proof.sensorData.timestamp);
  const accentColor = isGps ? '#14F195' : '#F5A623';

  return (
    <View style={styles.sheet}>
      {/* Sheet header */}
      <View style={styles.sheetHeader}>
        <TouchableOpacity onPress={onClose} style={styles.sheetClose}>
          <Ionicons name="close" size={22} color="#aaa" />
        </TouchableOpacity>
        <Text style={styles.sheetTitle}>Proof Details</Text>
        <TouchableOpacity onPress={onDelete} style={styles.sheetDelete}>
          <Ionicons name="trash-outline" size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.sheetScroll}>
        {/* Type badge */}
        <View style={[styles.typeBadge, { borderColor: accentColor }]}>
          <Ionicons
            name={isGps ? 'location' : 'fitness'}
            size={20}
            color={accentColor}
          />
          <Text style={[styles.typeBadgeText, { color: accentColor }]}>
            {isGps ? 'GPS Location Proof' : 'Movement Proof'}
          </Text>
        </View>

        {/* Timestamp */}
        <DetailSection title="Timestamp">
          <DetailRow label="Date" value={ts.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
          <DetailRow label="Time" value={ts.toLocaleTimeString()} />
          <DetailRow label="Unix" value={proof.sensorData.timestamp.toString()} mono />
        </DetailSection>

        {/* Sensor Data */}
        <DetailSection title="Sensor Data">
          {Object.entries(proof.sensorData.data).map(([key, val]) => (
            val !== null && val !== undefined ? (
              <DetailRow
                key={key}
                label={key}
                value={typeof val === 'number' ? val.toFixed(6) : String(val)}
                mono
              />
            ) : null
          ))}
        </DetailSection>

        {/* Cryptographic Proof */}
        <DetailSection title="Cryptographic Proof">
          <DetailRow label="Device ID" value={proof.sensorData.deviceId} mono />
          <View style={styles.detailBlock}>
            <Text style={styles.detailBlockLabel}>Proof Hash</Text>
            <Text style={styles.detailBlockValue}>{proof.proofHash}</Text>
          </View>
          <View style={styles.detailBlock}>
            <Text style={styles.detailBlockLabel}>Public Key</Text>
            <Text style={styles.detailBlockValue}>{safePublicKey(proof.publicKey)}</Text>
          </View>
        </DetailSection>

        {/* Verification status */}
        <View style={styles.verifiedBadge}>
          <Ionicons name="shield-checkmark" size={18} color="#14F195" />
          <Text style={styles.verifiedText}>Cryptographically Signed by Seed Vault</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.detailSection}>
      <Text style={styles.detailSectionTitle}>{title}</Text>
      <View style={styles.detailSectionBody}>{children}</View>
    </View>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, mono && styles.detailMono]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterType }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="file-tray-outline" size={56} color="#333" />
      <Text style={styles.emptyTitle}>
        {filter === 'all' ? 'No proofs yet' : `No ${filter === 'gps' ? 'GPS' : 'motion'} proofs`}
      </Text>
      <Text style={styles.emptyText}>
        Head to the Sensors tab to generate your first cryptographic proof.
      </Text>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * PublicKey comes back from AsyncStorage as a plain object, not a PublicKey
 * instance, so .toBase58() won't exist. This safely extracts a readable string
 * regardless of which form the key is in after JSON round-tripping.
 */
function safePublicKey(publicKey: any): string {
  if (!publicKey) return 'Unknown';
  if (typeof publicKey.toBase58 === 'function') return publicKey.toBase58();
  try {
    const { PublicKey } = require('@solana/web3.js');
    if (publicKey._bn) return new PublicKey(publicKey._bn).toBase58();
    if (Array.isArray(publicKey.data)) return new PublicKey(Uint8Array.from(publicKey.data)).toBase58();
  } catch {}
  return JSON.stringify(publicKey);
}

function formatPreview(type: string, data: any): string {
  if (type === 'gps') {
    return `${data.latitude?.toFixed(5)}, ${data.longitude?.toFixed(5)}  ·  ±${data.accuracy?.toFixed(0)}m`;
  }
  if (type === 'accelerometer') {
    return `x ${data.x?.toFixed(2)}  y ${data.y?.toFixed(2)}  z ${data.z?.toFixed(2)}  |  mag ${data.magnitude?.toFixed(2)}`;
  }
  return JSON.stringify(data).slice(0, 80);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF444411',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF444433',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#161616',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    color: '#555',
  },

  // Filter
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  filterChipActive: {
    backgroundColor: '#9945FF',
    borderColor: '#9945FF',
  },
  filterLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  filterLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  cardAccent: {
    width: 3,
  },
  cardBody: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: {
    flex: 1,
  },
  cardType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EEE',
    letterSpacing: -0.2,
  },
  cardTime: {
    fontSize: 11,
    color: '#555',
    marginTop: 1,
  },
  cardData: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  hashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hashDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#9945FF',
  },
  hashText: {
    fontSize: 11,
    color: '#444',
    fontFamily: 'monospace',
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  emptyText: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Sheet
  sheet: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#EEE',
  },
  sheetClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDelete: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    padding: 20,
    gap: 16,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#111',
    marginBottom: 4,
  },
  typeBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  detailSection: {
    marginBottom: 4,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  detailSectionBody: {
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    textTransform: 'capitalize',
  },
  detailValue: {
    fontSize: 13,
    color: '#CCC',
    flex: 2,
    textAlign: 'right',
  },
  detailMono: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#9945FF',
  },
  detailBlock: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
    gap: 4,
  },
  detailBlockLabel: {
    fontSize: 12,
    color: '#555',
  },
  detailBlockValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#9945FF',
    lineHeight: 18,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#14F19511',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#14F19533',
    marginTop: 4,
    marginBottom: 32,
  },
  verifiedText: {
    fontSize: 13,
    color: '#14F195',
    fontWeight: '600',
  },
});