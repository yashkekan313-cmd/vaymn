export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface User {
  id: string;
  libraryId: string;
  password?: string; // Optional when retrieving safe user objects
  name: string;
  role: UserRole;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  coverUrl: string;
  standNumber: string;
  isIssued: boolean;
  issuedToUserId: string | null;
  issuedDate: string | null;
  description?: string; // Added for AI enhancements
}

export interface AppState {
  view: 'HOME' | 'LOGIN_USER' | 'LOGIN_ADMIN' | 'SIGNUP' | 'SIGNUP_ADMIN' | 'DASHBOARD';
  currentUser: User | null;
}