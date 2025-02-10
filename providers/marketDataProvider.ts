import { Provider } from './types.ts';
import { SuiClient } from '@mysten/sui.js/client';
import { NAVISDKClient } from 'navi-sdk';
import { NAVI_COINS, CoinInfo, NaviQuote, NaviPoolInfo } from '../types/navi.ts';

export class MarketDataProvider implements Provider {
    name = 'marketDataProvider';
    private provider: SuiClient;
    private naviClient: NAVISDKClient;

    constructor() {
        const rpcUrl = process.env.SUI_RPC_URL;
        if (!rpcUrl) {
            throw new Error('Missing SUI_RPC_URL in environment');
        }
        this.provider = new SuiClient({ url: rpcUrl });
        this.naviClient = new NAVISDKClient({
            networkType: rpcUrl.includes('testnet') ? 'testnet' : 'mainnet'
        });
    }

    async getContext() {
        const markets = await this.getAllMarkets();
        const prices = await this.getPrices();
        const liquidity = await this.getLiquidity();

        return {
            markets,
            prices,
            liquidity,
            timestamp: Date.now()
        };
    }

    private async getAllMarkets() {
        const naviMarkets = await this.naviClient.getPoolInfo();
        return {
            NAVI: naviMarkets
        };
    }

    private async getPrices() {
        const prices: Record<string, number> = {};
        for (const [symbol, coin] of Object.entries(NAVI_COINS)) {
            try {
                const quote = await this.naviClient.getQuote(
                    coin.address,
                    NAVI_COINS.USDC.address,
                    '1000000000' // 1 unit in base precision
                ) as NaviQuote;
                prices[symbol] = Number(quote.routes[0].outAmount) / (10 ** NAVI_COINS.USDC.decimal);
            } catch (e) {
                console.error(`Failed to get price for ${symbol}:`, e);
            }
        }
        return prices;
    }

    private async getLiquidity() {
        const liquidity: Record<string, NaviPoolInfo> = {};
        for (const [symbol, coin] of Object.entries(NAVI_COINS)) {
            try {
                const poolInfo = await this.naviClient.getPoolInfo(coin as CoinInfo) as NaviPoolInfo;
                liquidity[symbol] = poolInfo;
            } catch (e) {
                console.error(`Failed to get liquidity for ${symbol}:`, e);
            }
        }
        return liquidity;
    }

    async initialize() {
        // Test connections
        await this.provider.getLatestCheckpointSequenceNumber();
        await this.naviClient.getPoolInfo();
    }
} 