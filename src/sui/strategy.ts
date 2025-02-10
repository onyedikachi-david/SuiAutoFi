import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient } from '@mysten/sui.js/client';
import { NAVISDKClient } from 'navi-sdk';
import type { CoinInfo, SwapOptions, Quote, Dex, OptionType } from 'navi-sdk/dist/types';

export interface StrategyConfig {
    type: number;
    riskLevel: number;
    amount: bigint;
}

export interface PortfolioAsset {
    assetType: number;
    allocation: number;
    currentValue: bigint;
}

export interface LendingPosition {
    protocol: 'NAVI';
    marketId: string;
    amount: bigint;
    apy: number;
}

// NAVI Protocol Constants
export const NAVI_PACKAGE_ID = {
    MAINNET: '0x...',  // Add mainnet package ID
    TESTNET: '0x...'   // Add testnet package ID
};

// Extended NAVI_COINS list from sample code
export const NAVI_COINS: Record<string, CoinInfo> = {
    SUI: {
        symbol: 'SUI',
        decimal: 9,
        address: '0x2::sui::SUI'
    },
    USDC: {
        symbol: 'USDC',
        decimal: 6,
        address: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    },
    USDT: {
        symbol: 'USDT',
        decimal: 6,
        address: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN'
    },
    WETH: {
        symbol: 'WETH',
        decimal: 8,
        address: '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN'
    },
    CETUS: {
        symbol: 'CETUS',
        decimal: 9,
        address: '0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS'
    },
    vSUI: {
        symbol: 'vSUI',
        decimal: 9,
        address: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT'
    },
    haSUI: {
        symbol: 'haSUI',
        decimal: 9,
        address: '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI'
    },
    WBTC: {
        symbol: 'WBTC',
        decimal: 8,
        address: '0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN'
    },
    NAVX: {
        symbol: 'NAVX',
        decimal: 9,
        address: '0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX'
    }
} as const;

export class SuiStrategyManager {
    private provider: SuiClient;
    private packageId: string;
    private signer: Ed25519Keypair;
    private naviClient: NAVISDKClient;
    private naviPackageId: string;

    constructor(connection: string, packageId: string, privateKey: string) {
        this.provider = new SuiClient({ url: connection });
        this.packageId = packageId;
        this.signer = Ed25519Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
        
        // Initialize NAVI client with all options from sample code
        this.naviClient = new NAVISDKClient({
            privateKeyList: [privateKey],
            networkType: connection.includes('testnet') ? 'testnet' : 'mainnet',
            wordLength: 12,
            numberOfAccounts: 1
        });
        this.naviPackageId = connection.includes('testnet') ? NAVI_PACKAGE_ID.TESTNET : NAVI_PACKAGE_ID.MAINNET;
    }

    // Account Management Methods
    async getAllAccounts() {
        return this.naviClient.getAllAccounts();
    }

    async getMnemonic() {
        return this.naviClient.getMnemonic();
    }

    // Portfolio and Balance Methods
    async getNaviPortfolio(): Promise<Map<string, { borrowBalance: number, supplyBalance: number }>> {
        return this.naviClient.getAllNaviPortfolios();
    }

    async getNaviBalances(): Promise<Record<string, number>> {
        return this.naviClient.getAllBalances();
    }

    // Health Factor Methods
    async getNaviHealthFactor(address: string): Promise<number> {
        return this.naviClient.getHealthFactor(address);
    }

    async getNaviDynamicHealthFactor(
        address: string,
        coinType: CoinInfo,
        estimateSupply: number,
        estimateBorrow: number,
        isIncrease: boolean = true
    ): Promise<number> {
        const result = await this.naviClient.getDynamicHealthFactor(address, coinType, estimateSupply, estimateBorrow, isIncrease);
        return Number(result);
    }

    // Pool Information Methods
    async getNaviPoolInfo(coinType?: CoinInfo) {
        return this.naviClient.getPoolInfo(coinType);
    }

    async getNaviReserveDetail(coinType: CoinInfo) {
        return this.naviClient.getReserveDetail(coinType);
    }

    // Rewards Methods
    async getNaviAvailableRewards(address?: string, option: OptionType = 1) {
        return this.naviClient.getAddressAvailableRewards(address, option);
    }

    async getNaviRewardsHistory(userAddress?: string, page: number = 1, size: number = 400) {
        return this.naviClient.getClaimedRewardsHistory(userAddress, page, size);
    }

    // Swap and Quote Methods
    async getNaviQuote(
        fromCoinAddress: string,
        toCoinAddress: string,
        amountIn: number | string | bigint,
        apiKey?: string,
        swapOptions: SwapOptions = { baseUrl: undefined, dexList: [], byAmountIn: true, depth: 3 }
    ): Promise<Quote> {
        return this.naviClient.getQuote(fromCoinAddress, toCoinAddress, amountIn, apiKey, swapOptions);
    }

