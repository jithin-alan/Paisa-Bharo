import { doc, runTransaction, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { LedgerTransaction, TransactionType, TransactionStatus, LedgerType, CoinBalanceProjection } from '../../types/wallet';

const TRANSACTIONS_COL = 'ledger_transactions';
const BALANCE_COL = 'user_balances';

export class WalletLedger {
  static async writeTransaction(tx: Omit<LedgerTransaction, 'id' | 'createdAt'> & { idempotencyKey: string }): Promise<LedgerTransaction> {
    // Idempotency check
    const q = query(collection(db, TRANSACTIONS_COL), where('idempotencyKey', '==', tx.idempotencyKey));
    const existing = await getDocs(q);
    if (!existing.empty) {
      const docSnap = existing.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as LedgerTransaction;
    }

    const id = `${tx.userId}_${tx.idempotencyKey}_${Date.now()}`;
    const record: LedgerTransaction = {
      ...tx,
      id,
      createdAt: new Date().toISOString(),
      status: tx.status ?? 'pending'
    };
    await runTransaction(db, async (t) => {
      const ref = doc(db, TRANSACTIONS_COL, id);
      t.set(ref, record);
    });
    return record;
  }

  static async getBalanceProjection(userId: string): Promise<CoinBalanceProjection> {
    // Simplified projection from ledger
    const q = query(collection(db, TRANSACTIONS_COL), where('userId', '==', userId), where('ledgerType', '==', 'coin'), where('status', '==', 'completed'));
    const snaps = await getDocs(q);
    let available = 0;
    let pending = 0;
    let lifetime = 0;
    let reversed = 0;
    let reserved = 0;

    snaps.forEach(s => {
      const d = s.data() as LedgerTransaction;
      const amt = d.amount;
      switch (d.type) {
        case 'credit':
          lifetime += amt;
          available += amt;
          break;
        case 'debit':
          available -= amt;
          break;
        case 'reversal':
          reversed += Math.abs(amt);
          available += amt; // amt negative
          break;
        case 'adjustment':
          available += amt;
          break;
      }
    });

    return { availableCoins: Math.max(0, available), pendingCoins: pending, lifetimeEarned: lifetime, reversedCoins: reversed, reservedCoins: reserved };
  }
}

export default WalletLedger;
