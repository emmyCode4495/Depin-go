import { clusterApiUrl } from '@solana/web3.js';

export const SOLANA_CONFIG = {
  DEVNET_ENDPOINT: clusterApiUrl('devnet'),
  MAINNET_ENDPOINT: clusterApiUrl('mainnet-beta'),
  COMMITMENT: 'confirmed' as const,
};

export const DEPIN_CONFIG = {
  DEFAULT_SAMPLING_RATE: 1000, // 1 second
  MAX_BATCH_SIZE: 100,
  PROOF_EXPIRY: 3600000, // 1 hour in ms
};

export const SENSOR_CONFIG = {
  GPS_UPDATE_INTERVAL: 5000, // 5 seconds
  ACCELEROMETER_UPDATE_INTERVAL: 100, // 100ms
  MIN_LOCATION_ACCURACY: 50, // meters
};