    async getBestSwapRoute(
        fromCoin: string,
        toCoin: string,
        amount: bigint | number,
        apiKey?: string
    ): Promise<Quote> {
        const swapOptions: SwapOptions = {
            baseUrl: 'https://open-aggregator-api.naviprotocol.io',
            dexList: ['cetus', 'turbos', 'kriyaV2', 'kriyaV3', 'aftermath', 'deepbook', 'bluefin'] as Dex[],
            byAmountIn: true,
            depth: 3
        };

        return this.getNaviQuote(fromCoin, toCoin, amount, apiKey, swapOptions);
    }

    // Market Operations
    async getMarkets(): Promise<any[]> {
        return Object.values(NAVI_COINS).map(coin => ({
            id: coin.symbol,
            decimal: coin.decimal,
            address: coin.address
        }));
    }

    async supplyToMarket(marketId: string, amount: bigint): Promise<string> {
        const tx = new TransactionBlock();
        const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
        
        tx.moveCall({
            target: `${this.naviPackageId}::navi::deposit`,
            arguments: [coin],
        });

        const result = await this.provider.signAndExecuteTransactionBlock({
            signer: this.signer,
            transactionBlock: tx,
            options: { showEffects: true, showEvents: true },
        });

        return result.digest;
    }

    async withdrawFromMarket(marketId: string, amount: bigint): Promise<string> {
        const tx = new TransactionBlock();
        tx.moveCall({
            target: `${this.naviPackageId}::navi::withdraw`,
            arguments: [tx.pure(amount)],
        });

        const result = await this.provider.signAndExecuteTransactionBlock({
            signer: this.signer,
            transactionBlock: tx,
            options: { showEffects: true, showEvents: true },
        });

        return result.digest;
    }

    // Swap Execution
    async executeSwap(
        fromCoinAddress: string,
        toCoinAddress: string,
        amountIn: number | string | bigint,
        minAmountOut: number,
        apiKey?: string,
        swapOptions: SwapOptions = { baseUrl: undefined, dexList: [], byAmountIn: true, depth: 3 }
    ): Promise<string> {
        const tx = new TransactionBlock();
        const [coin] = tx.splitCoins(tx.gas, [tx.pure(amountIn)]);

        const quote = await this.getNaviQuote(fromCoinAddress, toCoinAddress, amountIn, apiKey, swapOptions);
        
        tx.moveCall({
            target: `${this.naviPackageId}::navi::swap`,
            arguments: [
                coin,
                tx.pure(minAmountOut),
                tx.pure(quote.routes[0].path)
            ],
        });

        const result = await this.provider.signAndExecuteTransactionBlock({
            signer: this.signer,
            transactionBlock: tx,
            options: { showEffects: true, showEvents: true },
        });

        return result.digest;
    }

    // Strategy Execution Methods (from your original implementation)
    async createStrategy(config: StrategyConfig): Promise<string> {
        const tx = new TransactionBlock();
        const [coin] = tx.splitCoins(tx.gas, [tx.pure(config.amount)]);
        tx.moveCall({
            target: `${this.packageId}::autofi::create_strategy`,
            arguments: [tx.pure(config.type), tx.pure(config.riskLevel), coin],
        });

        const result = await this.provider.signAndExecuteTransactionBlock({
            signer: this.signer,
            transactionBlock: tx,
            options: { showEffects: true, showEvents: true },
        });

        const strategyCreatedEvent = result.events?.find(
            event => event.type.includes('StrategyCreated')
        );
        return (strategyCreatedEvent?.parsedJson as { strategy_id: string })?.strategy_id || '';
    }

    async createPortfolio(strategyId: string, assets: PortfolioAsset[]): Promise<string> {
        const tx = new TransactionBlock();
        tx.moveCall({
            target: `${this.packageId}::portfolio::create_portfolio`,
            arguments: [tx.pure(strategyId)],
        });

        for (const asset of assets) {
            tx.moveCall({
                target: `${this.packageId}::portfolio::add_asset`,
                arguments: [
                    tx.pure(asset.assetType),
                    tx.pure(asset.allocation),
                    tx.pure(asset.currentValue)
                ],
            });
        }

        const result = await this.provider.signAndExecuteTransactionBlock({
            signer: this.signer,
            transactionBlock: tx,
            options: { showEffects: true, showEvents: true },
        });

        const portfolioCreatedEvent = result.events?.find(
            event => event.type.includes('PortfolioCreated')
        );
        return (portfolioCreatedEvent?.parsedJson as { portfolio_id: string })?.portfolio_id || '';
    }

