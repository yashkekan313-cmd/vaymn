import { Book, User, UserRole } from '../types';

const STORAGE_KEYS = {
  USERS: 'vaymn_users',
  BOOKS: 'vaymn_books',
  SESSION: 'vaymn_session'
};

// Helper to create past dates for seeding
const getPastDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

// Initial Data Seeding
const seedData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const initialUsers: User[] = [
      { id: 'admin1', libraryId: 'admin', password: '123', name: 'Head Librarian', role: UserRole.ADMIN },
      { id: 'user1', libraryId: 'user', password: '123', name: 'John Doe', role: UserRole.USER }
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
  }
  if (!localStorage.getItem(STORAGE_KEYS.BOOKS)) {
    const initialBooks: Book[] = [
      { id: 'b1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', genre: 'Classic', coverUrl: 'https://picsum.photos/300/450?random=1', standNumber: 'A1', isIssued: false, issuedToUserId: null, issuedDate: null, description: 'A novel set in the Jazz Age.' },
      { id: 'b2', title: '1984', author: 'George Orwell', genre: 'Dystopian', coverUrl: 'https://picsum.photos/300/450?random=2', standNumber: 'B3', isIssued: false, issuedToUserId: null, issuedDate: null, description: 'A story about totalitarianism.' },
      // Set issuedDate to 14 days ago to demonstrate the fine system immediately (7 days overdue)
      { id: 'b3', title: 'Clean Code', author: 'Robert C. Martin', genre: 'Technology', coverUrl: 'https://picsum.photos/300/450?random=3', standNumber: 'T5', isIssued: true, issuedToUserId: 'user1', issuedDate: getPastDate(14), description: 'A handbook of agile software craftsmanship.' }
    ];
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(initialBooks));
  }
};

export const db = {
  init: seedData,
  
  getUsers: (): User[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
  
  saveUsers: (users: User[]) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)),
  
  getBooks: (): Book[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKS) || '[]'),
  
  saveBooks: (books: Book[]) => localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books)),
  
  getSession: (): User | null => {
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    return session ? JSON.parse(session) : null;
  },
  
  setSession: (user: User) => localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user)),
  
  clearSession: () => localStorage.removeItem(STORAGE_KEYS.SESSION),
  
  findUser: (libraryId: string): User | undefined => {
    const users = db.getUsers();
    return users.find(u => u.libraryId === libraryId);
  }
};