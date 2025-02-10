import { Provider } from './types.ts';
import { SuiClient } from '@mysten/sui.js/client';
import { NAVISDKClient } from 'navi-sdk';
import { NAVI_COINS } from '../types/navi.ts';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

export class ProtocolProvider implements Provider {
    name = 'protocolProvider';
    private provider: SuiClient;
    private naviClient: NAVISDKClient;
    private signer: Ed25519Keypair;

    constructor() {
        const mnemonic = process.env.SUI_MNEMONIC;
        const rpcUrl = process.env.SUI_RPC_URL;
        
        if (!mnemonic || !rpcUrl) {
            throw new Error('Missing required environment variables: SUI_MNEMONIC or SUI_RPC_URL');
        }

        this.signer = Ed25519Keypair.deriveKeypair(mnemonic);
        this.provider = new SuiClient({ url: rpcUrl });
        this.naviClient = new NAVISDKClient({
            networkType: rpcUrl.includes('testnet') ? 'testnet' : 'mainnet'
        });
    }

    async getContext() {
        const markets = await this.getAllMarkets();
        const protocols = await this.getProtocolInfo();

        return {
            markets,
            protocols,
            timestamp: Date.now()
        };
    }

    private async getAllMarkets() {
        const naviMarkets = await this.naviClient.getPoolInfo();
        return {
            NAVI: naviMarkets
        };
    }

    private async getProtocolInfo() {
        return {
            NAVI: {
                name: 'NAVI Protocol',
                type: 'lending',
                features: ['lending', 'borrowing', 'yield farming', 'rewards'],
                status: 'active'
            }
        };
    }

    async initialize() {
        // Test connection by fetching markets
        await this.getAllMarkets();
    }
} 