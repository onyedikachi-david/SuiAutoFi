import type { Character as ElizaCharacter } from '@elizaos/core';

export interface Character extends ElizaCharacter {
    providers?: any[];
    actions?: any[];
} 