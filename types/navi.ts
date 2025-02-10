export interface CoinInfo {
    symbol: string;
    decimal: number;
    address: string;
}

export interface NaviQuote {
    routes: Array<{
        outAmount: string;
        path: string[];
    }>;
}

export interface NaviPoolInfo {
    base_supply_rate: string;
    boosted_supply_rate: string;
    totalSupply: string;
    totalBorrow: string;
    availableLiquidity: string;
    utilization_rate?: number;
    supply_cap?: string;
    borrow_cap?: string;
}

export interface NaviReward {
    rewardToken: string;
    amount: string;
    timestamp: number;
}

export interface NaviRewardHistory {
    page: number;
    size: number;
    total: number;
    rewards: NaviReward[];
}

export interface NaviAvailableRewards {
    [token: string]: string;
}

export interface YieldStrategy {
    token: string;
    action: 'supply' | 'withdraw' | 'swap';
    amount: string;
    expectedApy: number;
    currentApy?: number;
    reason: string;
    priority: number;
}

export interface YieldOpportunity {
    token: string;
    protocol: string;
    apy: number;
    availableLiquidity: string;
    rewardTokens: string[];
    risks: string[];
    requirements?: {
        minAmount?: string;
        maxAmount?: string;
        collateralRequired?: boolean;
    };
}

export enum Dex {
    CETUS = 'cetus',
    TURBOS = 'turbos',
    KRIYA_V2 = 'kriyaV2',
    KRIYA_V3 = 'kriyaV3',
    AFTERMATH = 'aftermath',
    DEEPBOOK = 'deepbook',
    BLUEFIN = 'bluefin'
}

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
    }
} as const; 