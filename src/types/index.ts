import { PublicKey } from '@solana/web3.js';

export enum SensorType {
  GPS = 'gps',
  ACCELEROMETER = 'accelerometer',
  GYROSCOPE = 'gyroscope',
  MAGNETOMETER = 'magnetometer',
  NETWORK_SPEED = 'network_speed',
}

export interface SensorData {
  type: SensorType;
  timestamp: number;
  data: any;
  deviceId: string;
}

export interface SensorProof {
  sensorData: SensorData;
  signature: Uint8Array;
  publicKey: PublicKey;
  proofHash: string;
}

export interface GPSData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
}

export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
}

export interface DePINConfig {
  sensorTypes: SensorType[];
  samplingRate: number; // milliseconds
  autoSubmit: boolean;
  endpoint: string;
}