import { useState, useCallback } from 'react';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey } from '@solana/web3.js';
import { toByteArray } from 'react-native-quick-base64';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = '@depin-go:auth_token';
const BASE64_ADDRESS_KEY = '@depin-go:base64_address';

const APP_IDENTITY = {
  name: 'DePIN-Go',
  uri: 'https://depingo.io',
  icon: 'favicon.ico',
};

export function useMWA() {
  const [walletAddress, setWalletAddress] = useState<PublicKey | null>(null);
  const [base64Address, setBase64Address] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);

      // Check for saved auth token for silent re-auth
      const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      const result = await transact(async (wallet) => {
        const authorization = await wallet.authorize({
          chain: 'solana:devnet',         // FIX: 'chain' not 'cluster'
          identity: APP_IDENTITY,
          ...(savedToken ? { auth_token: savedToken } : {}),
        });

        const account = authorization.accounts[0];

        // FIX: address is Base64, not base58 - decode with toByteArray
        const publicKey = new PublicKey(toByteArray(account.address));

        return {
          publicKey,
          base64Address: account.address,  // Save for signing
          authToken: authorization.auth_token,
        };
      });

      // Persist auth token for future sessions
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, result.authToken);
      await AsyncStorage.setItem(BASE64_ADDRESS_KEY, result.base64Address);

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
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(BASE64_ADDRESS_KEY);
      setWalletAddress(null);
      setBase64Address(null);
    }
  }, []);

  return {
    walletAddress,
    base64Address,  
    isConnecting,
    connect,
    disconnect,
    isConnected: walletAddress !== null,
  };
}