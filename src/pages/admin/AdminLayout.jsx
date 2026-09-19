import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Menu, X, Package, ShoppingBag, LogOut } from 'lucide-react';

export default function AdminLayout() {
  const [session, setSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('vellune_admin_token');
    if (token === import.meta.env.VITE_ADMIN_PASSWORD) {
      setSession(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setAuthError('');
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      localStorage.setItem('vellune_admin_token', password);
      setSession(true);
      navigate('/admin');
    } else {
      setAuthError('Incorrect password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('vellune_admin_token');
    setSession(false);
    navigate('/admin/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] text-[#111111] font-mono text-sm uppercase tracking-widest">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] text-[#111111] p-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col gap-6">
          <h1 className="font-display text-3xl tracking-widest text-center uppercase mb-8">Admin Access</h1>
          
          {authError && <div className="text-red-500 font-mono text-xs">{authError}</div>}
          
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest mb-2">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-transparent hairline-border p-3 outline-none focus:border-[#111111]" />
          </div>
          
          <button type="submit" className="btn-primary mt-4">LOGIN</button>
          
          <Link to="/" className="text-center font-mono text-xs opacity-50 hover:opacity-100 mt-4">Return to Store</Link>
        </form>
      </div>
    );
  }

  const navLinks = [
    { name: 'Orders', path: '/admin', icon: <ShoppingBag className="w-4 h-4" /> },
    { name: 'Products', path: '/admin/products', icon: <Package className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex bg-[#FAFAF8] text-[#111111]">
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 hairline-border-b flex items-center justify-between px-6 z-40 bg-[#FAFAF8]">
        <span className="font-display font-bold tracking-widest">VT ADMIN</span>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 hairline-border-r bg-[#FAFAF8] transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col pt-16 md:pt-0`}>
        <div className="h-20 hairline-border-b flex items-center px-6 hidden md:flex">
          <span className="font-display font-bold text-xl tracking-widest">VT ADMIN</span>
        </div>
        
        <nav className="flex-1 p-6 flex flex-col gap-2">
          {navLinks.map(link => {
            const isActive = location.pathname === link.path;
            return (
              <Link 
                key={link.path} 
                to={link.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors ${isActive ? 'bg-[#111111] text-white' : 'hover:bg-[#111111]/5'}`}
              >
                {link.icon}
                {link.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-6 hairline-border-t">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 font-mono text-xs uppercase tracking-widest hover:opacity-50 transition-opacity w-full text-left">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 flex flex-col min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
