import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SolanaProvider } from '@/src/providers/SolanaProvider';
import { MWAProvider } from '@/src/context/MWAContext';  // 👈 add this
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Polyfills for Solana
global.Buffer = Buffer;

export default function RootLayout() {
  useEffect(() => {
    // Initialize any global services here
  }, []);

  return (
    <SolanaProvider>
      <MWAProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      </MWAProvider>
    </SolanaProvider>
  );
}