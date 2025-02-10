import { Action } from './types.ts';
import { NAVISDKClient } from 'navi-sdk';
import { SuiClient } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { NAVI_COINS, CoinInfo, YieldStrategy, YieldOpportunity, NaviPoolInfo } from '../types/navi.ts';

export class OptimizeYieldAction implements Action {
    name = 'optimizeYield';
    description = 'Analyze and optimize yield strategies across protocols';
    private naviClient: NAVISDKClient;
    private provider: SuiClient;
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

    async validate(params: Record<string, any>): Promise<boolean> {
        return !!(params.address && params.riskLevel);
    }

    async execute(params: Record<string, any>, context: Record<string, any>) {
        try {
            if (!this.validate(params)) {
                return {
                    success: false,
                    error: 'Invalid parameters. Required: address, riskLevel'
                };
            }

            // Get current portfolio state
            const portfolio = await this.naviClient.getAllNaviPortfolios();
            const currentPositions = new Map<string, { supply: string; borrow: string }>();
            
            for (const [token, balances] of portfolio.entries()) {
                if (balances.supplyBalance > 0 || balances.borrowBalance > 0) {
                    currentPositions.set(token, {
                        supply: balances.supplyBalance.toString(),
                        borrow: balances.borrowBalance.toString()
                    });
                }
            }

            // Get all yield opportunities
            const opportunities = await this.findYieldOpportunities();
            
            // Get user's health factor
            const healthFactor = await this.naviClient.getHealthFactor(params.address);

            // Generate optimization strategies
            const strategies = this.generateStrategies(
                opportunities,
                currentPositions,
                Number(healthFactor),
                params.riskLevel
            );

            return {
                success: true,
                result: {
                    currentState: {
                        positions: Array.from(currentPositions.entries()).map(([token, balance]) => ({
                            token,
                            ...balance
                        })),
                        healthFactor
                    },
                    opportunities: opportunities.map(opp => ({
                        ...opp,
                        isRecommended: strategies.some(s => s.token === opp.token)
                    })),
                    recommendedStrategies: strategies.sort((a, b) => b.priority - a.priority),
                    timestamp: Date.now()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to optimize yield: ${error.message}`
            };
        }
    }

    private async findYieldOpportunities(): Promise<YieldOpportunity[]> {
        const opportunities: YieldOpportunity[] = [];

        for (const [symbol, coin] of Object.entries(NAVI_COINS)) {
            try {
                const poolInfo = await this.naviClient.getPoolInfo(coin as CoinInfo) as NaviPoolInfo;
                if (!poolInfo) continue;

                const baseApy = Number(poolInfo.base_supply_rate);
                const boostedApy = Number(poolInfo.boosted_supply_rate);
                const totalApy = baseApy + boostedApy;

                opportunities.push({
                    token: symbol,
                    protocol: 'NAVI',
                    apy: totalApy,
                    availableLiquidity: poolInfo.availableLiquidity,
                    rewardTokens: ['NAVX'],
                    risks: this.assessRisks(poolInfo),
                    requirements: {
                        minAmount: '0',
                        maxAmount: poolInfo.totalSupply,
                        collateralRequired: false
                    }
                });
            } catch (e) {
                console.error(`Failed to get pool info for ${symbol}:`, e);
            }
        }

        return opportunities;
    }

    private generateStrategies(
        opportunities: YieldOpportunity[],
        currentPositions: Map<string, { supply: string; borrow: string }>,
        healthFactor: number,
        riskLevel: number
    ): YieldStrategy[] {
        const strategies: YieldStrategy[] = [];
        const sortedOpportunities = [...opportunities].sort((a, b) => b.apy - a.apy);

        // Risk thresholds based on user's risk level (1-5)
        const minHealthFactor = 1.5 - (riskLevel * 0.1); // 1.5 to 1.1
        const apyThreshold = 0.03 + (riskLevel * 0.02); // 3% to 11%

        for (const opp of sortedOpportunities) {
            const currentPosition = currentPositions.get(opp.token);

            if (opp.apy >= apyThreshold) {
                if (!currentPosition) {
                    // New opportunity
                    strategies.push({
                        token: opp.token,
                        action: 'supply',
                        amount: '0', // To be determined by user
                        expectedApy: opp.apy,
                        reason: `High yield opportunity with ${(opp.apy * 100).toFixed(2)}% APY`,
                        priority: this.calculatePriority(opp, healthFactor, riskLevel)
                    });
                } else {
                    // Existing position that could be increased
                    strategies.push({
                        token: opp.token,
                        action: 'supply',
                        amount: '0', // To be determined by user
                        expectedApy: opp.apy,
                        currentApy: opp.apy,
                        reason: 'Increase position to capture higher yields',
                        priority: this.calculatePriority(opp, healthFactor, riskLevel)
                    });
                }
            } else if (currentPosition) {
                // Consider withdrawing from low-yield positions
                strategies.push({
                    token: opp.token,
                    action: 'withdraw',
                    amount: currentPosition.supply,
                    expectedApy: 0,
                    currentApy: opp.apy,
                    reason: 'Current yield below threshold, consider reallocating',
                    priority: 1
                });
            }
        }

        return strategies;
    }

    private assessRisks(poolInfo: NaviPoolInfo): string[] {
        const risks: string[] = [];
        const utilizationRate = Number(poolInfo.totalBorrow) / Number(poolInfo.totalSupply);

        if (utilizationRate > 0.8) {
            risks.push('High utilization rate');
        }
        if (Number(poolInfo.totalSupply) < 1000) {
            risks.push('Low liquidity');
        }
        
        return risks;
    }

    private calculatePriority(opp: YieldOpportunity, healthFactor: number, riskLevel: number): number {
        let priority = opp.apy * 10; // Base priority from APY

        // Adjust based on risks
        priority -= opp.risks.length;

        // Adjust based on health factor
        if (healthFactor < 1.2) {
            priority -= 5;
        }

        // Adjust based on user risk level
        priority += riskLevel * 0.5;

        return Math.max(1, Math.min(10, priority));
    }
} 