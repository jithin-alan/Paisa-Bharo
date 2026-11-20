import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, FirestoreErrorInfo, OperationType } from '../firebase/config';
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from '../config/legalLinks';

export type ConsentAuthMethod = 'phone' | 'email' | 'google';

export interface UserConsentRecord<TTimestamp = unknown> {
  uid: string;
  consentStatus: 'accepted';
  consentedAt: TTimestamp;
  termsVersion: string;
  privacyPolicyVersion: string;
  authMethod: ConsentAuthMethod;
}

export interface ConsentWriteDeps {
  getExistingDoc?: (docId: string) => Promise<boolean>;
  writeDoc?: (docId: string, payload: UserConsentRecord) => Promise<void>;
  serverTime?: () => unknown;
}

export interface RecordConsentResult {
  recorded: boolean;
  alreadyRecorded?: boolean;
  docId: string;
  error?: string;
}

export function buildConsentDocId(
  uid: string,
  termsVersion: string = TERMS_VERSION,
  privacyPolicyVersion: string = PRIVACY_POLICY_VERSION
): string {
  const cleanUid = uid.trim();
  if (!cleanUid || !/^[a-zA-Z0-9_-]+$/.test(cleanUid)) {
    throw new Error('Invalid Firebase UID for consent record');
  }
  return `${cleanUid}_${termsVersion}_${privacyPolicyVersion}`;
}

export function buildConsentPayload<TTimestamp>(
  uid: string,
  authMethod: ConsentAuthMethod,
  consentedAt: TTimestamp,
  termsVersion: string = TERMS_VERSION,
  privacyPolicyVersion: string = PRIVACY_POLICY_VERSION
): UserConsentRecord<TTimestamp> {
  return {
    uid: uid.trim(),
    consentStatus: 'accepted',
    consentedAt,
    termsVersion,
    privacyPolicyVersion,
    authMethod,
  };
}

function logConsentFirestoreError(error: unknown, operationType: OperationType, docId: string): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path: `user_consents/${docId}`,
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
  };
  console.warn('Firestore Consent Notice:', JSON.stringify(errInfo));
}

export async function recordUserConsent(
  uid: string,
  authMethod: ConsentAuthMethod,
  deps?: ConsentWriteDeps
): Promise<RecordConsentResult> {
  const docId = buildConsentDocId(uid, TERMS_VERSION, PRIVACY_POLICY_VERSION);

  const getExistingDoc =
    deps?.getExistingDoc ??
    (async (id: string) => {
      const snap = await getDoc(doc(db, 'user_consents', id));
      return snap.exists();
    });

  const writeDoc =
    deps?.writeDoc ??
    (async (id: string, payload: UserConsentRecord) => {
      await setDoc(doc(db, 'user_consents', id), payload);
    });

  const getServerTime = deps?.serverTime ?? (() => serverTimestamp());

  try {
    const exists = await getExistingDoc(docId);
    if (exists) {
      return { recorded: true, alreadyRecorded: true, docId };
    }
  } catch (readErr) {
    // Proceed to attempt create if read fails (e.g. cold cache) and let rules decide
    logConsentFirestoreError(readErr, OperationType.GET, docId);
  }

  const payload = buildConsentPayload(uid, authMethod, getServerTime());

  try {
    await writeDoc(docId, payload);
    return { recorded: true, alreadyRecorded: false, docId };
  } catch (writeErr) {
    logConsentFirestoreError(writeErr, OperationType.CREATE, docId);
    return {
      recorded: false,
      docId,
      error: writeErr instanceof Error ? writeErr.message : String(writeErr),
    };
  }
}
