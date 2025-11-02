import { FolderOpen, FileText, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getEffectiveRole } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface ProjectWithCount {
  id: string;
  name: string;
  description: string;
  status: string;
  document_count: number;
}

interface ProjectCardsGridProps {
  projects: ProjectWithCount[];
  isLoading?: boolean;
  onProjectClick?: (projectId: string) => void;
}

export const ProjectCardsGrid = ({ projects, isLoading, onProjectClick }: ProjectCardsGridProps) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userRole = currentUser ? getEffectiveRole(currentUser) : null;

  const handleProjectClick = (projectId: string) => {
    if (onProjectClick) {
      onProjectClick(projectId);
    } else {
      const rolePrefix = userRole ? `/${userRole}` : '';
      navigate(`${rolePrefix}/bugdocs/project/${projectId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
            <FolderOpen className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            No Projects Found
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            No projects are available. Projects with documents will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {projects.map((project) => (
        <Card
          key={project.id}
          className="group relative overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 cursor-pointer border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
          onClick={() => handleProjectClick(project.id)}
        >
          {/* Gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-indigo-50/40 dark:from-blue-950/15 dark:via-transparent dark:to-indigo-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Status indicator */}
          <div className="absolute top-4 right-4 w-3 h-3 bg-blue-500 rounded-full shadow-lg"></div>
          
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shrink-0">
                  <FolderOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors truncate">
                    {project.name}
                  </h3>
                  {project.status && (
                    <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full mt-1 inline-block ${
                      project.status === 'active' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : project.status === 'completed'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {project.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {project.description && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 line-clamp-2">
                {project.description}
              </p>
            )}
            
            <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {project.document_count || 0} {project.document_count === 1 ? 'Doc' : 'Docs'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleProjectClick(project.id);
                }}
              >
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