    async executeYieldFarming(strategyId: string, returns: bigint, timestamp: number): Promise<void> {
        const tx = new TransactionBlock();
        tx.moveCall({
            target: `${this.packageId}::autofi::execute_yield_farming`,
            arguments: [tx.pure(strategyId), tx.pure(returns), tx.pure(timestamp)],
        });
        await this.provider.signAndExecuteTransactionBlock({
            signer: this.signer,
            transactionBlock: tx,
        });
    }

    async executeTrading(strategyId: string, returns: bigint, timestamp: number): Promise<void> {
        const tx = new TransactionBlock();
        tx.moveCall({
            target: `${this.packageId}::autofi::execute_trading`,
            arguments: [tx.pure(strategyId), tx.pure(returns), tx.pure(timestamp)],
        });
        await this.provider.signAndExecuteTransactionBlock({
            signer: this.signer,
            transactionBlock: tx,
        });
    }

    async getLendingMarkets(): Promise<any[]> {
        // This method is removed as per the instructions
        throw new Error('Method not implemented');
    }

    async getMarketApy(marketId: string): Promise<number> {
        const marketInfo = await this.provider.getObject({
            id: `${this.naviPackageId}::navi::market::${marketId}`,
            options: { showContent: true }
        });
        
        // Parse the market info and extract APY
        // This is a mock implementation - replace with actual APY calculation
        return 0.10; // 10% APY as default
    }

    async supplyToNavi(coinType: string, amount: bigint): Promise<string> {
        const tx = new TransactionBlock();
        const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
        tx.moveCall({
            target: `${this.naviPackageId}::navi::deposit`,
            arguments: [coin],
        });
        const result = await this.provider.signAndExecuteTransactionBlock({
            signer: this.signer,
            transactionBlock: tx,
            options: { showEffects: true, showEvents: true },
        });
        return result.digest;
    }

    async withdrawFromNavi(coinType: string, amount: bigint): Promise<string> {
        const tx = new TransactionBlock();
        tx.moveCall({
            target: `${this.naviPackageId}::navi::withdraw`,
            arguments: [tx.pure(amount)],
        });
        const result = await this.provider.signAndExecuteTransactionBlock({
            signer: this.signer,
            transactionBlock: tx,
            options: { showEffects: true, showEvents: true },
        });
        return result.digest;
    }

    async getNaviMarkets(): Promise<any[]> {
        const markets = Object.values(NAVI_COINS).map(coin => ({
            id: coin.symbol,
            decimal: coin.decimal,
            address: coin.address
        }));
        return markets;
    }

    async getNaviApy(marketId: string): Promise<number> {
        const marketInfo = await this.provider.getObject({
            id: `${this.naviPackageId}::navi::market::${marketId}`,
            options: { showContent: true }
        });
        return 0.10; // Mock APY for now
    }

    async claimNaviRewards(): Promise<string> {
        const tx = new TransactionBlock();
        tx.moveCall({
            target: `${this.naviPackageId}::navi::claim_rewards`,
            arguments: [],
        });
        const result = await this.provider.signAndExecuteTransactionBlock({
            signer: this.signer,
            transactionBlock: tx,
            options: { showEffects: true, showEvents: true },
        });
        return result.digest;
    }

    async getAllMarkets(): Promise<Array<{ protocol: 'NAVI'; market: any }>> {
        const naviMarkets = await this.getNaviMarkets();
        return naviMarkets.map(market => ({ protocol: 'NAVI' as const, market }));
    }

    async supplyToProtocol(protocol: 'NAVI', marketId: string, amount: bigint): Promise<string> {
        if (protocol === 'NAVI') {
            const market = Object.values(NAVI_COINS).find(coin => coin.symbol === marketId);
            if (!market) throw new Error('Unsupported market');
            return this.supplyToNavi(market.symbol, amount);
        }
        const tx = new TransactionBlock();
        const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
        const result = await this.provider.signAndExecuteTransactionBlock({
            signer: this.signer,
            transactionBlock: tx,
            options: { showEffects: true, showEvents: true },
        });
        return result.digest;
    }

    async withdrawFromProtocol(protocol: 'NAVI', marketId: string, amount: bigint): Promise<string> {
        if (protocol === 'NAVI') {
            const market = Object.values(NAVI_COINS).find(coin => coin.symbol === marketId);
            if (!market) throw new Error('Unsupported market');
            return this.withdrawFromNavi(market.symbol, amount);
        }
        const tx = new TransactionBlock();
        const result = await this.provider.signAndExecuteTransactionBlock({
            signer: this.signer,
            transactionBlock: tx,
            options: { showEffects: true, showEvents: true },
        });
        return result.digest;
    }
} 