export const TERMS_VERSION = '2026-11-20';
export const PRIVACY_POLICY_VERSION = '2026-11-20';

export function getLegalDocumentUrls(baseUrlOverride?: string): {
  termsOfServiceUrl: string;
  privacyPolicyUrl: string;
} {
  const rawBase =
    typeof baseUrlOverride === 'string'
      ? baseUrlOverride
      : ((import.meta as any).env?.VITE_LEGAL_BASE_URL as string | undefined) || '';

  const normalizedBase = rawBase.trim().replace(/\/+$/, '');

  if (normalizedBase) {
    return {
      termsOfServiceUrl: `${normalizedBase}/terms-of-service.html`,
      privacyPolicyUrl: `${normalizedBase}/privacy-policy.html`,
    };
  }

  return {
    termsOfServiceUrl: '/terms',
    privacyPolicyUrl: '/privacy',
  };
}
