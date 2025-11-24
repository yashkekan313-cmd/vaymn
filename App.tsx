import React, { useState, useEffect } from 'react';
import { AppState, User, UserRole } from './types';
import { db } from './services/db';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';

// Simple Notification Component
const Notification = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => (
  <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-full shadow-glow z-[100] flex items-center gap-4 animate-fade-in-down min-w-[340px] backdrop-blur-md border border-white/20 transition-all ${
    type === 'success' ? 'bg-mint-100 text-mint-700 border-mint-200' : 
    type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 
    'bg-slate-800/90 text-white border-slate-700'
  }`}>
    <div className={`p-1.5 rounded-full shrink-0 ${type === 'success' ? 'bg-mint-500 text-white' : type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-600'}`}>
        {type === 'success' && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        {type === 'error' && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
        {type === 'info' && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
    </div>
    <span className="font-semibold text-sm flex-1 font-sans">{message}</span>
    <button onClick={onClose} className="hover:bg-black/5 rounded-full p-1 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
  </div>
);

function App() {
  const [state, setState] = useState<AppState>({
    view: 'HOME',
    currentUser: null
  });

  // Auth Form State
  const [libId, setLibId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Notification State
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);

  useEffect(() => {
    db.init();
    const session = db.getSession();
    if (session) {
      setState({
        view: 'DASHBOARD',
        currentUser: session
      });
    }
  }, []);

  const notify = (msg: string, type: 'success' | 'error' | 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogin = (e: React.FormEvent, role: UserRole) => {
    e.preventDefault();
    const user = db.findUser(libId);
    
    // Strict Role Checking
    if (user && user.password === password) {
      if (user.role === role) {
        db.setSession(user);
        setState({ view: 'DASHBOARD', currentUser: user });
        resetForm();
        notify(`Welcome back, ${user.name}`, 'success');
      } else {
        notify(`This account is not authorized for ${role === UserRole.ADMIN ? 'Admin' : 'Student'} access.`, 'error');
      }
    } else {
      notify("Invalid Library ID or Password.", 'error');
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // Determine role based on current view
    const role = state.view === 'SIGNUP_ADMIN' ? UserRole.ADMIN : UserRole.USER;
    const roleName = role === UserRole.ADMIN ? 'Librarian' : 'Student';

    // Basic Validation
    if (!name.trim() || !libId.trim() || !password.trim()) {
        notify("Please fill in all fields.", 'error');
        return;
    }

    const users = db.getUsers();
    if (users.find(u => u.libraryId === libId)) {
        notify("Library ID already exists. Please choose another.", 'error');
        return;
    }

    const newUser: User = {
        id: `u${Date.now()}`,
        libraryId: libId,
        password: password,
        name: name,
        role: role
    };

    try {
        // Save to DB
        db.saveUsers([...users, newUser]);
        
        // Auto-login logic for seamless UX
        db.setSession(newUser);
        setState({ view: 'DASHBOARD', currentUser: newUser });
        resetForm();
        notify(`Welcome, ${name}! Your ${roleName} account is ready.`, 'success');
    } catch (error) {
        console.error("Signup failed", error);
        notify("An error occurred during account creation.", 'error');
    }
  };

  const handleLogout = () => {
    // Removed window.confirm to ensure button works immediately
    db.clearSession();
    setState({ view: 'HOME', currentUser: null });
    notify("Logged out successfully.", 'info');
  };

  const resetForm = () => {
    setLibId('');
    setPassword('');
    setName('');
  };

  // RENDER LOGIC

  if (state.view === 'DASHBOARD' && state.currentUser) {
    return state.currentUser.role === UserRole.ADMIN 
      ? <AdminDashboard currentUser={state.currentUser} onLogout={handleLogout} notify={notify} />
      : <UserDashboard currentUser={state.currentUser} onLogout={handleLogout} notify={notify} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-primary-100 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {notification && <Notification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}

      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary-300/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-electric/20 rounded-full blur-[100px]"></div>

      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center">
        
        {/* HEADER LOGO */}
        <div className="mb-12 text-center animate-fade-in-up">
          <h1 className="text-8xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-800 tracking-tight mb-3">VAYMN</h1>
          <p className="text-slate-500 font-medium tracking-widest uppercase text-sm bg-white/50 py-2 px-8 rounded-full inline-block backdrop-blur-sm border border-white/50 shadow-sm">Stream Smarter.</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-10 md:p-14 rounded-[2.5rem] shadow-soft w-full max-w-md transition-all duration-500 border border-white">
          
          {/* HOME VIEW */}
          {state.view === 'HOME' && (
            <div className="space-y-6 animate-fade-in">
               <h2 className="text-2xl font-display font-bold text-center mb-8 text-slate-800">Who is logging in?</h2>
               
               <button 
                  onClick={() => setState({ ...state, view: 'LOGIN_USER' })}
                  className="group w-full py-5 px-8 bg-gradient-to-r from-primary-600 to-indigo-600 hover:to-indigo-700 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-glow transition-all transform hover:-translate-y-1 flex items-center justify-between"
               >
                  <span className="flex flex-col items-start">
                    <span className="text-xs font-medium text-indigo-200 uppercase tracking-wide">Access Library</span>
                    <span className="font-display">Student Portal</span>
                  </span>
                  <div className="bg-white/20 p-2.5 rounded-full">
                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </div>
               </button>

               <button 
                  onClick={() => setState({ ...state, view: 'LOGIN_ADMIN' })}
                  className="group w-full py-5 px-8 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-primary-700 rounded-full font-semibold text-lg transition-all transform hover:-translate-y-1 flex items-center justify-between hover:shadow-soft"
               >
                  <span className="flex flex-col items-start">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Manage System</span>
                    <span className="font-display">Staff Portal</span>
                  </span>
                  <div className="bg-slate-50 group-hover:bg-primary-50 p-2.5 rounded-full transition-colors">
                     <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
               </button>
            </div>
          )}

          {/* LOGIN VIEWS */}
          {(state.view === 'LOGIN_USER' || state.view === 'LOGIN_ADMIN') && (
             <form onSubmit={(e) => handleLogin(e, state.view === 'LOGIN_ADMIN' ? UserRole.ADMIN : UserRole.USER)} className="animate-fade-in">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                    <button type="button" onClick={() => { resetForm(); setState({ ...state, view: 'HOME' }); }} className="p-3 -ml-3 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h2 className="text-2xl font-display font-bold text-slate-800">{state.view === 'LOGIN_ADMIN' ? 'Staff Portal' : 'Student Portal'}</h2>
                        <p className="text-sm text-slate-500">Welcome back, please log in.</p>
                    </div>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">Library ID</label>
                      <input required type="text" value={libId} onChange={e => setLibId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all font-mono text-sm text-slate-800 placeholder-slate-400" placeholder="e.g. USER-123" />
                  </div>
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">Password</label>
                      <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all font-sans text-slate-800 placeholder-slate-400" placeholder="••••••••" />
                  </div>
                  
                  <button type="submit" className="w-full bg-primary-600 text-white py-4 rounded-full font-bold text-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-glow transform active:scale-[0.98] mt-4 flex justify-center items-center gap-2">
                      <span>Log In</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  </button>
                </div>

                <div className="mt-10 text-center">
                   {state.view === 'LOGIN_USER' && (
                      <p className="text-sm text-slate-500">
                          New here? <button type="button" onClick={() => { resetForm(); setState({ ...state, view: 'SIGNUP' }); }} className="text-primary-600 font-bold hover:text-primary-800 ml-1">Create Student Account</button>
                      </p>
                   )}
                   {state.view === 'LOGIN_ADMIN' && (
                      <p className="text-sm text-slate-500">
                          Need access? <button type="button" onClick={() => { resetForm(); setState({ ...state, view: 'SIGNUP_ADMIN' }); }} className="text-primary-600 font-bold hover:text-primary-800 ml-1">Register as Staff</button>
                      </p>
                   )}
                </div>
             </form>
          )}

          {/* SIGNUP VIEWS */}
          {(state.view === 'SIGNUP' || state.view === 'SIGNUP_ADMIN') && (
              <form onSubmit={handleSignup} className="animate-fade-in">
                  <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                    <button type="button" onClick={() => { resetForm(); setState({ ...state, view: state.view === 'SIGNUP_ADMIN' ? 'LOGIN_ADMIN' : 'LOGIN_USER' }); }} className="p-3 -ml-3 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h2 className="text-2xl font-display font-bold text-slate-800">
                            {state.view === 'SIGNUP_ADMIN' ? 'New Staff Registration' : 'New Student Registration'}
                        </h2>
                        <p className="text-sm text-slate-500">Fill in details to get started</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">Full Name</label>
                          <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all font-sans" placeholder="John Doe" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">Library ID (Username)</label>
                          <input required type="text" value={libId} onChange={e => setLibId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all font-mono text-sm" placeholder="Create a unique ID" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">Password</label>
                          <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all font-sans" placeholder="Create secure password" />
                      </div>

                      <button type="submit" className="w-full bg-primary-600 text-white py-4 rounded-full font-bold hover:bg-primary-700 transition-all shadow-lg hover:shadow-glow mt-6 flex justify-center items-center gap-2">
                          <span>Create Account</span>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                  </div>
              </form>
          )}

        </div>
        
        <div className="mt-12 text-slate-400 text-xs text-center font-medium font-mono">
          &copy; {new Date().getFullYear()} VAYMN Library Systems
        </div>
      </div>
    </div>
  );
}

export default App;