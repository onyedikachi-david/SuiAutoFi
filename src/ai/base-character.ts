import { Character as ElizaCharacter, defaultCharacter, ModelProviderName, AgentRuntime } from "@elizaos/core";
import { DirectClient } from "@elizaos/client-direct";
import { initializeDatabase } from "../database";
import { initializeDbCache } from "../cache";

export class BaseCharacter {
    protected character: ElizaCharacter;
    protected runtime: AgentRuntime;
    private client: DirectClient;

    constructor(config: {
        name: string;
        description: string;
        instructions: string;
    }) {
        this.character = {
            ...defaultCharacter,
            name: config.name,
            bio: [config.description],
            system: config.instructions,
            modelProvider: ModelProviderName.OPENAI,
        };
        this.client = new DirectClient();
        this.initializeRuntime();
    }

    private async initializeRuntime() {
        const db = initializeDatabase("./data");
        await db.init();
        const cache = initializeDbCache(this.character, db);

        this.runtime = new AgentRuntime({
            databaseAdapter: db,
            token: process.env.OPENAI_API_KEY || "",
            modelProvider: this.character.modelProvider,
            character: this.character,
            plugins: [],
            cacheManager: cache,
            evaluators: [],
            providers: [],
            actions: [],
            services: [],
            managers: [],
        });

        await this.runtime.initialize();
        this.client.registerAgent(this.runtime);
        await this.client.start(3000);
    }

    protected async chat(prompt: string): Promise<string> {
        const response = await fetch(`http://localhost:3000/${this.character.name}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: prompt,
                userId: 'user',
                userName: 'User',
            }),
        });

        const data = await response.json();
        return data[0]?.text || '';
    }
} 