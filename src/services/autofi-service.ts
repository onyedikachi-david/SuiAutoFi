import { SuiStrategyManager, StrategyConfig, PortfolioAsset, LendingPosition } from '../sui/strategy';
import { StrategyAgent } from '../ai/strategy-agent';

export class AutoFiService {
    private strategyManager: SuiStrategyManager;
    private strategyAgent: StrategyAgent;

    constructor(
        rpcUrl: string,
        packageId: string,
        privateKey: string
    ) {
        this.strategyManager = new SuiStrategyManager(rpcUrl, packageId, privateKey);
        this.strategyAgent = new StrategyAgent(
            rpcUrl,
            packageId,
            privateKey,
            {
                name: "SuiAutoFi Strategy Agent",
                description: "AI agent for optimizing DeFi strategies on Sui",
                instructions: "Analyze market conditions and optimize DeFi strategies for maximum returns while managing risk"
            }
        );
    }

    async createOptimizedStrategy(
        initialConfig: Omit<StrategyConfig, 'riskLevel'>,
        marketData: Array<{ price: number; volume: number; timestamp: number }>
    ): Promise<string> {
        // Analyze market and assess risk
        const analysis = await this.strategyAgent.assessRisk(
            { ...initialConfig, riskLevel: 1 }, // Start with medium risk
            marketData
        );

        // Create strategy with optimized risk level
        const riskLevel = Math.floor(analysis.score / 33); // Convert 0-100 score to 0-2 risk level
        const strategyId = await this.strategyManager.createStrategy({
            ...initialConfig,
            riskLevel
        });

        return strategyId;
    }

    async optimizeAndCreatePortfolio(
        strategyId: string,
        initialAssets: PortfolioAsset[]
    ): Promise<string> {
        // Get AI-optimized asset allocation
        const optimizedAssets = await this.strategyAgent.optimizePortfolio(initialAssets);

        // Create portfolio with optimized allocation
        const portfolioId = await this.strategyManager.createPortfolio(
            strategyId,
            optimizedAssets
        );

        return portfolioId;
    }

    async executeYieldFarmingStrategy(
        strategyId: string,
        availableProtocols: string[],
        currentYields: Map<string, number>
    ): Promise<void> {
        // Get AI recommendations for yield farming
        const recommendations = await this.strategyAgent.suggestYieldStrategy(strategyId);

        // Execute the strategy based on recommendations
        const timestamp = Math.floor(Date.now() / 1000);
        await this.strategyManager.executeYieldFarming(
            strategyId,
            BigInt(100), // Mock returns
            timestamp
        );
    }

    async executeTradingStrategy(
        strategyId: string,
        marketData: Array<{ price: number; volume: number; timestamp: number }>,
        timeframe: string
    ): Promise<void> {
        // Get AI trading signals
        const { signal, confidence } = await this.strategyAgent.generateTradingSignals(
            marketData,
            timeframe
        );

        // Execute the strategy if confidence is high enough
        if (confidence > 70) {
            const timestamp = Math.floor(Date.now() / 1000);
            await this.strategyManager.executeTrading(
                strategyId,
                BigInt(100), // Mock returns
                timestamp
            );
        }
    }

    async executeLendingStrategy(
        strategyId: string,
        amount: bigint,
        minApy: number = 0.05 // 5% minimum APY
    ): Promise<void> {
        // Get available markets from both protocols
        const markets = await this.strategyManager.getMarkets();
        
        // Get APY for each market
        const marketApys = await Promise.all(
            markets.map(async (market) => ({
                marketId: market.id,
                apy: await this.strategyManager.getMarketApy(market.id)
            }))
        );

        // Find best market above minimum APY
        const bestMarket = marketApys
            .filter(m => m.apy >= minApy)
            .sort((a, b) => b.apy - a.apy)[0];

        if (bestMarket) {
            // Supply to the best market
            await this.strategyManager.supplyToMarket(
                bestMarket.marketId,
                amount
            );
        }
    }

    async rebalanceLendingPosition(
        strategyId: string,
        currentPosition: LendingPosition,
        minApyDifference: number = 0.02 // 2% minimum APY improvement
    ): Promise<void> {
        // Get current market APY
        const currentApy = await this.strategyManager.getMarketApy(currentPosition.marketId);
        
        // Get all markets and their APYs
        const markets = await this.strategyManager.getMarkets();
        const marketApys = await Promise.all(
            markets.map(async (market) => ({
                marketId: market.id,
                apy: await this.strategyManager.getMarketApy(market.id)
            }))
        );

        // Find better market with significant APY improvement
        const betterMarket = marketApys
            .filter(m => m.apy > currentApy + minApyDifference)
            .sort((a, b) => b.apy - a.apy)[0];

        if (betterMarket) {
            // Withdraw from current market
            await this.strategyManager.withdrawFromMarket(
                currentPosition.marketId,
                currentPosition.amount
            );
            
            // Supply to better market
            await this.strategyManager.supplyToMarket(
                betterMarket.marketId,
                currentPosition.amount
            );
        }
    }

    async claimRewards(protocol: 'NAVI' | 'SUILEND'): Promise<void> {
        if (protocol === 'NAVI') {
            await this.strategyManager.claimNaviRewards();
        }
        // Add other protocol reward claiming as needed
    }
} 