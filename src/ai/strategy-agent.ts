import { BaseCharacter } from './base-character';
import { StrategyConfig, PortfolioAsset } from '../sui/strategy';
import { SuiStrategyManager } from '../sui/strategy';
import { NAVI_COINS } from '../sui/strategy';

interface MarketData {
    price: number;
    volume: number;
    timestamp: number;
}

interface RiskAnalysis {
    score: number;
    factors: string[];
    recommendation: string;
}

export class StrategyAgent extends BaseCharacter {
    private strategyManager: SuiStrategyManager;

    constructor(
        connection: string,
        packageId: string,
        privateKey: string,
        config: {
            name: string;
            description: string;
            instructions: string;
        }
    ) {
        super(config);
        this.strategyManager = new SuiStrategyManager(connection, packageId, privateKey);
    }

    // Strategy Creation and Management
    async createStrategy(type: number, riskLevel: number, amount: bigint): Promise<string> {
        return this.strategyManager.createStrategy({
            type,
            riskLevel,
            amount
        });
    }

    async createPortfolio(strategyId: string, assets: Array<{ assetType: number; allocation: number; currentValue: bigint }>): Promise<string> {
        return this.strategyManager.createPortfolio(strategyId, assets);
    }

    // NAVI Protocol Integration
    async analyzeMarketOpportunities(): Promise<{ opportunities: Array<{ market: string; apy: number; recommendation: string }> }> {
        const markets = await this.strategyManager.getMarkets();
        const opportunities = [];

        for (const market of markets) {
            const apy = await this.strategyManager.getMarketApy(market.id);
            const poolInfo = await this.strategyManager.getNaviPoolInfo(market);
            
            let recommendation = '';
            if (apy > 0.15) { // 15% APY threshold
                recommendation = 'High yield opportunity - Consider supplying';
            } else if (apy > 0.08) { // 8% APY threshold
                recommendation = 'Moderate yield - Monitor market conditions';
            } else {
                recommendation = 'Low yield - Consider alternative markets';
            }

            opportunities.push({
                market: market.id,
                apy,
                recommendation
            });
        }

        return { opportunities };
    }

    async suggestOptimalSwapRoute(
        fromCoin: string,
        toCoin: string,
        amount: bigint,
        apiKey?: string
    ): Promise<{ route: any; explanation: string }> {
        const quote = await this.strategyManager.getBestSwapRoute(fromCoin, toCoin, amount, apiKey);
        
        // Analyze the route and provide explanation
        const explanation = await this.chat(
            `Analyze this swap route and explain why it's optimal: ${JSON.stringify(quote.routes[0])}`
        );

        return {
            route: quote.routes[0],
            explanation
        };
    }

    async monitorPortfolioHealth(address: string): Promise<{ status: string; recommendations: string[] }> {
        const healthFactor = await this.strategyManager.getNaviHealthFactor(address);
        const portfolio = await this.strategyManager.getNaviPortfolio();
        const recommendations: string[] = [];

        if (healthFactor < 1.1) {
            recommendations.push('URGENT: Health factor critically low. Consider repaying some debt or adding collateral.');
        } else if (healthFactor < 1.5) {
            recommendations.push('WARNING: Health factor below safe threshold. Monitor closely.');
        }

        // Analyze portfolio composition
        for (const [market, balances] of portfolio.entries()) {
            if (balances.borrowBalance > 0) {
                const marketInfo = await this.strategyManager.getNaviPoolInfo({ 
                    symbol: market,
                    address: NAVI_COINS[market as keyof typeof NAVI_COINS]?.address,
                    decimal: NAVI_COINS[market as keyof typeof NAVI_COINS]?.decimal
                });
                
                if (marketInfo) {
                    recommendations.push(
                        `Market ${market}: Consider adjusting position based on current rates and market conditions.`
                    );
                }
            }
        }

        return {
            status: healthFactor >= 1.5 ? 'HEALTHY' : healthFactor >= 1.1 ? 'CAUTION' : 'DANGER',
            recommendations
        };
    }

