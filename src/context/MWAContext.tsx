import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey } from '@solana/web3.js';
import { toByteArray } from 'react-native-quick-base64';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { seedVaultSigner } from '@/src/sdk/crypto/SeedVaultSigner';

const AUTH_TOKEN_KEY = '@depin-go:auth_token';
const BASE64_ADDRESS_KEY = '@depin-go:base64_address';
const APP_IDENTITY = {
  name: 'DePIN-Go',
  uri: 'https://depingo.io',
  icon: 'favicon.ico',
};

interface MWAContextType {
  walletAddress: PublicKey | null;
  base64Address: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  connect: () => Promise<PublicKey | undefined>;
  disconnect: () => Promise<void>;
}

const MWAContext = createContext<MWAContextType | null>(null);

export function MWAProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<PublicKey | null>(null);
  const [base64Address, setBase64Address] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Restore persisted session without opening wallet popup
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        const savedBase64 = await AsyncStorage.getItem(BASE64_ADDRESS_KEY);
        if (savedToken && savedBase64) {
          const publicKey = new PublicKey(toByteArray(savedBase64));
          seedVaultSigner.setAuthorized(publicKey, savedToken, savedBase64);
          setWalletAddress(publicKey);
          setBase64Address(savedBase64);
        }
      } catch {
        await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, BASE64_ADDRESS_KEY]);
      }
    };
    restoreSession();
  }, []);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      const result = await transact(async (wallet) => {
        const authorization = await wallet.authorize({
          chain: 'solana:devnet',
          identity: APP_IDENTITY,
          ...(savedToken ? { auth_token: savedToken } : {}),
        });
        const account = authorization.accounts[0];
        const publicKey = new PublicKey(toByteArray(account.address));
        return {
          publicKey,
          base64Address: account.address,
          authToken: authorization.auth_token,
        };
      });

      await AsyncStorage.setItem(AUTH_TOKEN_KEY, result.authToken);
      await AsyncStorage.setItem(BASE64_ADDRESS_KEY, result.base64Address);

      // ✅ Sync signer so useSensorProof passes isAuthorized() check
      seedVaultSigner.setAuthorized(result.publicKey, result.authToken, result.base64Address);

      setWalletAddress(result.publicKey);
      setBase64Address(result.base64Address);
      return result.publicKey;
    } catch (error) {
      console.error('MWA connection failed:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (savedToken) {
        await transact(async (wallet) => {
          await wallet.deauthorize({ auth_token: savedToken });
        });
      }
    } catch (error) {
      console.error('Disconnect failed:', error);
    } finally {
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, BASE64_ADDRESS_KEY]);
      seedVaultSigner.clearAuthorization(); // ✅ clear signer state too
      setWalletAddress(null);
      setBase64Address(null);
    }
  }, []);

  return (
    <MWAContext.Provider value={{
      walletAddress,
      base64Address,
      isConnecting,
      isConnected: walletAddress !== null,
      connect,
      disconnect,
    }}>
      {children}
    </MWAContext.Provider>
  );
}

export function useMWA() {
  const ctx = useContext(MWAContext);
  if (!ctx) throw new Error('useMWA must be used inside MWAProvider');
  return ctx;
}