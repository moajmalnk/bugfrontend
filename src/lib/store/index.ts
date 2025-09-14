
import { Bug, BugStatus, Project, User } from '@/types';
import { userStore } from './userStore';
import { projectStore } from './projectStore';
import { bugStore } from './bugStore';
import { activityStore, ActivityItem } from './activityStore';

class DataStore {
  // User methods
  async getUsers(): Promise<User[]> {
    return userStore.getUsers();
  }

  // Project methods
  async getProjects(): Promise<Project[]> {
    return projectStore.getProjects();
  }

  async addProject(projectData: Omit<Project, 'id'>): Promise<Project> {
    return projectStore.addProject(projectData);
  }

  // Bug methods
  async getBugs(): Promise<Bug[]> {
    return bugStore.getBugs();
  }

  async addBug(bugData: Omit<Bug, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bug> {
    return bugStore.addBug(bugData);
  }

  async updateBugStatus(bugId: string, status: BugStatus): Promise<Bug> {
    return bugStore.updateBugStatus(bugId, status);
  }

  async updateBugAssignee(bugId: string, assigneeId: string): Promise<Bug> {
    return bugStore.updateBugAssignee(bugId, assigneeId);
  }

  async updateBug(updatedBug: Bug): Promise<Bug> {
    return bugStore.updateBug(updatedBug);
  }

  // Activity methods
  async getActivities(): Promise<ActivityItem[]> {
    return activityStore.getActivities();
  }
}

export const mockDataStore = new DataStore();
export { userStore, projectStore, bugStore, activityStore };
export * from './activityStore';
