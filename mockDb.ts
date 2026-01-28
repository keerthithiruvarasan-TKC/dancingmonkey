
import { User, Customer, AnyPlan, Organization, Attachment, UserRole } from '../types';
import { db as firestore, auth, storage, firebaseConfig } from './firebaseConfig';
import { 
  collection, getDocs, doc, setDoc, updateDoc
} from 'firebase/firestore';
import { 
  ref, uploadString, getDownloadURL 
} from 'firebase/storage';
import { signInWithEmailAndPassword } from 'firebase/auth';

/**
 * DATABASE SERVICE (Hybrid: Cloud + Local Fallback)
 * 
 * Strategy:
 * 1. Try to connect to Google Cloud Firestore on init.
 * 2. If connection fails (permissions/config error), fallback to "Offline Mode" (Local Storage).
 * 3. If connected, act as a Write-Through Cache (Read from Memory, Write to Cloud).
 */

interface AppData {
  organizations: Organization[];
  users: User[];
  customers: Customer[];
  plans: AnyPlan[];
}

const INITIAL_DATA: AppData = {
  organizations: [],
  users: [],
  customers: [],
  plans: []
};

// Helper to sanitize Firestore data (convert Timestamps to strings, remove Refs)
const sanitizeDoc = (data: any): any => {
    if (!data) return data;
    if (typeof data !== 'object') return data;
    
    // Handle Arrays
    if (Array.isArray(data)) return data.map(sanitizeDoc);

    // Handle Firestore Timestamp
    if (data.toDate && typeof data.toDate === 'function') {
        return data.toDate().toISOString();
    }

    // Handle Firestore DocumentReference (Circular!)
    if (data.firestore && data.path) {
        return data.path; // Store path string instead of ref object
    }

    // Handle Objects
    const clean: any = {};
    Object.keys(data).forEach(key => {
        clean[key] = sanitizeDoc(data[key]);
    });
    return clean;
};

class DatabaseService {
  private data: AppData;
  private initialized: boolean = false;
  private isOffline: boolean = false;

  constructor() {
    this.data = INITIAL_DATA;
  }

  /**
   * Syncs data from Google Cloud Firestore into local memory.
   * Falls back to Local Storage if Cloud connection fails.
   */
  async init() {
    if (this.initialized) return;

    // PRE-EMPTIVE CHECK: If config is still placeholder, skip cloud entirely to avoid SDK errors
    // Matches "your-project-id" (old default) OR "your-real-project-id" (current default in firebaseConfig.ts)
    const isPlaceholder = 
        firebaseConfig.projectId === "your-project-id" || 
        firebaseConfig.projectId === "your-real-project-id" || 
        firebaseConfig.apiKey.includes("YOUR-API-KEY") ||
        firebaseConfig.apiKey.includes("YOUR-REAL-API-KEY");

    if (isPlaceholder) {
        console.warn("Detected placeholder Firebase Config. Skipping Cloud Connection and forcing Offline Mode.");
        this.isOffline = true;
        this.loadFromLocal();
        this.initialized = true;
        this.ensureSuperAdmin();
        return;
    }

    try {
      console.log("Attempting to sync data from Cloud...");
      
      const [orgsSnap, usersSnap, custSnap, plansSnap] = await Promise.all([
        getDocs(collection(firestore, 'organizations')),
        getDocs(collection(firestore, 'users')),
        getDocs(collection(firestore, 'customers')),
        getDocs(collection(firestore, 'plans'))
      ]);

      // Sanitize incoming data to remove any potential circular refs or non-serializable types
      this.data.organizations = orgsSnap.docs.map(d => sanitizeDoc(d.data()) as Organization);
      this.data.users = usersSnap.docs.map(d => sanitizeDoc(d.data()) as User);
      this.data.customers = custSnap.docs.map(d => sanitizeDoc(d.data()) as Customer);
      this.data.plans = plansSnap.docs.map(d => sanitizeDoc(d.data()) as AnyPlan);

      this.isOffline = false;
      console.log("Cloud Sync Complete. Online Mode.");
    } catch (e: any) {
      // FIX: Log only the message to prevent 'Converting circular structure to JSON' if 'e' contains Firestore instance refs
      console.warn("Cloud connection failed. Switching to Offline Mode (Local Storage). Error:", e.message || e);
      this.isOffline = true;
      this.loadFromLocal();
    } finally {
      this.initialized = true;
      this.ensureSuperAdmin();
    }
  }

  // Check if running in offline/demo mode
  public isOfflineMode(): boolean {
      return this.isOffline;
  }

  // --- Ensure Super Admin Exists (In-Memory) ---
  private ensureSuperAdmin() {
    const superEmail = 'keerthithiruvarasan@gmail.com';
    const altEmail = 'keerthithiruvarsan@gmail.com';
    
    const exists = this.data.users.find(u => 
        (u.email === superEmail || u.email === altEmail) && 
        u.role === UserRole.SUPER_ADMIN
    );

    if (!exists) {
        console.log("Injecting Super Admin into memory (Fallback)");
        this.data.users.push({
            id: 'super_admin_fallback',
            name: 'Keerthi (Super Admin)',
            email: superEmail,
            password: '123456789@Asdf', // Used for reference, actual auth check is in App.tsx
            role: UserRole.SUPER_ADMIN,
            organizationId: 'system_global',
            organizationName: 'System',
            isApproved: true
        });
    }
  }

