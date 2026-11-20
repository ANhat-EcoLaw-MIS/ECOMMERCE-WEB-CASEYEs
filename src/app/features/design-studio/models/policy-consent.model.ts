export interface ContentPolicyConsent {
  readonly consentId: string;
  readonly userSessionId: string;
  readonly userId?: string;
  readonly designId?: string;
  readonly uploadedImageId: string;
  readonly policyVersion: string; // e.g. 'v1.0'
  readonly ipAddress?: string;
  readonly acceptedAtUtc: string;
}

export interface BannedKeyword {
  readonly id: string;
  readonly keyword: string;
  readonly violationGroup: 'profanity' | 'trademark' | 'hate_speech';
  readonly reasonMessage: string;
}
