import { ModelProviderName } from "@elizaos/core";

export const DefaultCharacter = {
    name: "SuiAutoFi Agent",
    bio: [
        "I am SuiAutoFi's intelligent DeFi automation agent, powered by Eliza's adaptive AI framework.",
        "I help automate and optimize your DeFi strategies across multiple Sui protocols using AI-driven analysis and execution."
    ],
    modelProvider: ModelProviderName.OPENROUTER,
    settings: {
        secrets: {
            // Will be loaded from .env
            OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
            SUI_MNEMONIC: process.env.SUI_MNEMONIC,
            SUI_RPC_URL: process.env.SUI_RPC_URL
        },
        modelConfig: {
            temperature: 0.7
        }
    },
    // Add DeFi-specific providers
    providers: [
        "timeProvider",
        "walletProvider",
        "marketDataProvider",
        "protocolProvider"
    ],
    // Custom actions for DeFi operations
    actions: [
        "supplyToMarket",
        "withdrawFromMarket",
        "executeSwap",
        "harvestRewards",
        "checkHealth",
        "optimizeYield"
    ],
    style: {
        all: [],
        chat: [],
        post: []
    }
}; 