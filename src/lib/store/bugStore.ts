
import { Bug, BugStatus } from '@/types';
import { BaseStore } from './baseStore';

export class BugStore extends BaseStore {
  private key = 'bugs';

  constructor() {
    super();
    this.initializeBugs();
  }

  private initializeBugs(): void {
    if (!localStorage.getItem(this.key)) {
      const initialBugs: Bug[] = [
        {
          id: 'bug-1',
          title: 'UI Alignment Issue',
          description: 'Elements are misaligned on the main page',
          project_id: 'project-1',
          reported_by: 'user-3',
          priority: 'medium',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          screenshots: [],
          files: [],
        },
        {
          id: 'bug-2',
          title: 'Data Fetching Error',
          description: 'Unable to fetch data from the API',
          project_id: 'project-1',
          reported_by: 'user-3',
          priority: 'high',
          status: 'fixed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          screenshots: [],
          files: [],
        },
        {
          id: 'bug-3',
          title: 'Login Functionality Broken',
          description: 'Users cannot log in to the application',
          project_id: 'project-2',
          reported_by: 'user-3',
          priority: 'high',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          screenshots: [],
          files: [],
        },
      ];
      this.setItem(this.key, initialBugs);
    }
  }

  async getBugs(): Promise<Bug[]> {
    return this.getItem<Bug>(this.key);
  }

  async addBug(bugData: Omit<Bug, 'id' | 'created_at' | 'updated_at'>): Promise<Bug> {
    const id = `bug-${Date.now()}`;
    const newBug: Bug = {
      id,
      ...bugData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const bugs = this.getItem<Bug>(this.key);
    const updatedBugs = [newBug, ...bugs];
    this.setItem(this.key, updatedBugs);
    
    return newBug;
  }

  async updateBugStatus(bugId: string, status: BugStatus): Promise<Bug> {
    const bugs = this.getItem<Bug>(this.key);
    const updatedBugs = bugs.map(bug => {
      if (bug.id === bugId) {
        return { ...bug, status, updatedAt: new Date() };
      }
      return bug;
    });

    this.setItem(this.key, updatedBugs);
    
    const updatedBug = updatedBugs.find(bug => bug.id === bugId);
    if (!updatedBug) {
      throw new Error(`Bug with id ${bugId} not found`);
    }
    
    return updatedBug;
  }

  async updateBugAssignee(bugId: string, assigneeId: string): Promise<Bug> {
    const bugs = this.getItem<Bug>(this.key);
    const updatedBugs = bugs.map(bug => {
      if (bug.id === bugId) {
        return { ...bug, assigneeId, updatedAt: new Date() };
      }
      return bug;
    });

    this.setItem(this.key, updatedBugs);
    
    const updatedBug = updatedBugs.find(bug => bug.id === bugId);
    if (!updatedBug) {
      throw new Error(`Bug with id ${bugId} not found`);
    }
    
    return updatedBug;
  }

  async updateBug(updatedBug: Bug): Promise<Bug> {
    const bugs = this.getItem<Bug>(this.key);
    const updatedBugs = bugs.map(bug => {
      if (bug.id === updatedBug.id) {
        return { 
          ...updatedBug, 
          updatedAt: new Date() 
        };
      }
      return bug;
    });

    this.setItem(this.key, updatedBugs);
    
    const resultBug = updatedBugs.find(bug => bug.id === updatedBug.id);
    if (!resultBug) {
      throw new Error(`Bug with id ${updatedBug.id} not found`);
    }
    
    return resultBug;
  }
}

export const bugStore = new BugStore();
