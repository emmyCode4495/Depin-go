import * as Location from 'expo-location';
import * as Sensors from 'expo-sensors';
import { SensorType, SensorData, GPSData, AccelerometerData } from '@/src/types';
import * as Device from 'expo-device';

export class SensorManager {
  private deviceId: string;

  constructor() {
    this.deviceId = Device.modelId || 'unknown';
  }

  async requestPermissions(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }

  async getGPSData(): Promise<SensorData | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const gpsData: GPSData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
      };

      return {
        type: SensorType.GPS,
        timestamp: Date.now(),
        data: gpsData,
        deviceId: this.deviceId,
      };
    } catch (error) {
      console.error('Failed to get GPS data:', error);
      return null;
    }
  }

  subscribeToAccelerometer(
    callback: (data: SensorData) => void,
    interval: number = 100
  ): { remove: () => void } {
    Sensors.Accelerometer.setUpdateInterval(interval);

    const subscription = Sensors.Accelerometer.addListener((result) => {
      const accelData: AccelerometerData = {
        x: result.x,
        y: result.y,
        z: result.z,
      };

      callback({
        type: SensorType.ACCELEROMETER,
        timestamp: Date.now(),
        data: accelData,
        deviceId: this.deviceId,
      });
    });

    return subscription;
  }
}