
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { DuplicateOfDialog, DuplicateOriginal } from '@/components/bugs/DuplicateOfDialog';
import { BugStatus } from '@/types';

interface BugStatusSelectProps {
  status: BugStatus;
  onChange: (status: BugStatus) => Promise<void>;
  disabled?: boolean;
  projectId?: string;
  bugId?: string;
  onDuplicate?: (original: DuplicateOriginal) => Promise<void>;
}

export const BugStatusSelect = ({
  status,
  onChange,
  disabled = false,
  projectId,
  bugId,
  onDuplicate,
}: BugStatusSelectProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  const handleStatusChange = async (value: string) => {
    if (value === 'duplicate') {
      if (!projectId || !bugId || !onDuplicate) {
        toast({
          title: 'Choose the original bug',
          description: 'Open the bug and mark it Duplicate from Bug Details.',
          variant: 'destructive',
        });
        return;
      }
      setDuplicateOpen(true);
      return;
    }

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
    <>
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
        <SelectItem value="duplicate">Duplicate</SelectItem>
      </SelectContent>
    </Select>
    {projectId && bugId && onDuplicate ? (
      <DuplicateOfDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        projectId={projectId}
        excludeBugId={bugId}
        onConfirm={async (original) => {
          setIsUpdating(true);
          try {
            await onDuplicate(original);
          } finally {
            setIsUpdating(false);
          }
        }}
      />
    ) : null}
    </>
  );
};
