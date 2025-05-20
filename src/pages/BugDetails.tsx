import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { BugStatus, Bug } from '@/types';
import { BugHeader } from '@/components/bugs/details/BugHeader';
import { BugContentCards } from '@/components/bugs/details/BugContentCards';
import { BugDetailsCard } from '@/components/bugs/details/BugDetailsCard';
import { BugNotFound } from '@/components/bugs/details/BugNotFound';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from '@/components/ui/use-toast';
import { ENV } from '@/lib/env';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

const BugDetails = () => {
  const { bugId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: bug, isLoading, error } = useQuery({
    queryKey: ['bug', bugId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get<ApiResponse<Bug>>(`${ENV.API_URL}/bugs/get.php?id=${bugId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch bug details');
    }
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error || !bug) {
    return <BugNotFound />;
  }
  
  const formattedCreatedDate = format(new Date(bug.created_at), 'MMMM d, yyyy HH:mm');
  const formattedUpdatedDate = format(new Date(bug.updated_at), 'MMMM d, yyyy HH:mm');
  
  const canUpdateStatus = currentUser?.role === 'admin' || currentUser?.role === 'developer';
  const canEditBug = currentUser?.role === 'admin';
  
  const handleStatusUpdate = async (newStatus: BugStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put<ApiResponse<Bug>>(
        `/Bugricer/backend/api/bugs/update.php?id=${bug.id}`,
        { status: newStatus },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      // Invalidate and refetch the bug data
      queryClient.invalidateQueries({ queryKey: ['bug', bug.id] });
      
      toast({
        title: "Success",
        description: "Bug status updated successfully",
      });
    } catch (error) {
      console.error('Failed to update bug status:', error);
      toast({
        title: "Error",
        description: "Failed to update bug status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-[60vh] bg-background px-2 py-4 sm:px-4 md:px-8 lg:px-12 xl:px-0">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <BugHeader 
          bug={bug} 
          formattedCreatedDate={formattedCreatedDate} 
          canEditBug={canEditBug} 
        />
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content - Description and Screenshots */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <BugContentCards bug={bug} />
          </div>
          
          {/* Sidebar - Bug Details */}
          <aside className="space-y-4 sm:space-y-6">
            <BugDetailsCard 
              bug={bug}
              canUpdateStatus={canUpdateStatus}
              updateBugStatus={handleStatusUpdate}
              formattedUpdatedDate={formattedUpdatedDate}
            />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BugDetails;
