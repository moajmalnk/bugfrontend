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
      <main className="flex items-center justify-center min-h-[60vh] bg-background" aria-busy="true" aria-live="polite">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" aria-label="Loading"></div>
      </main>
    );
  }

  if (error || !bug) {
    return (
      <main>
        <BugNotFound />
      </main>
    );
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
    <main className="min-h-[60vh] bg-background px-2 py-4 sm:px-4 md:px-8 lg:px-12 xl:px-0">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <header>
          <BugHeader
            bug={bug}
            formattedCreatedDate={formattedCreatedDate}
            canEditBug={canEditBug}
          />
        </header>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Main Content - Description and Screenshots */}
          <section className="w-full lg:w-2/3 space-y-6 sm:space-y-8" aria-label="Bug Content">
            <BugContentCards bug={bug} />
          </section>

          {/* Sidebar - Bug Details */}
          <aside className="w-full lg:w-1/3 space-y-6 sm:space-y-8" aria-label="Bug Details">
            <BugDetailsCard
              bug={bug}
              canUpdateStatus={canUpdateStatus}
              updateBugStatus={handleStatusUpdate}
              formattedUpdatedDate={formattedUpdatedDate}
            />
          </aside>
        </div>
      </section>
    </main>
  );
};

export default BugDetails;
