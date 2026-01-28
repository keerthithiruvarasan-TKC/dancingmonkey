
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { db } from '../services/mockDb';

interface LoginProps {
  onLogin: (orgName: string, email: string, pass: string) => Promise<{ success: boolean, message?: string }>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'individual' | 'org_admin' | 'org_register'>('individual');
  const [isLoading, setIsLoading] = useState(false);
  
  // Login Fields
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register Fields
  const [regOrgName, setRegOrgName] = useState('');
  const [regAdminId, setRegAdminId] = useState('');
  const [regPassword, setRegPassword] = useState('');

  useEffect(() => {
    const savedOrg = localStorage.getItem('last_org_name');
    if (savedOrg) setOrgName(savedOrg);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    localStorage.setItem('last_org_name', orgName);
    
    try {
      const result = await onLogin(orgName, email, password);
      if (!result.success) {
        alert(result.message);
      }
    } catch (e) {
      alert("Login Error: " + e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrgRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Check if org exists in local sync
    const exists = db.getOrganizations().some(o => o.name.toLowerCase() === regOrgName.toLowerCase());
    if (exists) {
      alert("Organization name already registered.");
      setIsLoading(false);
      return;
    }

    const newOrgId = Math.random().toString(36).substr(2, 9);
    
    // Create Organization (Pending Approval)
    await db.addOrganization({
      id: newOrgId,
      name: regOrgName,
      adminEmail: regAdminId,
      isApproved: false,
      createdAt: new Date().toISOString()
    });

    // Create Org Admin User
    await db.addUser({
      id: Math.random().toString(36).substr(2, 9),
      email: regAdminId,
      password: regPassword,
      name: 'Organization Admin',
      role: UserRole.ORG_ADMIN,
      organizationId: newOrgId,
      organizationName: regOrgName,
      isApproved: true // Admin is approved for the org, but org itself needs super admin approval
    });

    alert("Organization registered! Please wait for Super Admin (Keerthi) to approve.");
    setActiveTab('org_admin');
    setOrgName(regOrgName);
    setEmail(regAdminId);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-block p-3 bg-orange-100 rounded-2xl mb-2">
             <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">T</div>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Sales Tracker</h2>
          <div className="flex justify-center gap-4 text-xs font-bold text-slate-400 border-b border-slate-100 pb-2">
             <button onClick={() => setActiveTab('individual')} className={`uppercase tracking-widest pb-2 px-2 transition-all ${activeTab === 'individual' ? 'text-orange-600 border-b-2 border-orange-600' : 'hover:text-slate-600'}`}>User</button>
             <button onClick={() => setActiveTab('org_admin')} className={`uppercase tracking-widest pb-2 px-2 transition-all ${activeTab === 'org_admin' ? 'text-orange-600 border-b-2 border-orange-600' : 'hover:text-slate-600'}`}>Admin</button>
             <button onClick={() => setActiveTab('org_register')} className={`uppercase tracking-widest pb-2 px-2 transition-all ${activeTab === 'org_register' ? 'text-orange-600 border-b-2 border-orange-600' : 'hover:text-slate-600'}`}>Register</button>
          </div>
        </div>

        {(activeTab === 'individual' || activeTab === 'org_admin') && (
          <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in">
             <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Organization Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-500 outline-none font-semibold" 
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="Required for Standard Users"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">{activeTab === 'org_admin' ? 'Admin Login ID' : 'User Login ID'}</label>
              <input 
                type="email" 
                required 
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-500 outline-none font-semibold" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Password</label>
              <input 
                type="password" 
                required 
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-500 outline-none font-semibold" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button disabled={isLoading} className={`w-full text-white font-bold py-4 rounded-xl shadow-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 mt-4 ${activeTab === 'org_admin' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-orange-600 hover:bg-orange-700'} ${isLoading ? 'opacity-70' : ''}`}>
              {isLoading ? 'Verifying...' : (activeTab === 'org_admin' ? 'Admin Sign In' : 'User Sign In')}
              {!isLoading && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">
              {activeTab === 'org_admin' 
                ? 'Login to manage users and organization settings.' 
                : 'Login to track your sales and enquiries.'}
            </p>
          </form>
        )}

        {activeTab === 'org_register' && (
          <form onSubmit={handleOrgRegister} className="space-y-4 animate-in fade-in">
             <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">New Organization Name</label>
              <input 
                type="text" 
                required 
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-500 outline-none font-semibold" 
                value={regOrgName}
                onChange={e => setRegOrgName(e.target.value)}
                placeholder="e.g. My Company Ltd"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Admin Login ID</label>
              <input 
                type="email" 
                required 
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-500 outline-none font-semibold" 
                value={regAdminId}
                onChange={e => setRegAdminId(e.target.value)}
                placeholder="admin@mycompany.com"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Admin Password</label>
              <input 
                type="password" 
                required 
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-500 outline-none font-semibold" 
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                placeholder="Create strong password"
              />
            </div>

            <button disabled={isLoading} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-xl transition-all transform hover:scale-[1.02] mt-4 disabled:opacity-70">
              {isLoading ? 'Processing...' : 'Request Approval'}
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">
              Your organization will be active once approved by the Super Admin.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