  // --- Offline Fallback Helpers ---
  private loadFromLocal() {
    const saved = localStorage.getItem('sales_tracker_offline_data');
    if (saved) {
      try {
        this.data = JSON.parse(saved);
      } catch (e) {
        console.error("Corrupt local data", e);
        this.seedOfflineData();
      }
    } else {
      this.seedOfflineData();
    }
  }

  private seedOfflineData() {
    // Seed essential data for the app to function offline
    this.data = {
      organizations: [],
      customers: [],
      plans: [],
      users: [] // Super admin added by ensureSuperAdmin
    };
    this.saveToLocal();
  }

  private saveToLocal() {
    if (this.isOffline) {
      try {
          // Double safety: if data somehow got dirty with circular refs, catch it
          localStorage.setItem('sales_tracker_offline_data', JSON.stringify(this.data));
      } catch (e) {
          console.error("Failed to save to local storage (Circular Ref suspected). Resetting local cache.", e);
          // If save fails, we might want to sanitize current data or just not save
      }
    }
  }

  // --- Helper to handle File Uploads ---
  private async uploadAttachments(attachments?: Attachment[]): Promise<Attachment[]> {
    if (!attachments || attachments.length === 0) return [];
    
    // If offline, just keep base64 data strings (limited storage warning)
    if (this.isOffline) return attachments;

    const uploaded: Attachment[] = [];
    for (const file of attachments) {
      if (file.data.startsWith('http')) {
        uploaded.push(file);
        continue;
      }

      const path = `attachments/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      
      try {
        await uploadString(storageRef, file.data, 'data_url');
        const url = await getDownloadURL(storageRef);
        uploaded.push({ ...file, data: url });
      } catch (e) {
        console.error("File upload failed", e);
        uploaded.push(file); // Fallback: keep original data
      }
    }
    return uploaded;
  }

  // --- READ METHODS (Synchronous - Served from Cache) ---
  getOrganizations(): Organization[] { return this.data.organizations; }
  getUsers(): User[] { return this.data.users; }
  getCustomers(): Customer[] { return this.data.customers; }
  getPlans(): AnyPlan[] { return this.data.plans; }

  // --- WRITE METHODS (Async - Cloud w/ Fallback) ---

  async addOrganization(org: Organization) {
    this.data.organizations.push(org);
    if (this.isOffline) {
      this.saveToLocal();
    } else {
      try {
        await setDoc(doc(firestore, 'organizations', org.id), org);
      } catch (e) {
        console.error("Cloud write failed", e);
        this.isOffline = true; // Switch to offline on failure
        this.saveToLocal();
      }
    }
  }

  async updateOrganization(id: string, updates: Partial<Organization>) {
    this.data.organizations = this.data.organizations.map(o => o.id === id ? { ...o, ...updates } : o);
    if (this.isOffline) {
      this.saveToLocal();
    } else {
      try {
        await updateDoc(doc(firestore, 'organizations', id), updates);
      } catch (e) {
        console.error("Cloud write failed", e);
        this.isOffline = true;
        this.saveToLocal();
      }
    }
  }

  async addUser(user: User) {
    this.data.users.push(user);
    if (this.isOffline) {
      this.saveToLocal();
    } else {
      try {
        await setDoc(doc(firestore, 'users', user.id), user);
      } catch (e) {
        console.error("Cloud write failed", e);
        this.isOffline = true;
        this.saveToLocal();
      }
    }
  }

  async updateUser(userId: string, updates: Partial<User>) {
    this.data.users = this.data.users.map(u => u.id === userId ? { ...u, ...updates } : u);
    if (this.isOffline) {
      this.saveToLocal();
    } else {
      try {
        await updateDoc(doc(firestore, 'users', userId), updates);
      } catch (e) {
        console.error("Cloud write failed", e);
        this.isOffline = true;
        this.saveToLocal();
      }
    }
  }

  async addCustomer(customer: Customer) {
    this.data.customers.push(customer);
    if (this.isOffline) {
      this.saveToLocal();
    } else {
      try {
        await setDoc(doc(firestore, 'customers', customer.id), customer);
      } catch (e) {
        console.error("Cloud write failed", e);
        this.isOffline = true;
        this.saveToLocal();
      }
    }
  }

  async addPlan(plan: AnyPlan) {
    // Handle attachments first
    const processedAttachments = await this.uploadAttachments(plan.attachments);
    const planToSave = { ...plan, attachments: processedAttachments };

    // Update Local Cache Immediately
    this.data.plans.push(planToSave);

    if (this.isOffline) {
      this.saveToLocal();
    } else {
      try {
        await setDoc(doc(firestore, 'plans', plan.id), planToSave);
      } catch (e) {
        console.error("Cloud write failed", e);
        this.isOffline = true;
        this.saveToLocal();
      }
    }
  }

  async updatePlan(planId: string, updates: Partial<AnyPlan>) {
    if (updates.attachments) {
        updates.attachments = await this.uploadAttachments(updates.attachments);
    }

    // Update Local Cache
    this.data.plans = this.data.plans.map(p => 
      p.id === planId ? { ...p, ...updates } as AnyPlan : p
    );

    if (this.isOffline) {
      this.saveToLocal();
    } else {
      try {
        await updateDoc(doc(firestore, 'plans', planId), updates);
      } catch (e) {
        console.error("Cloud write failed", e);
        this.isOffline = true;
        this.saveToLocal();
      }
    }
  }

  // --- AUTH HELPER ---
  async login(email: string, pass: string) {
     if (this.isOffline) {
       // Mock login for offline mode
       return Promise.reject("Offline mode: Use local data validation");
     }
     return signInWithEmailAndPassword(auth, email, pass);
  }
}

export const db = new DatabaseService();
