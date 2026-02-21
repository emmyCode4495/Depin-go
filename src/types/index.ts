import { PublicKey } from '@solana/web3.js';

export enum SensorType {
  GPS = 'gps',
  ACCELEROMETER = 'accelerometer',
  GYROSCOPE = 'gyroscope',
  MAGNETOMETER = 'magnetometer',
  NETWORK_SPEED = 'network_speed',
  BAROMETER     = 'barometer',
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


export interface GyroscopeData {
  x: number;           // rad/s
  y: number;
  z: number;
  magnitude?: number;
  sampleCount?: number;
  duration?: number;
}

export interface MagnetometerData {
  x: number;           // µT (microtesla)
  y: number;
  z: number;
  magnitude?: number;
  heading?: number;    // degrees 0–360 (compass bearing)
}


export interface BarometerData {
  pressure: number;           // hPa
  relativeAltitude?: number;  // metres above reference (iOS only)
  temperature?: number;       // °C if available
}


export interface NetworkSpeedData {
  downloadMbps: number;
  latencyMs: number;
  wifiSsid?: string;
  wifiSignalStrength?: number;   // dBm
  connectionType: string;        // 'wifi' | 'cellular' | 'none' | 'unknown'
  cellularGeneration?: string;   // '2g' | '3g' | '4g' | '5g' | null
  isInternetReachable: boolean;
}


export interface DePINConfig {
  sensorTypes: SensorType[];
  samplingRate: number; // milliseconds
  autoSubmit: boolean;
  endpoint: string;
}