import React, { useState, useEffect } from 'react';
import { Book, User, UserRole } from '../types';
import { db } from '../services/db';
import { generateBookDetails } from '../services/geminiService';

interface Props {
  currentUser: User;
  onLogout: () => void;
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

// Helper to resize images to avoid LocalStorage limits
const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; // Constrain width for storage efficiency
        const scale = MAX_WIDTH / img.width;
        
        // If image is small enough, keep original size, else scale
        if (scale < 1) {
             canvas.width = MAX_WIDTH;
             canvas.height = img.height * scale;
        } else {
             canvas.width = img.width;
             canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8)); // Compress
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const AdminDashboard: React.FC<Props> = ({ currentUser, onLogout, notify }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'books' | 'users' | 'admins'>('books');
  const [isLoading, setIsLoading] = useState(false);

  // --- Book Modal State ---
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookForm, setBookForm] = useState<Partial<Book>>({ title: '', author: '', genre: '', standNumber: '', coverUrl: '', description: '' });
  const [isEditMode, setIsEditMode] = useState(false);

  // --- User Modal State ---
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState<Partial<User>>({ name: '', libraryId: '', password: '', role: UserRole.USER });
  const [isUserEditMode, setIsUserEditMode] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setBooks(db.getBooks());
    setUsers(db.getUsers());
  };

  // --- BOOK FUNCTIONS ---

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await resizeImage(e.target.files[0]);
        setBookForm(prev => ({ ...prev, coverUrl: base64 }));
        notify("Image uploaded successfully!", "success");
      } catch (err) {
        notify("Failed to process image. Please try another.", "error");
      }
    }
  };

  const handleDeleteBook = (id: string) => {
      const updatedBooks = books.filter(b => b.id !== id);
      db.saveBooks(updatedBooks);
      loadData();
      notify("Book deleted successfully.", "info");
  };

  const handleEditBook = (book: Book) => {
    setBookForm(book);
    setIsEditMode(true);
    setIsBookModalOpen(true);
  };

  const handleReturnBook = (bookId: string) => {
      const updatedBooks = books.map(b => {
          if (b.id === bookId) {
              return { ...b, isIssued: false, issuedToUserId: null, issuedDate: null };
          }
          return b;
      });
      db.saveBooks(updatedBooks);
      loadData();
      notify("Book marked as returned.", "success");
  };

  const openAddBookModal = () => {
      setBookForm({ title: '', author: '', genre: '', standNumber: '', coverUrl: '', description: '' });
      setIsEditMode(false);
      setIsBookModalOpen(true);
  };

  const handleSmartFill = async () => {
    if (!bookForm.title) {
        notify("Please enter a book title first.", "error");
        return;
    }
    
    setIsLoading(true);
    try {
        const data = await generateBookDetails(bookForm.title);
        if (data) {
          setBookForm(prev => ({
            ...prev,
            author: data.author,
            genre: data.genre,
            description: data.description,
            // Only use AI cover if user hasn't uploaded one
            coverUrl: prev.coverUrl || data.coverUrl 
          }));
          notify("Book details auto-filled!", "success");
        } else {
           notify("Could not fetch details. Please fill manually.", "info");
        }
    } catch (e) {
        notify("AI Service unavailable. Please check configuration.", "error");
    } finally {
        setIsLoading(false);
    }
  };

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.title || !bookForm.standNumber) {
        notify("Title and Stand Number are required.", "error");
        return;
    }

    let newBooks = [...books];
    if (isEditMode && bookForm.id) {
      newBooks = newBooks.map(b => b.id === bookForm.id ? { ...b, ...bookForm } as Book : b);
    } else {
      const newBook: Book = {
        id: `b${Date.now()}`,
        isIssued: false,
        issuedToUserId: null,
        issuedDate: null,
        title: bookForm.title,
        author: bookForm.author || 'Unknown',
        genre: bookForm.genre || 'General',
        standNumber: bookForm.standNumber,
        coverUrl: bookForm.coverUrl || 'https://via.placeholder.com/300x450?text=No+Cover',
        description: bookForm.description || ''
      };
      newBooks.push(newBook);
    }
    db.saveBooks(newBooks);
    loadData();
    setIsBookModalOpen(false);
    notify(isEditMode ? "Book updated successfully!" : "Book added to catalog!", "success");
  };

  // --- USER FUNCTIONS ---

  const openUserModal = (role: UserRole, userToEdit?: User) => {
      if (userToEdit) {
          setUserForm(userToEdit);
          setIsUserEditMode(true);
      } else {
          setUserForm({ name: '', libraryId: '', password: '', role: role });
          setIsUserEditMode(false);
      }
      setIsUserModalOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
      const updatedUsers = users.filter(u => u.id !== userId);
      db.saveUsers(updatedUsers);
      loadData();
      notify("User account removed.", "info");
  };

  const handleUserSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!userForm.libraryId || !userForm.password || !userForm.name) {
          notify("All fields are required.", "error");
          return;
      }

      // Check for duplicate ID only if creating new
      if (!isUserEditMode) {
          if (users.some(u => u.libraryId === userForm.libraryId)) {
              notify("This Library ID is already taken.", "error");
              return;
          }
      }

      let updatedUsers = [...users];
      if (isUserEditMode && userForm.id) {
           updatedUsers = updatedUsers.map(u => u.id === userForm.id ? { ...u, ...userForm } as User : u);
      } else {
          const newUser: User = {
              id: `u${Date.now()}`,
              libraryId: userForm.libraryId,
              password: userForm.password,
              name: userForm.name,
              role: userForm.role || UserRole.USER
          };
          updatedUsers.push(newUser);
      }
      
      db.saveUsers(updatedUsers);
      loadData();
      setIsUserModalOpen(false);
      notify(isUserEditMode ? "Profile updated." : "Account created successfully.", "success");
  };


  // Derived Lists
  const librarians = users.filter(u => u.role === UserRole.ADMIN);
  const normalUsers = users.filter(u => u.role === UserRole.USER);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-primary-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-display font-bold text-xl shadow-lg shadow-indigo-500/20">V</div>
                <div>
                  <h1 className="text-xl font-display font-bold tracking-tight text-slate-900">VAYMN <span className="text-primary-600 font-medium text-sm bg-primary-50 px-2 py-0.5 rounded-full ml-1">Admin</span></h1>
                </div>
            </div>
            <div className="flex items-center gap-4">
               <span className="hidden md:flex items-center gap-2 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-4 py-2 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {currentUser.name}
               </span>
               <button onClick={onLogout} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm">Logout</button>
            </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 md:p-8">
        
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-10 p-1.5 bg-white/60 backdrop-blur-md rounded-2xl w-fit shadow-soft border border-white sticky top-24 z-20">
            <button onClick={() => setActiveTab('books')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'books' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-white hover:text-slate-700'}`}>
                Collection
            </button>
            <button onClick={() => setActiveTab('users')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-white hover:text-slate-700'}`}>
                Students
            </button>
            <button onClick={() => setActiveTab('admins')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'admins' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-white hover:text-slate-700'}`}>
                Staff
            </button>
        </div>

        {/* BOOKS TAB */}
        {activeTab === 'books' && (
            <div className="animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-display font-bold text-slate-900">Library Inventory</h2>
                        <p className="text-slate-500 font-medium mt-1">Manage books and track current issues</p>
                    </div>
                    <button 
                        onClick={openAddBookModal}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-full shadow-glow transition-all font-semibold flex items-center gap-2 hover:-translate-y-0.5 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span>Add New Book</span>
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {books.map(book => {
                        const issuedTo = book.issuedToUserId ? users.find(u => u.id === book.issuedToUserId) : null;
                        return (
                            <div key={book.id} className="bg-white rounded-[2rem] shadow-soft border border-slate-100 overflow-hidden hover:shadow-xl hover:border-indigo-100 transition-all group flex flex-col h-full">
                                <div className="flex p-6 gap-6">
                                  <div className="w-24 h-36 shrink-0 rounded-2xl shadow-md overflow-hidden bg-slate-100 relative group-hover:scale-105 transition-transform duration-500">
                                    {book.coverUrl ? (
                                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400 text-xs text-center p-2 font-medium">No Cover</div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col">
                                      <h3 className="font-display font-bold text-slate-900 leading-tight mb-1 line-clamp-2 text-lg">{book.title}</h3>
                                      <p className="text-sm text-slate-500 mb-3 truncate">{book.author}</p>
                                      <div className="flex flex-wrap gap-2 mb-auto">
                                        <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-xs border border-slate-100 font-semibold">{book.genre}</span>
                                        <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-xs border border-slate-100 font-mono">{book.standNumber}</span>
                                      </div>
                                  </div>
                                </div>
                                <div className="mt-auto p-6 pt-0 border-t border-slate-50">
                                   <div className="mt-4 mb-4">
                                       {book.isIssued ? (
                                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
                                                <div className="p-1.5 bg-amber-100 rounded-full shrink-0 text-amber-600">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-amber-800">Issued to {issuedTo?.name || 'Unknown User'}</span>
                                                    <span className="opacity-75 font-mono text-[10px] uppercase tracking-wider">{issuedTo?.libraryId}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-mint-50 border border-mint-100 p-4 rounded-2xl text-xs text-mint-800 flex items-center gap-3 justify-center font-bold">
                                                <div className="w-2 h-2 rounded-full bg-mint-500 animate-pulse"></div>
                                                Available on Shelf
                                            </div>
                                        )}
                                   </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => handleEditBook(book)} className="bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 py-3 rounded-xl text-sm font-bold transition-all hover:shadow-sm">Edit Details</button>
                                        <button onClick={() => handleDeleteBook(book.id)} className="bg-white border border-red-100 text-red-500 hover:bg-red-50 py-3 rounded-xl text-sm font-bold transition-all">Remove</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
            <div className="animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-display font-bold text-slate-900">Student Directory</h2>
                        <p className="text-slate-500 font-medium mt-1">Manage student access and fines</p>
                    </div>
                    <button 
                        onClick={() => openUserModal(UserRole.USER)}
                        className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-full shadow-lg transition-all font-semibold flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span>Add Student</span>
                    </button>
                </div>

                <div className="bg-white rounded-[2rem] shadow-soft border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="p-6 font-bold text-slate-400 uppercase text-xs tracking-wider">Student Profile</th>
                                    <th className="p-6 font-bold text-slate-400 uppercase text-xs tracking-wider">Issued Books</th>
                                    <th className="p-6 font-bold text-slate-400 uppercase text-xs tracking-wider text-right">Total Fine</th>
                                    <th className="p-6 font-bold text-slate-400 uppercase text-xs tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {normalUsers.map(user => {
                                    const issuedBooks = books.filter(b => b.issuedToUserId === user.id);
                                    
                                    // Calculate Total Fine
                                    let totalFine = 0;
                                    issuedBooks.forEach(b => {
                                        if (b.isIssued && b.issuedDate) {
                                            const issueDate = new Date(b.issuedDate);
                                            const dueDate = new Date(issueDate);
                                            dueDate.setDate(dueDate.getDate() + 7);
                                            const today = new Date();
                                            
                                            if (today > dueDate) {
                                                const diffTime = Math.abs(today.getTime() - dueDate.getTime());
                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                                                totalFine += (diffDays * 5);
                                            }
                                        }
                                    });

                                    return (
                                        <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-6 align-top">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 text-primary-600 flex items-center justify-center font-display font-bold text-lg shadow-sm">{user.name.charAt(0)}</div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 font-display">{user.name}</div>
                                                        <div className="text-xs text-slate-500 font-mono mt-1 bg-slate-100 px-2 py-0.5 rounded-md w-fit">{user.libraryId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                {issuedBooks.length > 0 ? (
                                                    <div className="flex flex-col gap-3">
                                                        {issuedBooks.map(b => (
                                                            <div key={b.id} className="flex items-center justify-between gap-4 text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-3 w-full shadow-sm hover:border-indigo-200 transition-colors group/book">
                                                                <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="font-bold text-slate-800 truncate leading-tight text-sm" title={b.title}>{b.title}</span>
                                                                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Due: {new Date(new Date(b.issuedDate!).setDate(new Date(b.issuedDate!).getDate() + 7)).toLocaleDateString()}</span>
                                                                    </div>
                                                                </div>
                                                                 <button 
                                                                    onClick={() => handleReturnBook(b.id)} 
                                                                    className="shrink-0 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 hover:border-emerald-500 px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                    Return
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-sm flex items-center gap-2 py-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                        No active issues
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-6 text-right align-top pt-8">
                                                {totalFine > 0 ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-sm font-bold border border-red-100">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        ${totalFine}
                                                    </span>
                                                ) : (
                                                    <span className="text-emerald-500 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Clear</span>
                                                )}
                                            </td>
                                            <td className="p-6 text-right align-top pt-8">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openUserModal(UserRole.USER, user)} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors font-bold text-sm">Edit</button>
                                                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors font-bold text-sm">Remove</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {normalUsers.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-slate-400 font-medium">No students registered in the system.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* ADMINS TAB */}
        {activeTab === 'admins' && (
            <div className="animate-fade-in">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-display font-bold text-slate-900">Staff Management</h2>
                        <p className="text-slate-500 font-medium mt-1">Manage librarian access privileges</p>
                    </div>
                    <button 
                        onClick={() => openUserModal(UserRole.ADMIN)}
                        className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 px-6 py-3 rounded-full shadow-sm transition-all font-semibold flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span>Add Librarian</span>
                    </button>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {librarians.map(admin => (
                         <div key={admin.id} className="bg-white p-8 rounded-[2rem] shadow-soft border border-slate-100 hover:border-indigo-200 transition-all group relative">
                             <div className="flex items-start justify-between mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-50 to-white border border-indigo-50 text-primary-600 flex items-center justify-center font-display font-bold text-xl shadow-sm">
                                    {admin.name.charAt(0)}
                                </div>
                                {admin.id === currentUser.id ? (
                                    <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-primary-100">You</span>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => openUserModal(UserRole.ADMIN, admin)} className="text-slate-400 hover:text-primary-600 p-2 hover:bg-slate-50 rounded-full transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                        <button onClick={() => handleDeleteUser(admin.id)} className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    </div>
                                )}
                             </div>
                             <div>
                                 <h3 className="font-display font-bold text-slate-900 text-lg mb-1">{admin.name}</h3>
                                 <div className="flex items-center gap-2 text-sm text-slate-500">
                                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                     <span className="font-mono bg-slate-50 px-2 rounded">{admin.libraryId}</span>
                                 </div>
                             </div>
                         </div>
                    ))}
                 </div>
            </div>
        )}
      </div>

      {/* BOOK MODAL */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 animate-fade-in-up border border-white/50 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-2xl font-display font-bold text-slate-900">{isEditMode ? 'Edit Book Details' : 'Catalog New Book'}</h3>
                        <p className="text-slate-500 text-sm mt-1">Fill in the details below</p>
                    </div>
                    <button onClick={() => setIsBookModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                
                <form onSubmit={handleBookSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1">Book Title</label>
                        <div className="flex gap-2">
                            <input 
                                required 
                                type="text" 
                                value={bookForm.title} 
                                onChange={e => setBookForm({...bookForm, title: e.target.value})} 
                                className="flex-1 border border-slate-200 rounded-2xl p-4 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all font-medium text-slate-800 bg-slate-50 focus:bg-white" 
                                placeholder="Enter title..." 
                            />
                            <button 
                                type="button"
                                onClick={handleSmartFill}
                                disabled={isLoading}
                                className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:to-indigo-700 text-white px-5 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap transition-all"
                            >
                                {isLoading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        AI Fill
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1">Author</label>
                            <input required type="text" value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} className="w-full border border-slate-200 rounded-2xl p-4 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all font-medium text-slate-800 bg-slate-50 focus:bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1">Genre</label>
                            <input required type="text" value={bookForm.genre} onChange={e => setBookForm({...bookForm, genre: e.target.value})} className="w-full border border-slate-200 rounded-2xl p-4 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all font-medium text-slate-800 bg-slate-50 focus:bg-white" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1">Stand Number</label>
                        <input required type="text" value={bookForm.standNumber} onChange={e => setBookForm({...bookForm, standNumber: e.target.value})} className="w-full border border-slate-200 rounded-2xl p-4 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all font-mono text-slate-800 bg-slate-50 focus:bg-white" placeholder="e.g., A-12" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1">Synopsis</label>
                        <textarea rows={3} value={bookForm.description} onChange={e => setBookForm({...bookForm, description: e.target.value})} className="w-full border border-slate-200 rounded-2xl p-4 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all font-medium text-slate-800 bg-slate-50 focus:bg-white resize-none" placeholder="Book summary (optional or auto-filled)" />
                    </div>
                    
                    {/* Image Upload Section */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1">Cover Image</label>
                        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <div className="relative w-16 h-20 bg-white rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                                {bookForm.coverUrl ? (
                                    <img src={bookForm.coverUrl} className="w-full h-full object-cover" alt="preview" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="cursor-pointer bg-white border border-slate-200 hover:border-primary-300 text-slate-600 hover:text-primary-600 px-4 py-2 rounded-xl text-sm font-bold transition-all inline-block shadow-sm">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={handleImageUpload}
                                        onClick={(e) => (e.currentTarget.value = '')} // Allow re-selecting same file
                                    />
                                    Choose Photo
                                </label>
                                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Upload a cover image.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                        <button type="button" onClick={() => setIsBookModalOpen(false)} className="text-slate-500 hover:text-slate-800 px-6 py-3 font-bold rounded-full hover:bg-slate-50 transition">Cancel</button>
                        <button type="submit" className="bg-primary-600 text-white px-8 py-3 rounded-full hover:bg-primary-700 shadow-glow font-bold transition-all transform hover:-translate-y-0.5">{isEditMode ? 'Save Changes' : 'Add to Catalog'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* USER MODAL */}
      {isUserModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 animate-fade-in-up border border-white/50 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-2xl font-display font-bold text-slate-900">
                            {isUserEditMode ? 'Edit Profile' : `Add New ${userForm.role === UserRole.ADMIN ? 'Librarian' : 'Student'}`}
                        </h3>
                        <p className="text-slate-500 text-sm mt-1">Manage account details</p>
                    </div>
                    <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                
                <form onSubmit={handleUserSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1">Full Name</label>
                        <input required type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full border border-slate-200 rounded-2xl p-4 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all font-medium bg-slate-50 focus:bg-white" placeholder="Name" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1">Library ID (Login ID)</label>
                        <input required type="text" value={userForm.libraryId} onChange={e => setUserForm({...userForm, libraryId: e.target.value})} className="w-full border border-slate-200 rounded-2xl p-4 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all font-mono text-sm bg-slate-50 focus:bg-white" placeholder="Unique ID" disabled={isUserEditMode && userForm.role === UserRole.ADMIN && currentUser.id === userForm.id} />
                        {isUserEditMode && <p className="text-[10px] text-slate-400 mt-1 ml-1">Changing ID will change login credentials.</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1">Password</label>
                        <input required type="text" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full border border-slate-200 rounded-2xl p-4 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all font-medium bg-slate-50 focus:bg-white" placeholder="Password" />
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                        <button type="button" onClick={() => setIsUserModalOpen(false)} className="text-slate-500 hover:text-slate-800 px-6 py-3 font-bold rounded-full hover:bg-slate-50 transition">Cancel</button>
                        <button type="submit" className="bg-primary-600 text-white px-8 py-3 rounded-full hover:bg-primary-700 shadow-glow font-bold transition-all transform hover:-translate-y-0.5">
                            {isUserEditMode ? 'Save Changes' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
          </div>
      )}

    </div>
  );
};