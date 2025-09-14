import { createContext, useContext, useState, ReactNode } from 'react';
import { Bug, Project } from '@/types';
import { bugStore, projectStore } from '@/lib/store';

interface BugContextType {
  bugs: Bug[];
  projects: Project[];
  selectedProject: Project | null;
  getBugsByProject: (project_id: string) => Bug[];
  getProjectDashboard: (project: Project) => { totalBugs: number };
  setBugs: (bugs: Bug[]) => void;
  setSelectedProject: (project: Project | null) => void;
  addBug: (bugData: Omit<Bug, 'id' | 'created_at' | 'updated_at'>) => Promise<Bug>;
  addProject: (projectData: Omit<Project, 'id'>) => Promise<Project>;
}

const BugContext = createContext<BugContextType | undefined>(undefined);

export function BugProvider({ children }: { children: ReactNode }) {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  const getBugsByProject = (project_id: string) => {
    return bugs.filter(bug => bug.project_id === project_id);
  };

  const getProjectDashboard = (project: Project) => {
    return {
      totalBugs: getBugsByProject(project.id).length,
    };
  };

  const addBug = async (bugData: Omit<Bug, 'id' | 'created_at' | 'updated_at'>) => {
    // Converting to match the expected parameter format in bugStore.addBug
    const bugDataFormatted = {
      ...bugData,
      // Other properties will be added by the addBug method
    };
    
    const newBug = await bugStore.addBug(bugDataFormatted);
    setBugs(prev => [newBug, ...prev]);
    return newBug;
  };

  const addProject = async (projectData: Omit<Project, 'id'>) => {
    const newProject = await projectStore.addProject(projectData);
    setProjects(prev => [newProject, ...prev]);
    return newProject;
  };

  return (
    <BugContext.Provider
      value={{
        bugs,
        projects,
        selectedProject,
        getBugsByProject,
        getProjectDashboard,
        setBugs,
        setSelectedProject,
        addBug,
        addProject,
      }}
    >
      {children}
    </BugContext.Provider>
  );
}

export function useBugs() {
  const context = useContext(BugContext);
  if (context === undefined) {
    throw new Error('useBugs must be used within a BugProvider');
  }
  return context;
}
