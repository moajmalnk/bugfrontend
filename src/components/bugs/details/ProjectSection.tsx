
import { Link } from 'react-router-dom';
import { Project } from '@/types';

interface ProjectSectionProps {
  project?: Project;
}

export const ProjectSection = ({ project }: ProjectSectionProps) => {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">Project</h3>
      <div className="text-base">
        {project ? (
          <Link to={`/projects/${project.id}`} className="hover:underline">
            {project.name}
          </Link>
        ) : (
          <span className="text-muted-foreground">BugRicer Project</span>
        )}
      </div>
    </div>
  );
};
