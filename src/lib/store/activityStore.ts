
import { BaseStore } from './baseStore';

export interface ActivityItem {
  id: string;
  type: string;
  userId: string;
  description: string;
  projectId: string;
  createdAt: Date;
}

export class ActivityStore extends BaseStore {
  private key = 'activities';

  constructor() {
    super();
    this.initializeActivities();
  }

  private initializeActivities(): void {
    if (!localStorage.getItem(this.key)) {
      const initialActivities: ActivityItem[] = [
        {
          id: 'activity-1',
          type: 'bug_reported',
          userId: 'user-3',
          description: 'Reported a new bug: UI Alignment Issue',
          projectId: 'project-1',
          createdAt: new Date(),
        },
        {
          id: 'activity-2',
          type: 'bug_assigned',
          userId: 'user-1',
          description: 'Assigned bug to Jane Smith: UI Alignment Issue',
          projectId: 'project-1',
          createdAt: new Date(),
        },
        {
          id: 'activity-3',
          type: 'bug_fixed',
          userId: 'user-2',
          description: 'Fixed bug: Data Fetching Error',
          projectId: 'project-1',
          createdAt: new Date(),
        },
        {
          id: 'activity-4',
          type: 'project_created',
          userId: 'user-1',
          description: 'Created a new project: Project Beta',
          projectId: 'project-2',
          createdAt: new Date(),
        },
      ];
      this.setItem(this.key, initialActivities);
    }
  }

  async getActivities(): Promise<ActivityItem[]> {
    return this.getItem<ActivityItem>(this.key);
  }

  async addActivity(activityData: Omit<ActivityItem, 'id' | 'createdAt'>): Promise<ActivityItem> {
    const id = `activity-${Date.now()}`;
    const newActivity: ActivityItem = {
      id,
      ...activityData,
      createdAt: new Date(),
    };

    const activities = this.getItem<ActivityItem>(this.key);
    const updatedActivities = [newActivity, ...activities];
    this.setItem(this.key, updatedActivities);
    
    return newActivity;
  }
}

export const activityStore = new ActivityStore();
