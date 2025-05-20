
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bug } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to projects or login
    navigate('/projects');
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="text-center">
        <Bug className="h-12 w-12 mx-auto text-primary animate-pulse" />
        <h1 className="text-3xl font-bold mt-4">BugRacer</h1>
        <p className="text-muted-foreground mt-2">Loading your bug tracking dashboard...</p>
      </div>
    </div>
  );
};

export default Index;
