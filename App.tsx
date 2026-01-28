
import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, UserRole } from './types';
import Login from './pages/Login.tsx';
import Home from './pages/Home.tsx';
import AddCustomer from './pages/AddCustomer.tsx';
import MyCustomers from './pages/MyCustomers.tsx';
import MyEnquiries from './pages/MyEnquiries.tsx';
import ProjectPlanPage from './pages/ProjectPlan.tsx';
import ConversionPlanPage from './pages/ConversionPlan.tsx';
import RetentionPlanPage from './pages/RetentionPlan.tsx';
import AdminPanel from './pages/AdminPanel.tsx';
import { db } from './services/mockDb';

interface AuthContextType {
  user: User | null;
  login: (orgName: string, email: string, pass: string) => Promise<{ success: boolean, message?: string }>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading true for cloud sync
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const initCloud = async () => {
        try {
            await db.init(); // Pull data from cloud
        } catch (e) {
            console.error("Cloud init failed", e);
        } finally {
            setIsOffline(db.isOfflineMode());
            setIsLoading(false);
        }
    };
    initCloud();
  }, []);

  const login = async (orgName: string, email: string, pass: string) => {
    const cleanEmail = email.trim();
    const cleanPass = pass.trim();

    // 1. Try Super Admin Hardcoded (Fallback/Initial)
    if ((cleanEmail === 'keerthithiruvarasan@gmail.com' || cleanEmail === 'keerthithiruvarsan@gmail.com') && cleanPass === '123456789@Asdf') {
       let superAdmin = db.getUsers().find(u => u.role === UserRole.SUPER_ADMIN);
       
       // Fallback: If not found in synced data (e.g. fresh cloud DB), create ephemeral session
       if (!superAdmin) {
           superAdmin = {
             id: 'super_admin_session',
             name: 'Super Admin',
             email: cleanEmail,
             role: UserRole.SUPER_ADMIN,
             organizationId: 'system_global',
             organizationName: 'System',
             isApproved: true
           };
       }
       
       setUser(superAdmin);
       setCurrentPage('home');
       return { success: true };
    }

    // 2. Standard Login Logic (Checks Sync Data)
    const org = db.getOrganizations().find(o => o.name.toLowerCase() === orgName.trim().toLowerCase());
    if (!org) {
      return { success: false, message: "Organization not found." };
    }
    if (!org.isApproved) {
      return { success: false, message: "Organization is pending approval by Super Admin." };
    }

    // Check against synced user list (Password hashing should be added in real prod, using plain for transition compatibility)
    const found = db.getUsers().find(u => 
      u.organizationId === org.id &&
      u.email === cleanEmail && 
      u.password === cleanPass
    );

    // Alternative: You can uncomment this to use Real Firebase Auth if you migrate users to Firebase Auth
    // try { await db.login(email, pass); /* fetch user profile from firestore */ } catch(e) { ... }

    if (found) {
      if (!found.isApproved) {
        return { success: false, message: "Account locked or pending approval." };
      }
      setUser(found);
      setCurrentPage('home');
      return { success: true };
    }
    
    return { success: false, message: "Invalid User ID or Password for this Organization." };
  };

  const logout = () => {
    setUser(null);
    setCurrentPage('login');
    setEditingId(null);
  };

  const handleNavigate = (page: string) => {
    setEditingId(null); // Clear edit state when navigating manually
    setCurrentPage(page);
  };

  const handleEdit = (id: string, page: string) => {
    setEditingId(id);
    setCurrentPage(page);
  };

  const renderPage = () => {
    if (!user) return <Login onLogin={login} />;

    switch (currentPage) {
      case 'home': return <Home onNavigate={handleNavigate} />;
      case 'add-customer': return <AddCustomer onBack={() => handleNavigate('home')} />;
      case 'my-customers': return <MyCustomers onBack={() => handleNavigate('home')} />;
      case 'my-enquiries': return <MyEnquiries onBack={() => handleNavigate('home')} onEdit={handleEdit} />;
      case 'new-project': return <ProjectPlanPage onBack={() => handleNavigate('home')} editingId={editingId} />;
      case 'conversion': return <ConversionPlanPage onBack={() => handleNavigate('home')} editingId={editingId} />;
      case 'retention': return <RetentionPlanPage onBack={() => handleNavigate('home')} editingId={editingId} />;
      case 'admin': return <AdminPanel onBack={() => handleNavigate('home')} />;
      default: return <Home onNavigate={handleNavigate} />;
    }
  };

  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
              <h2 className="text-xl font-bold text-slate-800 animate-pulse">Connecting to Cloud Server...</h2>
              <p className="text-sm text-slate-500">Syncing sales data</p>
          </div>
      )
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      <div className="min-h-screen bg-slate-50 flex flex-col pb-16 md:pb-0 font-sans tracking-tight">
        {isOffline && (
          <div className="bg-yellow-100 border-b border-yellow-200 text-yellow-800 px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in slide-in-from-top">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Offline Mode: Data is saved locally. Configure Firebase in <code>services/firebaseConfig.ts</code> to sync.</span>
          </div>
        )}

        <header className="bg-white border-b sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-orange-200">T</div>
            <div>
              <h1 className="font-black text-slate-800 text-lg uppercase tracking-widest leading-none">Sales Tracker</h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enquiry Management</span>
                {!isOffline && !isLoading && (
                    <span className="bg-green-50 text-green-700 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-green-200">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    ONLINE
                    </span>
                )}
              </div>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-full mb-1">
                  {user.organizationName} • {user.role}
                </span>
                <p className="text-sm font-black text-slate-800 uppercase">{user.name}</p>
              </div>
              <button 
                onClick={logout}
                className="p-3 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100 shadow-sm"
                title="Logout"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto max-w-7xl mx-auto w-full p-4 md:p-8">
          {renderPage()}
        </main>

        {user && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t flex md:hidden items-center justify-around py-3 shadow-2xl z-50 px-4">
            <NavIcon active={currentPage === 'home'} onClick={() => handleNavigate('home')} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} label="Home" />
            <NavIcon active={currentPage === 'my-enquiries'} onClick={() => handleNavigate('my-enquiries')} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} label="Data" />
            {(user.role === UserRole.RSM || user.role === UserRole.ORG_ADMIN || user.role === UserRole.SUPER_ADMIN) && (
               <NavIcon active={currentPage === 'admin'} onClick={() => handleNavigate('admin')} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} label="Admin" />
            )}
          </nav>
        )}
      </div>
    </AuthContext.Provider>
  );
};

const NavIcon: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${active ? 'text-orange-600 bg-orange-50' : 'text-slate-400'}`}>
    {icon}
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
