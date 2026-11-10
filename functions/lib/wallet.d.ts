/**
 * Helper to atomically update user coins with validation
 */
declare function updateUserCoins(userId: string, coinDelta: number, reason: string, metadata?: Record<string, any>): Promise<{
    newBalance: number;
    newLifetime: number;
}>;
export { updateUserCoins };
//# sourceMappingURL=wallet.d.ts.map