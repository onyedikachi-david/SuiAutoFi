import { Provider } from './types.ts';

export class TimeProvider implements Provider {
    name = 'timeProvider';

    async getContext() {
        const now = new Date();
        return {
            currentTime: now.toISOString(),
            timestamp: now.getTime(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            marketHours: this.getMarketHours()
        };
    }

    private getMarketHours() {
        const now = new Date();
        const hour = now.getUTCHours();
        // Crypto markets are 24/7
        return {
            isOpen: true,
            is24Hour: true,
            currentHour: hour
        };
    }
} 