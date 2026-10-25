import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { Login } from './pages/Login.js';
import { Register } from './pages/Register.js';
import { AdminLogin } from './pages/admin/AdminLogin.js';
import { AuthorDashboard } from './pages/author/AuthorDashboard.js';
import { AuthorBooks } from './pages/author/AuthorBooks.js';
import { BookDetail } from './pages/author/BookDetail.js';
import { AuthorTickets } from './pages/author/AuthorTickets.js';
import { NewTicket } from './pages/author/NewTicket.js';
import { TicketDetail } from './pages/author/TicketDetail.js';
import { AdminDashboard } from './pages/admin/AdminDashboard.js';
import { AdminTickets } from './pages/admin/AdminTickets.js';
import { AdminTicketDetail } from './pages/admin/AdminTicketDetail.js';
import { DataManagement } from './pages/admin/DataManagement.js';
import { NotFound } from './pages/NotFound.js';

export default function App() {
  const { user, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Restoring session...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated Public Routes
  if (!user) {
    if (currentPath === '/register') {
      return <Register />;
    }
    if (currentPath === '/admin/login') {
      return <AdminLogin />;
    }
    return <Login />;
  }

  // Redirect authenticated users away from public auth pages
  if (currentPath === '/' || currentPath === '/login' || currentPath === '/register' || currentPath === '/admin/login') {
    if (user.role === 'admin') {
      window.history.replaceState({}, '', '/admin/dashboard');
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <Navbar />
          <div className="flex-1 flex overflow-hidden">
            <Sidebar currentPath="/admin/dashboard" />
            <main className="flex-1 overflow-y-auto">
              <AdminDashboard />
            </main>
          </div>
        </div>
      );
    } else {
      window.history.replaceState({}, '', '/author/dashboard');
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <Navbar />
          <div className="flex-1 flex overflow-hidden">
            <Sidebar currentPath="/author/dashboard" />
            <main className="flex-1 overflow-y-auto">
              <AuthorDashboard />
            </main>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar currentPath={currentPath} />
        <main className="flex-1 overflow-y-auto">
          {renderRoute(currentPath, user.role)}
        </main>
      </div>
    </div>
  );
}

function renderRoute(path: string, role: 'author' | 'admin') {
  // Author routes
  if (path === '/author/dashboard') {
    return <AuthorDashboard />;
  }
  if (path === '/author/books') {
    return <AuthorBooks />;
  }
  if (path.startsWith('/author/books/')) {
    const bookId = path.replace('/author/books/', '');
    return <BookDetail bookId={bookId} />;
  }
  if (path === '/author/tickets') {
    return <AuthorTickets />;
  }
  if (path === '/author/tickets/new') {
    return <NewTicket />;
  }
  if (path.startsWith('/author/tickets/')) {
    const ticketId = path.replace('/author/tickets/', '');
    return <TicketDetail ticketId={ticketId} />;
  }

  // Admin routes (strictly guarded)
  if (path.startsWith('/admin')) {
    if (role !== 'admin') {
      return (
        <div className="p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-lg font-bold">
            !
          </div>
          <h2 className="text-lg font-black text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            This area requires verified Operations Administrator privileges. Your account does not have authorization to view this resource.
          </p>
          <a
            href="/author/dashboard"
            className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Return to Author Dashboard
          </a>
        </div>
      );
    }

    if (path === '/admin/dashboard') {
      return <AdminDashboard />;
    }
    if (path === '/admin/tickets') {
      return <AdminTickets />;
    }
    if (path.startsWith('/admin/tickets/')) {
      const ticketId = path.replace('/admin/tickets/', '');
      return <AdminTicketDetail ticketId={ticketId} />;
    }
    if (path === '/admin/data') {
      return <DataManagement />;
    }
  }

  return <NotFound />;
}
