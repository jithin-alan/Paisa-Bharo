/**
 * Provider callback processor that:
 * 1. Records every provider transaction in Firestore for duplicate prevention
 * 2. Credits the wallet atomically in the same Firestore transaction
 * 3. Works across multiple server instances (not in-memory)
 */
interface ProviderCallbackInput {
    provider: 'adgem' | 'bitlabs' | 'cint' | 'affiliate';
    transactionId: string;
    userId: string;
    coinsAwarded: number;
    reason: string;
    metadata?: Record<string, any>;
}
interface ProviderCallbackResult {
    success: boolean;
    status: 'credited' | 'duplicate' | 'invalid_signature' | 'error';
    message: string;
    transactionId: string;
    userId: string;
    coinsAwarded: number;
    newBalance?: number;
}
/**
 * Processes a provider callback with atomic Firestore wallet transaction.
 * Uses Firestore transaction to prevent duplicate processing across instances.
 */
export declare function processProviderCallback(input: ProviderCallbackInput): Promise<ProviderCallbackResult>;
export {};
//# sourceMappingURL=providerCallbacks.d.ts.map