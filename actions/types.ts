export interface Action {
    name: string;
    description: string;
    execute: (params: Record<string, any>, context: Record<string, any>) => Promise<{
        success: boolean;
        result?: any;
        error?: string;
    }>;
    validate?: (params: Record<string, any>) => Promise<boolean>;
} 