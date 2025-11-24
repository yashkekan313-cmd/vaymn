import React, { useState, useEffect } from 'react';
import { Book, User } from '../types';
import { db } from '../services/db';

interface Props {
  currentUser: User;
  onLogout: () => void;
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const UserDashboard: React.FC<Props> = ({ currentUser, onLogout, notify }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = () => {
    setBooks(db.getBooks());
  };

  const handleIssueBook = (book: Book) => {
    if (!book.isIssued) {
        const updatedBooks = books.map(b => {
            if (b.id === book.id) {
                return {
                    ...b,
                    isIssued: true,
                    issuedToUserId: currentUser.id,
                    issuedDate: new Date().toISOString()
                };
            }
            return b;
        });
        db.saveBooks(updatedBooks);
        setBooks(updatedBooks);
        setSelectedBook(null);
        notify("Book issued successfully! Please collect it.", "success");
    }
  };

  const handleReturnClick = () => {
      notify("Please submit the book physically to the librarian at the counter.", "info");
  };

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const myBooks = books.filter(b => b.issuedToUserId === currentUser.id);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-800 font-sans selection:bg-primary-100 selection:text-primary-900">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-primary-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-display font-bold text-xl shadow-lg shadow-indigo-500/20">V</div>
                <div>
                  <h1 className="text-xl font-display font-bold tracking-tight text-slate-900">VAYMN</h1>
                </div>
            </div>
            <div className="flex items-center gap-4">
               <span className="hidden md:block text-sm font-semibold text-slate-500 bg-slate-100/50 border border-slate-100 px-4 py-1.5 rounded-full">{currentUser.name}</span>
               <button onClick={onLogout} className="text-slate-500 hover:text-red-600 px-4 py-2 text-sm font-bold transition-colors">Logout</button>
            </div>
        </div>
      </nav>

      {/* My Books Section */}
      {myBooks.length > 0 && (
          <div className="max-w-7xl mx-auto p-6 md:p-8 animate-fade-in-down">
            <h2 className="text-xl font-display font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span className="bg-amber-100 text-amber-600 p-2 rounded-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></span>
                Currently Issued
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myBooks.map(book => {
                    const issueDate = new Date(book.issuedDate!);
                    const dueDate = new Date(issueDate);
                    dueDate.setDate(dueDate.getDate() + 7);
                    const today = new Date();
                    const isOverdue = today > dueDate;
                    const diffTime = Math.abs(today.getTime() - dueDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    const fine = isOverdue ? diffDays * 5 : 0;

                    return (
                        <div key={book.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-soft flex gap-6 items-start relative overflow-hidden group hover:border-indigo-100 transition-all">
                            {isOverdue && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-2xl z-10">OVERDUE</div>}
                            
                            <img src={book.coverUrl} className="w-24 h-36 object-cover rounded-xl shadow-md bg-slate-200 shrink-0" alt="cover"/>
                            
                            <div className="flex-1 min-w-0 flex flex-col h-full justify-between">
                                <div>
                                    <h3 className="font-display font-bold text-slate-900 leading-tight truncate text-lg mb-1">{book.title}</h3>
                                    <p className="text-sm text-slate-500 mb-3 truncate">{book.author}</p>
                                    
                                    <div className="text-xs space-y-1 mb-4">
                                        <div className={`flex justify-between font-medium ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                                            <span>Due:</span>
                                            <span>{dueDate.toLocaleDateString()}</span>
                                        </div>
                                        {isOverdue && (
                                            <div className="flex justify-between font-bold text-red-600">
                                                <span>Fine:</span>
                                                <span>${fine}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button onClick={handleReturnClick} className="w-full text-xs bg-slate-50 text-slate-600 px-4 py-3 rounded-xl hover:bg-slate-100 transition font-bold uppercase tracking-wide">Return Book</button>
                            </div>
                        </div>
                    );
                })}
            </div>
          </div>
      )}

      {/* Search & Browse */}
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-6">
            <div>
                <h2 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Browse Collection</h2>
                <p className="text-slate-500 mt-2 text-lg">Explore our vast collection of knowledge.</p>
            </div>
            <div className="relative w-full md:w-96 group">
                <input 
                    type="text" 
                    placeholder="Search titles, authors..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 rounded-full border-2 border-white bg-white/60 backdrop-blur-md shadow-soft focus:shadow-glow focus:border-primary-200 outline-none transition-all text-slate-700 font-medium placeholder-slate-400"
                />
                <svg className="w-6 h-6 text-slate-400 absolute left-5 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
            {filteredBooks.map(book => (
                <div 
                    key={book.id} 
                    onClick={() => setSelectedBook(book)}
                    className={`group cursor-pointer flex flex-col gap-4 transition-all ${book.isIssued ? 'opacity-60 grayscale-[0.5]' : 'hover:-translate-y-2'}`}
                >
                    <div className="aspect-[2/3] rounded-3xl overflow-hidden shadow-soft bg-slate-200 relative">
                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        
                        {book.isIssued ? (
                             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
                                <span className="bg-white/95 text-slate-900 px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase shadow-xl transform -rotate-12 border border-slate-200">Issued</span>
                            </div>
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-display font-bold text-slate-900 leading-snug line-clamp-2 mb-1 group-hover:text-primary-600 transition-colors text-lg">{book.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-1">{book.author}</p>
                    </div>
                </div>
            ))}
        </div>
        
        {filteredBooks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                     <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <p className="text-lg font-medium font-display">No books found.</p>
            </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedBook && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6" onClick={() => setSelectedBook(null)}>
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] animate-fade-in-up border border-white/20" onClick={e => e.stopPropagation()}>
                <div className="w-full md:w-5/12 bg-slate-100 relative min-h-[300px]">
                    <img src={selectedBook.coverUrl} alt={selectedBook.title} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden"></div>
                    <button onClick={() => setSelectedBook(null)} className="absolute top-4 right-4 bg-black/20 text-white p-2 rounded-full backdrop-blur-md md:hidden"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="w-full md:w-7/12 p-10 md:p-12 flex flex-col bg-white overflow-y-auto">
                    <div className="hidden md:flex justify-end mb-4">
                        <button onClick={() => setSelectedBook(null)} className="bg-slate-50 hover:bg-slate-100 p-3 rounded-full transition text-slate-500 hover:text-slate-800"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    
                    <div className="flex-1">
                        <h2 className="text-4xl md:text-5xl font-display font-black text-slate-900 mb-3 leading-tight tracking-tight">{selectedBook.title}</h2>
                        <p className="text-2xl text-primary-600 font-medium mb-8 font-display">{selectedBook.author}</p>
                        
                        <div className="flex gap-3 mb-8">
                            <span className="px-4 py-1.5 bg-slate-50 text-slate-600 rounded-full text-sm font-bold border border-slate-100">{selectedBook.genre}</span>
                            <span className="px-4 py-1.5 bg-slate-50 text-slate-600 rounded-full text-sm font-mono border border-slate-100">Shelf: {selectedBook.standNumber}</span>
                        </div>
                        
                        {selectedBook.description && (
                             <div className="prose prose-slate">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Synopsis</h4>
                                <p className="text-slate-600 leading-relaxed text-lg font-light">{selectedBook.description}</p>
                             </div>
                        )}
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-50">
                        {selectedBook.isIssued ? (
                             <button disabled className="w-full bg-slate-100 text-slate-400 py-5 rounded-full font-bold cursor-not-allowed flex items-center justify-center gap-2 text-lg">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                Currently Unavailable
                             </button>
                        ) : (
                            <button 
                                onClick={() => handleIssueBook(selectedBook)} 
                                className="w-full bg-primary-600 text-white py-5 rounded-full font-bold shadow-glow hover:bg-primary-700 hover:scale-[1.01] transition-all transform flex items-center justify-center gap-2 text-lg"
                            >
                                <span>Issue Book Now</span>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};