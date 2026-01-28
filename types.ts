
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN', // Global Admin (Keerthi)
  ORG_ADMIN = 'ORG_ADMIN',     // Organization Admin
  RSM = 'RSM',
  SALES_ENG = 'SALES ENG',
  DEALER = 'DEALER',
  DSE = 'DSE' // Dealer Sales Engineer
}

export interface Organization {
  id: string;
  name: string;
  adminEmail: string;
  isApproved: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  email: string; // Login ID
  password?: string;
  role: UserRole;
  name: string;
  organizationId: string; // Link to specific organization
  organizationName: string;
  isApproved: boolean; // For Org Admin mainly, sub-users are created approved
  parentId?: string; // The ID of the person they report to (DSE->Dealer, Dealer->SE, etc)
}

export interface Customer {
  id: string;
  createdBy: string;
  organizationId: string;
  name: string;
  address: string;
  pinCode: string;
  contactPerson: string;
  contactNumber: string;
  businessSector: string;
  tungaloyShare: number;
  annualPotential: number;
  competitors: {
    name: string;
    share: number;
  }[];
  fyPlan: string;
}

export enum PlanType {
  NEW_PROJECT = 'NEW PROJECT',
  CONVERSION = 'CONVERSION',
  RETENTION = 'RETENTION'
}

export interface Attachment {
  name: string;
  data: string; // Base64 or URL
  type: 'photo' | 'document';
}

export interface AIParameter {
  category: string;
  parameter: string;
  unit: string;
  description: string;
  value: string; // User entered value
}

export interface UpdateLogEntry {
  status: string;
  updatedBy: string; // Name of the user
  updatedById: string; // ID of the user
  timestamp: string;
}

export interface BasePlan {
  id: string;
  type: PlanType;
  customerId: string;
  organizationId: string; // Data isolation
  projectName: string;
  machineType: string;
  machineManufacturer?: string; // Added for AI context
  machineAiParameters?: AIParameter[]; // Added for AI captured data
  machineDetail: string; // General Detail
  sqShankSize?: string; // Optional/Deprecated
  spindleTaper?: string; // Optional/Deprecated
  componentMaterial: string;
  materialHardness: string;
  inputCondition: string;
  status: string;
  updateStatus?: string; // New field for specific updates (Order Won, Trial Planned, etc.)
  updateStatusLog?: UpdateLogEntry[]; // Audit log for updateStatus
  responsibility: string;
  createdAt: string;
  createdBy: string;
  valueLakhs: number;
  attachments?: Attachment[];
  customFields?: Record<string, string>; // For user-added columns in My Enquiries
}

export interface ProjectPlan extends BasePlan {
  cycleTime: boolean; // Changed to boolean tick
  toolList: boolean;  // Changed to boolean tick
  requiredDate: string;
}

export interface ConversionPlan extends BasePlan {
  existingCompetitor: string;
  competitorProduct: string;
  unitPrice: number;
  monthlyQty?: number; // Added
  reasonForConversion: string;
  machineDetails?: string; // Specific field requested
  operation?: string; // Added Operation field
  solutionType?: 'TUNGALOY' | 'NTK';
  catalogItemDescription?: string;
  aiParameters?: AIParameter[];
}

export interface RetentionPlan extends BasePlan {
  tungaloyProductDesc: string;
  reasonForTrial: string;
  competitorName: string;
  competitorProductDesc: string;
  operation: string;
  solutionType?: 'TUNGALOY' | 'NTK';
  catalogItemDescription?: string;
  aiParameters?: AIParameter[];
  unitPrice?: number; // Added
  monthlyQty?: number; // Added
}

export type AnyPlan = ProjectPlan | ConversionPlan | RetentionPlan;
