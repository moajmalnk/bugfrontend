
import { Project } from '@/types';
import { BaseStore } from './baseStore';

export class ProjectStore extends BaseStore {
  private key = 'projects';

  constructor() {
    super();
    this.initializeProjects();
  }

  private initializeProjects(): void {
    if (!localStorage.getItem(this.key)) {
      const initialProjects: Project[] = [
        {
          id: 'project-1',
          name: 'Project Alpha',
          description: 'Initial project for testing purposes',
          isActive: true,

        },
        {
          id: 'project-2',
          name: 'Project Beta',
          description: 'Second project to expand testing',
          isActive: false,
        },
      ];
      this.setItem(this.key, initialProjects);
    }
  }

  async getProjects(): Promise<Project[]> {
    return this.getItem<Project>(this.key);
  }

  async addProject(projectData: Omit<Project, 'id'>): Promise<Project> {
    const id = `project-${Date.now()}`;
    const newProject: Project = {
      id,
      ...projectData,
    };
    
    const projects = this.getItem<Project>(this.key);
    const updatedProjects = [newProject, ...projects];
    this.setItem(this.key, updatedProjects);
    
    return newProject;
  }

  async getProjectById(projectId: string): Promise<Project | undefined> {
    const projects = this.getItem<Project>(this.key);
    

    
    return undefined;
  }
}

export const projectStore = new ProjectStore();
