
export interface Recipient {
  id: string;
  email: string;
  name: string;
  company?: string;
  role?: string;
  customData: Record<string, string>;
}

export interface EmailDraft {
  recipientId: string;
  subject: string;
  body: string;
  status: 'pending' | 'generating' | 'ready' | 'sent' | 'error';
}

export interface CampaignState {
  serviceDescription: string;
  recipients: Recipient[];
  drafts: Record<string, EmailDraft>;
  isGenerating: boolean;
  isSending: boolean;
}