    async suggestYieldStrategy(address: string): Promise<{ strategy: string; actions: Array<{ action: string; reason: string }> }> {
        const portfolio = await this.strategyManager.getNaviPortfolio();
        const markets = await this.strategyManager.getMarkets();
        const actions: Array<{ action: string; reason: string }> = [];

        // Analyze current market conditions
        for (const market of markets) {
            const apy = await this.strategyManager.getMarketApy(market.id);
            const poolInfo = await this.strategyManager.getNaviPoolInfo(market);

            if (apy > 0.12) { // 12% APY threshold
                actions.push({
                    action: `Supply to ${market.id} market`,
                    reason: `High APY of ${(apy * 100).toFixed(2)}% available`
                });
            }
        }

        // Check for reward opportunities
        const rewards = await this.strategyManager.getNaviAvailableRewards(address);
        if (rewards) {
            actions.push({
                action: 'Claim rewards',
                reason: 'Unclaimed rewards available'
            });
        }

        const strategy = await this.chat(
            `Based on the current market conditions and portfolio analysis, suggest a yield farming strategy. Portfolio: ${JSON.stringify(portfolio)}, Actions: ${JSON.stringify(actions)}`
        );

        return {
            strategy,
            actions
        };
    }

    // Original Strategy Methods
    async executeYieldFarming(strategyId: string, returns: bigint, timestamp: number): Promise<void> {
        return this.strategyManager.executeYieldFarming(strategyId, returns, timestamp);
    }

    async executeTrading(strategyId: string, returns: bigint, timestamp: number): Promise<void> {
        return this.strategyManager.executeTrading(strategyId, returns, timestamp);
    }

    async analyzeMarket(data: MarketData[]): Promise<string> {
        const prompt = `
            Analyze the following market data and provide strategic recommendations:
            ${JSON.stringify(data, null, 2)}
            
            Consider:
            1. Price trends and volatility
            2. Volume patterns
            3. Market sentiment
            4. Risk factors
            
            Provide specific recommendations for:
            1. Position sizing
            2. Entry/exit points
            3. Risk management
        `;

        const response = await this.chat(prompt);
        return response;
    }

    async optimizePortfolio(assets: PortfolioAsset[]): Promise<PortfolioAsset[]> {
        const prompt = `
            Optimize the following portfolio allocation:
            ${JSON.stringify(assets, null, 2)}
            
            Consider:
            1. Risk-adjusted returns
            2. Diversification
            3. Market conditions
            4. Liquidity requirements
            
            Provide optimal asset allocation with explanations.
        `;

        const response = await this.chat(prompt);
        
        // Parse AI recommendations and convert to portfolio assets
        // This is a simplified version - in practice, you'd want more sophisticated parsing
        const optimizedAssets = assets.map(asset => ({
            ...asset,
            allocation: Math.min(100, Math.max(0, asset.allocation)) // Ensure allocation is between 0-100
        }));

        return optimizedAssets;
    }

    async assessRisk(strategy: StrategyConfig, marketData: MarketData[]): Promise<RiskAnalysis> {
        const prompt = `
            Assess the risk for the following strategy and market conditions:
            Strategy: ${JSON.stringify(strategy, null, 2)}
            Market Data: ${JSON.stringify(marketData, null, 2)}
            
            Provide:
            1. Risk score (0-100)
            2. Key risk factors
            3. Risk mitigation recommendations
        `;

        const response = await this.chat(prompt);
        
        // Parse AI response into structured risk analysis
        // This is a simplified version - in practice, you'd want more sophisticated parsing
        return {
            score: 50, // Default medium risk
            factors: ['market volatility', 'liquidity risk'],
            recommendation: response
        };
    }

    async generateTradingSignals(
        marketData: MarketData[],
        timeframe: string
    ): Promise<{signal: 'buy' | 'sell' | 'hold', confidence: number}> {
        const prompt = `
            Analyze market data and generate trading signals:
            Data: ${JSON.stringify(marketData, null, 2)}
            Timeframe: ${timeframe}
            
            Consider:
            1. Technical indicators
            2. Price action
            3. Volume analysis
            4. Market sentiment
            
            Provide:
            1. Trading signal (buy/sell/hold)
            2. Confidence level (0-100)
            3. Supporting analysis
        `;

        const response = await this.chat(prompt);
        
        // In practice, implement more sophisticated parsing of AI response
        return {
            signal: 'hold',
            confidence: 50
        };
    }
} 