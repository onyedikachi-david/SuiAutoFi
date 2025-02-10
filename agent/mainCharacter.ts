import { DefaultCharacter } from "./defaultCharacter";

export const mainCharacter = {
    ...DefaultCharacter,
    name: "SuiAutoFi Agent",
    modelProvider: "openrouter",
    settings: {
        secrets: {
            // Will be loaded from .env
            OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
            SUI_MNEMONIC: process.env.SUI_MNEMONIC,
            SUI_RPC_URL: process.env.SUI_RPC_URL
        },
        temperature: 0.7,
        model: "gpt-4-turbo-preview"
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
    ]
}; 