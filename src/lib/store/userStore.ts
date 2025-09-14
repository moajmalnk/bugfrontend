
import { User } from '@/types';
import { BaseStore } from './baseStore';

export class UserStore extends BaseStore {
  private key = 'users';

  constructor() {
    super();
    this.initializeUsers();
  }

  private initializeUsers(): void {
    if (!localStorage.getItem(this.key)) {
      const initialUsers: User[] = [
        { 
          id: 'user-1', 
          name: 'John Doe', 
          username: 'john.doe',
          email: 'john.doe@example.com', 
          role: 'admin',
          avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=3b82f6&color=fff'
        },
        { 
          id: 'user-2', 
          name: 'Jane Smith', 
          username: 'jane.smith',
          email: 'jane.smith@example.com', 
          role: 'developer',
          avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=10b981&color=fff' 
        },
        { 
          id: 'user-3', 
          name: 'Alice Johnson', 
          username: 'alice.johnson',
          email: 'alice.johnson@example.com', 
          role: 'tester',
          avatar: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=f59e0b&color=fff'
        },
      ];
      this.setItem(this.key, initialUsers);
    }
  }

  async getUsers(): Promise<User[]> {
    return this.getItem<User>(this.key);
  }

  async addUser(userData: Omit<User, 'id' | 'avatar'>, avatar?: string): Promise<User> {
    const id = `user-${Date.now()}`;
    const newUser: User = {
      id,
      ...userData,
      avatar: avatar || this.generateAvatar(userData.name, userData.role),
    };

    const users = this.getItem<User>(this.key);
    const updatedUsers = [...users, newUser];
    this.setItem(this.key, updatedUsers);
    
    return newUser;
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const users = this.getItem<User>(this.key);
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        const updatedUser = { ...user, ...userData };
        
        // If name or role was updated, regenerate avatar
        if (userData.name || userData.role) {
          updatedUser.avatar = this.generateAvatar(
            updatedUser.name,
            updatedUser.role
          );
        }
        
        return updatedUser;
      }
      return user;
    });

    this.setItem(this.key, updatedUsers);
    
    const updatedUser = updatedUsers.find(user => user.id === userId);
    if (!updatedUser) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    return updatedUser;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const users = this.getItem<User>(this.key);
    const filteredUsers = users.filter(user => user.id !== userId);
    
    if (filteredUsers.length === users.length) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    this.setItem(this.key, filteredUsers);
    return true;
  }

  private generateAvatar(name: string, role: User['role']): string {
    const backgroundColors = {
      admin: '3b82f6', // blue
      developer: '10b981', // green
      tester: 'f59e0b', // yellow
    };
    
    const bgColor = backgroundColors[role] || '6b7280'; // gray default
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgColor}&color=fff`;
  }
}

export const userStore = new UserStore();
