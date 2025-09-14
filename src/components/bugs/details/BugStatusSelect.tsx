
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BugStatus } from '@/types';

interface BugStatusSelectProps {
  status: BugStatus;
  onChange: (status: BugStatus) => Promise<void>;
  disabled?: boolean;
}

export const BugStatusSelect = ({ status, onChange, disabled = false }: BugStatusSelectProps) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (value: string) => {
    setIsUpdating(true);
    
    try {
      await onChange(value as BugStatus);
    } catch (error) {
      // console.error('Failed to update bug status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Select 
      value={status} 
      onValueChange={handleStatusChange}
      disabled={disabled || isUpdating}
    >
      <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="in_progress">In Progress</SelectItem>
        <SelectItem value="fixed">Fixed</SelectItem>
        <SelectItem value="declined">Declined</SelectItem>
        <SelectItem value="rejected">Rejected</SelectItem>
      </SelectContent>
    </Select>
  );
};
