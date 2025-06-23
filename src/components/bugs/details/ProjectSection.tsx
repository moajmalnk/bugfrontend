import { Link } from 'react-router-dom';
import { Project } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface ProjectSectionProps {
  project?: Project;
}

export const ProjectSection = ({ project }: ProjectSectionProps) => {
  const { currentUser } = useAuth();
  
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">Project</h3>
      <div className="text-base">
        {project ? (
          <Link to={`/${currentUser?.role || 'tester'}/projects/${project.id}`} className="hover:underline">
            {project.name}
          </Link>
        ) : (
          <span className="text-muted-foreground">BugRicer Project</span>
        )}
      </div>
    </div>
  );
};
