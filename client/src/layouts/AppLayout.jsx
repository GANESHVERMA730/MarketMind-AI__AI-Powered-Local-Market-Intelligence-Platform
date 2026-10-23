import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, ChevronDown, LayoutDashboard, LogOut, Menu, Package, Store, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/products', label: 'Products & stock', icon: Package },
  { to: '/sales', label: 'Sales', icon: BarChart3 },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const current = navigation.find((item) => item.to === location.pathname);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {menuOpen && <button className="fixed inset-0 z-30 bg-ink/40 md:hidden" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-white px-5 py-6 transition-transform md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-10 flex items-center justify-between px-2">
          <NavLink to="/dashboard" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest text-lime"><Store size={21} /></span>
            <span className="text-lg font-bold tracking-tight">MarketMind<span className="text-forest">.</span></span>
          </NavLink>
          <button className="md:hidden" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Workspace</p>
        <nav className="space-y-1">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? 'bg-[#edf5ee] text-forest' : 'text-muted hover:bg-canvas hover:text-ink'}`}
            >
              <Icon size={18} strokeWidth={1.8} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-[#f1f5eb] p-4">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-lime text-xs font-bold text-ink">
            {(user?.shopName || 'S').slice(0, 1).toUpperCase()}
          </div>
          <p className="truncate text-sm font-semibold">{user?.shopName || 'Your shop'}</p>
          <p className="mt-1 text-xs leading-5 text-muted">Your business data stays private to your account.</p>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 hover:bg-canvas md:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
            <div>
              <p className="text-xs text-muted">{user?.shopName || 'Shop workspace'}</p>
              <p className="text-sm font-bold text-ink">{current?.label || 'Workspace'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-muted">{user?.email}</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-forest text-sm font-bold text-white">
              {(user?.name || 'U').slice(0, 1).toUpperCase()}
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-muted hover:bg-canvas hover:text-ink" title="Sign out">
              <LogOut size={16} /><span className="hidden sm:inline">Sign out</span><ChevronDown size={14} className="hidden sm:inline" />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-8 sm:py-9"><Outlet /></main>
      </div>
    </div>
  );
}
