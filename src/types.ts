export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
}

export interface Wallpaper {
  id: string;
  userId: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
  isRemix?: boolean;
  parentImageId?: string;
}

export interface Message {
  id: string;
  userId: string;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
}
