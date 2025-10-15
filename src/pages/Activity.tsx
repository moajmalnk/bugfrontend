import { ActivityList } from '@/components/activities/ActivityList';

const Activity = () => {
  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Activity Feed</h1>
      </div>
      
      <ActivityList 
        limit={20}
        showPagination={true}
        autoRefresh={true}
        refreshInterval={30000}
      />
    </div>
  );
};

export default Activity;
