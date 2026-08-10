import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const location = useLocation();

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event) => {
      setIsDesktop(event.matches);
      if (event.matches) setMobileSidebarOpen(false);
    };

    handleChange(query);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-bg">
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        isDesktop={isDesktop}
        mobileOpen={mobileSidebarOpen}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          isDesktop={isDesktop}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
          <div className="w-full min-h-full flex flex-col p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
