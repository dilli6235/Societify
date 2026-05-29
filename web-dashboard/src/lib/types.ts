// Shared API types — mirror the backend's response envelope and domain models.
// (In a larger setup these would be generated from the API's OpenAPI/zod schemas.)

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unread?: number;
}

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

export interface Block {
  id: string;
  name: string;
  totalFloors: number | null;
  _count?: { units: number };
}

export interface UnitResident {
  id: string;
  role: 'OWNER' | 'TENANT' | 'FAMILY_MEMBER';
  isPrimary: boolean;
  user: { id: string; fullName: string; email: string; phone: string | null };
}

export interface Unit {
  id: string;
  unitNumber: string;
  floor: number | null;
  type: string;
  carpetAreaSqft?: string | number | null;
  occupancyStatus: 'OWNER_OCCUPIED' | 'RENTED' | 'VACANT';
  block?: { id: string; name: string };
  residencies?: UnitResident[];
}

export interface UserRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: 'PENDING' | 'ACTIVE' | 'DISABLED';
  roles: SystemRole[];
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  totalAmount: string;
  amountPaid: string;
  dueDate: string;
  issueDate: string;
  unit?: {
    id: string;
    unitNumber: string;
    residencies?: { user: { id: string; fullName: string; email: string; phone: string | null } }[];
  };
  taxAmount?: string;
  lateFee?: string;
  subtotal?: string;
  lineItems?: { id: string; description: string; quantity: string; unitPrice: string; amount: string }[];
  payments?: { id: string; amount: string; status: string; method: string; gatewayProvider: string | null; paidAt: string | null }[];
}

export interface DashboardSummary {
  society: { name: string };
  kpis: {
    units: number;
    people: number;
    openComplaints: number;
    billedThisMonth: number;
    collectedThisMonth: number;
    pendingThisMonth: number;
    expensesThisMonth: number;
    netBalance: number;
    paidUnits: number;
    billedUnits: number;
    collectionRate: number;
    overdueCount: number;
    overdueAmount: number;
    voucherCount: number;
  };
  perUnit: { method: 'FIXED' | 'PER_SQFT'; fixedAmount?: number; ratePerSqft?: number };
  series: { label: string; collected: number; pending: number; expenses: number }[];
  expenseByCategory: { category: string; total: number }[];
  pendingFlats: {
    id: string;
    invoiceNumber: string;
    unitNumber: string;
    blockName: string | null;
    resident: string | null;
    outstanding: number;
    status: string;
    dueDate: string;
  }[];
}

export interface Complaint {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
  createdAt: string;
  raisedBy?: { id: string; fullName: string };
  assignedTo?: { id: string; fullName: string } | null;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  priority: 'INFO' | 'IMPORTANT' | 'EMERGENCY';
  isPinned: boolean;
  publishedAt: string;
  expiresAt: string | null;
}

export interface Amenity {
  id: string;
  name: string;
  description: string | null;
  bookingFee: string;
  isActive: boolean;
}

export interface Poll {
  id: string;
  question: string;
  isMultiple: boolean;
  isClosed: boolean;
  closesAt: string | null;
  options: { id: string; text: string; votes?: number }[];
  totalVotes?: number;
  hasVoted?: boolean;
  myOptionIds?: string[];
}

export interface GatePass {
  id: string;
  type: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'CHECKED_IN' | 'CHECKED_OUT';
  visitorName: string;
  visitorPhone: string | null;
  createdAt: string;
  unit?: { id: string; unitNumber: string } | null;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}
