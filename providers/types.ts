export interface Provider {
    name: string;
    getContext: () => Promise<Record<string, any>>;
    initialize?: () => Promise<void>;
    cleanup?: () => Promise<void>;
} 