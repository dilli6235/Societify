export type SystemRole =
  | 'SUPER_ADMIN'
  | 'SOCIETY_ADMIN'
  | 'COMMITTEE_MEMBER'
  | 'RESIDENT'
  | 'SECURITY_GUARD'
  | 'FACILITY_ADMIN'
  | 'VENDOR';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  societyId: string | null;
  roles: SystemRole[];
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  priority: string;
  category: string | null;
  attachments: string[];
  isPinned: boolean;
  publishedAt: string;
}

export interface GatePass {
  id: string;
  type: string;
  status: string;
  visitorName: string;
  visitorPhone: string | null;
  otpCode: string | null;
  createdAt: string;
  unit?: { id: string; unitNumber: string } | null;
}

export interface Complaint {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
}

export interface Unit {
  id: string;
  unitNumber: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  totalAmount: string;
  amountPaid: string;
  dueDate: string;
  issueDate: string;
  unit?: { id: string; unitNumber: string };
}
