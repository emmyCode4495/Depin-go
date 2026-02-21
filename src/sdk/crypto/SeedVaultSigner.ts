import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { toByteArray } from 'react-native-quick-base64';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = '@depin-go:auth_token';

const APP_IDENTITY = {
  name: 'DePIN-Go',
  uri: 'https://depingo.io',
  icon: 'favicon.ico',
};

export class SeedVaultSigner {
  private authorizedPublicKey: PublicKey | null = null;
  private authToken: string | null = null;
  private base64Address: string | null = null;

  async authorize(): Promise<PublicKey> {
    try {
      const result = await transact(async (wallet) => {
        const authorization = await wallet.authorize({
          chain: 'solana:devnet',
          identity: APP_IDENTITY,
        });

        const account = authorization.accounts[0];
        const publicKey = new PublicKey(toByteArray(account.address));

        return {
          publicKey,
          base64Address: account.address,
          authToken: authorization.auth_token,
        };
      });

      this.authorizedPublicKey = result.publicKey;
      this.authToken = result.authToken;
      this.base64Address = result.base64Address;

      return result.publicKey;
    } catch (error) {
      console.error('Seed Vault authorization failed:', error);
      throw error;
    }
  }

  async reauthorize(): Promise<PublicKey> {
    if (!this.authToken) return this.authorize();

    try {
      const result = await transact(async (wallet) => {
        const authorization = await wallet.authorize({
          chain: 'solana:devnet',
          identity: APP_IDENTITY,
          auth_token: this.authToken!,
        });

        const account = authorization.accounts[0];
        const publicKey = new PublicKey(toByteArray(account.address));

        return {
          publicKey,
          base64Address: account.address,
          authToken: authorization.auth_token,
        };
      });

      this.authorizedPublicKey = result.publicKey;
      this.authToken = result.authToken;
      this.base64Address = result.base64Address;

      return result.publicKey;
    } catch {
      return this.authorize();
    }
  }

  async signData(data: Uint8Array): Promise<{
    signature: Uint8Array;
    publicKey: PublicKey;
  }> {
    if (!this.authorizedPublicKey || !this.authToken || !this.base64Address) {
      throw new Error('Not authorized. Call authorize() first.');
    }

    try {
      const result = await transact(async (wallet) => {
        // ✅ MUST reauthorize inside every transact() before signing
        // Without this, MWA throws -1/auth_token not valid for signing
        const reauth = await wallet.reauthorize({
          auth_token: this.authToken!,
          identity: APP_IDENTITY,
        });

        // Persist the refreshed token so future sessions stay valid
        this.authToken = reauth.auth_token;
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, reauth.auth_token);

        const signatures = await wallet.signMessages({
          addresses: [this.base64Address!],
          payloads: [data],
        });

        return { signature: signatures[0] };
      });

      return {
        signature: result.signature,
        publicKey: this.authorizedPublicKey!,
      };
    } catch (error) {
      console.error('Signing failed:', error);
      throw new Error(`Failed to sign data: ${error}`);
    }
  }

  async signSensorData(sensorData: {
    type: string;
    timestamp: number;
    data: any;
    deviceId: string;
  }): Promise<{
    signature: Uint8Array;
    publicKey: PublicKey;
    messageHash: string;
  }> {
    const message = this.createSensorMessage(sensorData);
    const messageBytes = new TextEncoder().encode(message);
    const { signature, publicKey } = await this.signData(messageBytes);
    const messageHash = bs58.encode(nacl.hash(messageBytes));

    return { signature, publicKey, messageHash };
  }

  verifySignature(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: PublicKey
  ): boolean {
    try {
      return nacl.sign.detached.verify(message, signature, publicKey.toBytes());
    } catch {
      return false;
    }
  }

  private createSensorMessage(sensorData: {
    type: string;
    timestamp: number;
    data: any;
    deviceId: string;
  }): string {
    const dataJson = JSON.stringify(
      sensorData.data,
      Object.keys(sensorData.data).sort()
    );
    return `${sensorData.type}|${sensorData.timestamp}|${dataJson}|${sensorData.deviceId}`;
  }

  getPublicKey(): PublicKey | null {
    return this.authorizedPublicKey;
  }

  isAuthorized(): boolean {
    return (
      this.authorizedPublicKey !== null &&
      this.authToken !== null &&
      this.base64Address !== null
    );
  }

  /**
   * Called by MWAContext to sync authorization state
   * without triggering a second wallet popup
   */
  setAuthorized(publicKey: PublicKey, authToken: string, base64Address: string): void {
    this.authorizedPublicKey = publicKey;
    this.authToken = authToken;
    this.base64Address = base64Address;
  }

  clearAuthorization(): void {
    this.authorizedPublicKey = null;
    this.authToken = null;
    this.base64Address = null;
  }

  async deauthorize(): Promise<void> {
    try {
      await transact(async (wallet) => {
        if (this.authToken) {
          await wallet.deauthorize({ auth_token: this.authToken });
        }
      });
    } catch (error) {
      console.error('Deauthorization failed:', error);
    } finally {
      this.authorizedPublicKey = null;
      this.authToken = null;
      this.base64Address = null;
    }
  }
}

export const seedVaultSigner = new SeedVaultSigner();