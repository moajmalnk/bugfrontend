import { useEffect, useMemo, useState } from 'react';
import { createTask, deleteTask, listMyTasks, updateTask, UserTask } from '@/services/todoService';
import { sharedTaskService, SharedTask } from '@/services/sharedTaskService';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Search, Filter, Clock, ListChecks, User, FileText, Calendar, Users, CheckCircle2, Undo2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/DatePicker';
import { useAuth } from '@/context/AuthContext';
import { useUndoDelete } from '@/hooks/useUndoDelete';
import { useSearchParams } from 'react-router-dom';
import { projectService, Project } from '@/services/projectService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ApiResponse<T> = { success?: boolean; message?: string; data?: T } | T;

export default function MyTasks() {
  const { currentUser } = useAuth();
  const [myLoading, setMyLoading] = useState(true);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [items, setItems] = useState<UserTask[]>([]);
  const [sharedTasks, setSharedTasks] = useState<SharedTask[]>([]);
  const [myFilter, setMyFilter] = useState<{ status?: string; q?: string }>({});
  const [sharedFilter, setSharedFilter] = useState<{ status?: string; q?: string }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [sharedModalOpen, setSharedModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserTask | null>(null);
  const [editingShared, setEditingShared] = useState<SharedTask | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sharedDetailOpen, setSharedDetailOpen] = useState(false);
  const [selected, setSelected] = useState<UserTask | null>(null);
  const [selectedShared, setSelectedShared] = useState<SharedTask | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "my-tasks";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [taskToDelete, setTaskToDelete] = useState<UserTask | null>(null);
  const [sharedTaskToDelete, setSharedTaskToDelete] = useState<SharedTask | null>(null);
  const [sharedSearchTerm, setSharedSearchTerm] = useState("");

  // Helper function to filter items
  const itemsFiltered = (items: UserTask[], query?: string) => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();
    return items.filter(item => 
      item.title?.toLowerCase().includes(lowerQuery) ||
      item.description?.toLowerCase().includes(lowerQuery)
    );
  };

  // Filtered shared tasks
  const filteredSharedTasks = useMemo(() => {
    if (!sharedSearchTerm) return sharedTasks;
    const lowerQuery = sharedSearchTerm.toLowerCase();
    return sharedTasks.filter(task =>
      task.title?.toLowerCase().includes(lowerQuery) ||
      task.description?.toLowerCase().includes(lowerQuery)
    );
  }, [sharedTasks, sharedSearchTerm]);

  // Helper function to get user display name
  const getUserDisplayName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.name} (${user.email})` : 'Unknown User';
  };

  // Undo delete hooks for both personal and shared tasks
  const undoDeleteTask = useUndoDelete({
    duration: 10,
    onConfirm: () => {
      if (taskToDelete?.id) {
        performActualDelete(taskToDelete.id);
        setTaskToDelete(null);
      }
    },
    onUndo: () => {
      setTaskToDelete(null);
      toast({
        title: "Deletion Cancelled",
        description: "Task deletion has been cancelled.",
      });
    },
  });

  const undoDeleteSharedTask = useUndoDelete({
    duration: 10,
    onConfirm: () => {
      if (sharedTaskToDelete?.id) {
        performActualDeleteShared(sharedTaskToDelete.id);
        setSharedTaskToDelete(null);
      }
    },
    onUndo: () => {
      setSharedTaskToDelete(null);
      toast({
        title: "Deletion Cancelled",
        description: "Shared task deletion has been cancelled.",
      });
    },
  });

  async function load() {
    try {
      setMyLoading(true);
      const res: ApiResponse<UserTask[]> = await listMyTasks(myFilter);
      const data = (res as any).data ?? res;
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load tasks');
    } finally {
      setMyLoading(false);
    }
  }

  async function loadSharedTasks() {
    try {
      setSharedLoading(true);
      const tasks = await sharedTaskService.getSharedTasks(sharedFilter.status);
      setSharedTasks(tasks);
    } catch (e: any) {
      setError(e?.message || 'Failed to load shared tasks');
    } finally {
      setSharedLoading(false);
    }
  }

  async function loadProjects() {
    try {
      const projectsData = await projectService.getProjects();
      setProjects(projectsData);
    } catch (e: any) {
      console.error('Failed to load projects:', e);
    }
  }

  async function loadUsers() {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/get.php`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token") || localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        // Filter to only show admins and developers
        const filteredUsers = data.data.filter((user: any) => 
          user.role === 'admin' || user.role === 'developer'
        );
        setUsers(filteredUsers);
      }
    } catch (e: any) {
      console.error('Failed to load users:', e);
    }
  }

  useEffect(() => {
    if (activeTab === 'my-tasks') {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, myFilter?.status, myFilter?.q]);

  useEffect(() => {
    if (activeTab === 'shared-tasks') {
      loadSharedTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sharedFilter?.status, sharedFilter?.q]);

  // Preload both lists once to keep tab counters accurate
  useEffect(() => {
    load();
    loadSharedTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, []);

  // Sync activeTab with URL
  useEffect(() => {
    const urlTab = searchParams.get("tab") || "my-tasks";
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const statuses = useMemo(() => ['in_progress', 'todo', 'blocked', 'done'], []);
  const sharedStatuses = useMemo(() => ['pending', 'in_progress', 'completed', 'approved'], []);

  // Calculate pending tasks count
  const pendingTasksCount = useMemo(() => {
    return items.filter(task => task.status !== 'done').length;
  }, [items]);

  // Calculate shared tasks count
  const sharedTasksCount = useMemo(() => {
    return sharedTasks.filter(task => task.status !== 'completed' && task.status !== 'approved').length;
  }, [sharedTasks]);

  function openCreate() {
    setEditing({ title: '', status: 'todo', priority: 'medium' });
    setModalOpen(true);
  }

  function openEdit(t: UserTask) {
    setEditing({ ...t });
    setModalOpen(true);
  }

  function openDetails(t: UserTask) {
    setSelected(t);
    setDetailOpen(true);
  }

  async function onSave() {
    if (!editing?.title) return;
    try {
      setSubmitting(true);
      setError(null);
      if (editing.id) {
        await updateTask({ ...editing, id: editing.id });
        toast({ title: 'Task updated' });
      } else {
        await createTask(editing);
        toast({ title: 'Task created' });
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function performActualDelete(id: number) {
    try {
      await deleteTask(id);
      toast({ title: 'Task deleted successfully' });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete task');
    }
  }

  async function onDelete(id?: number) {
    if (!id) return;
    
    const task = items.find(t => t.id === id);
    if (!task) return;

    setTaskToDelete(task);
    undoDeleteTask.startCountdown();

    toast({
      title: "Task Deletion Started",
      description: `"${task.title}" will be deleted in ${undoDeleteTask.timeLeft} seconds. Click undo to cancel.`,
      action: (
        <button
          onClick={() => undoDeleteTask.cancelCountdown()}
          className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <Undo2 className="h-4 w-4" />
          Undo
        </button>
      ),
    });
  }

  async function markCompleted(t: UserTask) {
    if (!t?.id) return;
    
    // Create custom confirmation modal
    const confirmed = await new Promise<boolean>((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4';
      modal.innerHTML = `
        <div class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700">
          <div class="px-6 py-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <svg class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Mark as Completed</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Task will be marked as done</p>
              </div>
            </div>
            <div class="mb-6">
              <p class="text-sm font-medium text-gray-900 dark:text-white mb-2">Task:</p>
              <p class="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">${t.title}</p>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to mark this task as completed? You can still edit it later if needed.
            </p>
            <div class="flex items-center justify-end gap-3">
              <button class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors" onclick="this.closest('.fixed').remove(); window.taskCompleteResolve?.(false)">
                Cancel
              </button>
              <button class="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors" onclick="this.closest('.fixed').remove(); window.taskCompleteResolve?.(true)">
                Mark Complete
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      (window as any).taskCompleteResolve = resolve;
    });
    
    if (!confirmed) return;
    
    try {
      await updateTask({ id: t.id as number, status: 'done' });
      toast({ title: 'Task marked as completed!' });
      await load();
    } catch (e: any) {
      toast({ title: 'Failed to mark as completed', description: e?.message, variant: 'destructive' });
    }
  }

  // Shared Task Handlers
  function openCreateShared() {
    setEditingShared({ 
      title: '', 
      status: 'pending', 
      priority: 'medium', 
      created_by: currentUser?.id || '',
      assigned_to: '',
      project_ids: []
    });
    setSharedModalOpen(true);
  }

  function openEditShared(t: SharedTask) {
    setEditingShared({ ...t });
    setSharedModalOpen(true);
  }

  function openDetailsShared(t: SharedTask) {
    setSelectedShared(t);
    setSharedDetailOpen(true);
  }

  async function onSaveShared() {
    if (!editingShared?.title || !editingShared?.assigned_to) {
      toast({ title: 'Error', description: 'Title and assigned user are required', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      if (editingShared.id) {
        await sharedTaskService.updateSharedTask(editingShared as any);
        toast({ title: 'Shared task updated' });
      } else {
        await sharedTaskService.createSharedTask(editingShared);
        toast({ title: 'Shared task created' });
      }
      setSharedModalOpen(false);
      await loadSharedTasks();
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
      toast({ title: 'Error', description: e?.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  async function performActualDeleteShared(id: number) {
    try {
      await sharedTaskService.deleteSharedTask(id);
      toast({ title: 'Shared task deleted successfully' });
      await loadSharedTasks();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete shared task');
      toast({ title: 'Error', description: e?.message, variant: 'destructive' });
    }
  }

  async function onDeleteShared(id?: number) {
    if (!id) return;
    
    const task = sharedTasks.find(t => t.id === id);
    if (!task) return;

    setSharedTaskToDelete(task);
    undoDeleteSharedTask.startCountdown();

    toast({
      title: "Shared Task Deletion Started",
      description: `"${task.title}" will be deleted in ${undoDeleteSharedTask.timeLeft} seconds. Click undo to cancel.`,
      action: (
        <button
          onClick={() => undoDeleteSharedTask.cancelCountdown()}
          className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <Undo2 className="h-4 w-4" />
          Undo
        </button>
      ),
    });
  }

  async function markSharedCompleted(t: SharedTask) {
    if (!t?.id) return;
    
    // Create custom confirmation modal
    const confirmed = await new Promise<boolean>((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4';
      modal.innerHTML = `
        <div class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700">
          <div class="px-6 py-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <svg class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Mark as Completed</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Task will be marked as done</p>
              </div>
            </div>
            <div class="mb-6">
              <p class="text-sm font-medium text-gray-900 dark:text-white mb-2">Task:</p>
              <p class="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">${t.title}</p>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to mark this task as completed? You can still edit it later if needed.
            </p>
            <div class="flex items-center justify-end gap-3">
              <button class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors" onclick="this.closest('.fixed').remove(); window.sharedTaskCompleteResolve?.(false)">
                Cancel
              </button>
              <button class="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors" onclick="this.closest('.fixed').remove(); window.sharedTaskCompleteResolve?.(true)">
                Mark Complete
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      (window as any).sharedTaskCompleteResolve = resolve;
    });
    
    if (!confirmed) return;
    
    try {
      await sharedTaskService.completeTaskForUser(t.id);
      toast({ title: 'Task marked as completed!' });
      await loadSharedTasks();
    } catch (e: any) {
      toast({ title: 'Failed to mark as completed', description: e?.message, variant: 'destructive' });
    }
  }

  async function uncompleteSharedTask(t: SharedTask) {
    if (!t?.id) return;
    
    // Create custom confirmation modal
    const confirmed = await new Promise<boolean>((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4';
      modal.innerHTML = `
        <div class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700">
          <div class="px-6 py-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <svg class="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Mark as Incomplete</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Task will be marked as incomplete</p>
              </div>
            </div>
            <div class="mb-6">
              <p class="text-sm font-medium text-gray-900 dark:text-white mb-2">Task:</p>
              <p class="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">${t.title}</p>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to mark this task as incomplete? This will change its status back to pending.
            </p>
            <div class="flex items-center justify-end gap-3">
              <button class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors" onclick="this.closest('.fixed').remove(); window.sharedTaskUncompleteResolve?.(false)">
                Cancel
              </button>
              <button class="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors" onclick="this.closest('.fixed').remove(); window.sharedTaskUncompleteResolve?.(true)">
                Mark Incomplete
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      (window as any).sharedTaskUncompleteResolve = resolve;
    });
    
    if (!confirmed) return;
    
    try {
      await sharedTaskService.uncompleteTaskForUser(t.id);
      toast({ title: 'Task marked as incomplete!' });
      await loadSharedTasks();
    } catch (e: any) {
      toast({ title: 'Failed to mark as incomplete', description: e?.message, variant: 'destructive' });
    }
  }

  async function declineSharedTask(t: SharedTask) {
    if (!t?.id) return;
    
    // Create custom confirmation modal
    const confirmed = await new Promise<boolean>((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4';
      modal.innerHTML = `
        <div class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700">
          <div class="px-6 py-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Decline Task</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">You will be removed from this task</p>
              </div>
            </div>
            <div class="mb-6">
              <p class="text-sm font-medium text-gray-900 dark:text-white mb-2">Task:</p>
              <p class="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">${t.title}</p>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to decline this task? This will remove you from the task and you won't be able to work on it anymore.
            </p>
            <div class="flex items-center justify-end gap-3">
              <button class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors" onclick="this.closest('.fixed').remove(); window.sharedTaskDeclineResolve?.(false)">
                Cancel
              </button>
              <button class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors" onclick="this.closest('.fixed').remove(); window.sharedTaskDeclineResolve?.(true)">
                Decline Task
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      (window as any).sharedTaskDeclineResolve = resolve;
    });
    
    if (!confirmed) return;
    
    try {
      await sharedTaskService.declineTask(t.id);
      toast({ title: 'Task declined successfully!' });
      await loadSharedTasks();
    } catch (e: any) {
      toast({ title: 'Failed to decline task', description: e?.message, variant: 'destructive' });
    }
  }

  async function approveSharedTask(t: SharedTask) {
    if (!t?.id) return;
    
    // Create custom confirmation modal
    const confirmed = await new Promise<boolean>((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4';
      modal.innerHTML = `
        <div class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700">
          <div class="px-6 py-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <svg class="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Approve Task</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Task will be marked as approved</p>
              </div>
            </div>
            <div class="mb-6">
              <p class="text-sm font-medium text-gray-900 dark:text-white mb-2">Task:</p>
              <p class="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">${t.title}</p>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to approve this task? This will mark it as completed and approved by you.
            </p>
            <div class="flex items-center justify-end gap-3">
              <button class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors" onclick="this.closest('.fixed').remove(); window.sharedTaskApproveResolve?.(false)">
                Cancel
              </button>
              <button class="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors" onclick="this.closest('.fixed').remove(); window.sharedTaskApproveResolve?.(true)">
                Approve Task
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      (window as any).sharedTaskApproveResolve = resolve;
    });
    
    if (!confirmed) return;
    
    try {
      await sharedTaskService.updateSharedTask({ id: t.id, status: 'approved' });
      toast({ title: 'Shared task approved!' });
      await loadSharedTasks();
    } catch (e: any) {
      toast({ title: 'Failed to approve task', description: e?.message, variant: 'destructive' });
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                    <ListChecks className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      BugToDo
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Track and manage your personal work across projects
                </p>
                {currentUser && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {(() => {
                      try {
                        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
                        if (token) {
                          const payload = JSON.parse(atob(token.split('.')[1]));
                          if (payload.purpose === 'dashboard_access' && payload.admin_id) {
                            // For dashboard tokens, show admin info for personal tasks
                            return (
                              <>
                                <span>Personal Tasks for: <strong>{currentUser.username}</strong> (ID: {currentUser.id})</span>
                              </>
                            );
                          }
                        }
                      } catch (e) {
                        // Ignore token parsing errors
                      }
                    })()}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Button 
                  onClick={activeTab === 'my-tasks' ? openCreate : openCreateShared} 
                  className="h-12 px-6 bg-gradient-to-r from-blue-600 to-emerald-700 hover:from-blue-700 hover:to-emerald-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <div className="flex items-center gap-3">
                    <Plus className="h-5 w-5" />
                    <span>{activeTab === 'my-tasks' ? 'New Task' : 'New Shared Task'}</span>
                  </div>
                </Button>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-emerald-600 rounded-lg">
                      <ListChecks className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                        {activeTab === 'my-tasks' ? pendingTasksCount : sharedTasksCount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val);
            setSearchParams({ tab: val });
          }}
          className="w-full"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl"></div>
            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
              <TabsList className="grid w-full grid-cols-2 h-14 bg-transparent p-1">
              <TabsTrigger
                  value="shared-tasks"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">Shared Tasks</span>
                  <span className="sm:hidden">Shared</span>
                  <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                    {sharedTasks.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="my-tasks"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <ListChecks className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">My Tasks</span>
                  <span className="sm:hidden">My</span>
                  <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
                    {pendingTasksCount}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

        <TabsContent value="my-tasks" className="space-y-6 sm:space-y-8">

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Search & Filters */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-xl"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/40 rounded-xl p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Search className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                    id="tasks-search"
                    type="text"
                    placeholder="Search tasks by title or description..."
                    value={(activeTab === 'my-tasks' ? myFilter.q : sharedFilter.q) || ''}
                    onChange={(e) => {
                      if (activeTab === 'my-tasks') setMyFilter((f) => ({ ...f, q: e.target.value }));
                      else setSharedFilter((f) => ({ ...f, q: e.target.value }));
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-600 rounded-lg shrink-0">
                    <Filter className="h-4 w-4 text-white" />
                  </div>
                  <Select
                    value={(activeTab === 'my-tasks' ? myFilter.status : sharedFilter.status) || 'all'}
                    onValueChange={(value) => {
                      if (activeTab === 'my-tasks') setMyFilter({ ...myFilter, status: value === 'all' ? undefined : value });
                      else setSharedFilter({ ...sharedFilter, status: value === 'all' ? undefined : value });
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[140px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[60]">
                      <SelectItem value="all">All statuses</SelectItem>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Grid with Enhanced Professional Design */}
        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {myLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))
            : itemsFiltered(items, myFilter.q).length === 0
            ? (
              <div className="col-span-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
                  <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">No Tasks</h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    Create your first task to get started.
                  </p>
                  <Button onClick={openCreate} className="h-10 sm:h-11 px-6 sm:px-8 bg-gradient-to-r from-blue-600 to-emerald-600 text-white">New Task</Button>
                </div>
              </div>
            )
            : itemsFiltered(items, myFilter.q).map((t, index) => (
              <div key={t.id ?? Math.random()} className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col h-full shadow-sm transition-all duration-300 hover:shadow-2xl">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-emerald-50/40 dark:from-blue-950/15 dark:via-transparent dark:to-emerald-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Card Header */}
                <div className="pb-2 p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
                    <Badge
                      variant={
                        t.status === "done" ? "default" : "outline"
                      }
                      className="text-xs sm:text-sm px-2 py-1 rounded-full backdrop-blur-sm self-start"
                    >
                      {t.status.charAt(0).toUpperCase() + t.status.slice(1).replace('_', ' ')}
                    </Badge>
                    <div className="text-xs sm:text-sm text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="truncate">
                        {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No due date'}
                      </span>
                    </div>
                  </div>
                  <div className="break-words text-base sm:text-lg lg:text-xl font-semibold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent hover:opacity-90 transition-opacity cursor-pointer" onClick={() => openDetails(t)}>
                    {t.title}
                  </div>
                  {t.description && (
                    <div className="break-words text-xs sm:text-sm lg:text-base mt-1 sm:mt-2 text-muted-foreground">
                      {t.description}
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="relative flex-1 flex flex-col justify-end py-2 px-4 sm:px-5">
                  <div className="flex flex-col gap-3">
                    {/* Priority and Hours Stats */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2">
                      <div className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg bg-blue-50/70 dark:bg-blue-900/20 hover:bg-blue-100/80 dark:hover:bg-blue-900/30 transition-colors duration-200">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          Priority
                        </span>
                        <span className={`font-semibold text-lg sm:text-xl ${
                          t.priority === 'high' ? 'text-red-600 dark:text-red-400' :
                          t.priority === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-green-600 dark:text-green-400'
                        }`}>
                          {t.priority || 'medium'}
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          Level
                        </span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg bg-green-50/70 dark:bg-green-900/20 hover:bg-green-100/80 dark:hover:bg-green-900/30 transition-colors duration-200">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          Hours
                        </span>
                        <span className="font-semibold text-lg sm:text-xl text-green-600 dark:text-green-400">
                          {t.spent_hours || 0}
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          Spent
                        </span>
                      </div>
                    </div>

                    {/* Task Information */}
                    <div className="mt-1 p-2 sm:p-3 rounded-lg bg-gray-50/70 dark:bg-gray-800/20 hover:bg-gray-100/80 dark:hover:bg-gray-800/30 transition-colors duration-200">
                      <div className="space-y-2">
                        {/* First Row - Task Info */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <ListChecks className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                            <span className="text-sm sm:text-base font-medium">
                              Task
                            </span>
                          </div>
                          <div className="flex items-center gap-1" title="Expected Hours">
                            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
                            <span className="text-xs sm:text-sm">
                              {t.expected_hours || 0}h
                            </span>
                          </div>
                        </div>
                        {/* Second Row - Spent Hours */}
                        <div className="flex items-center justify-end">
                          <div className="flex items-center gap-1" title="Spent Hours">
                            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                            <span className="text-xs sm:text-sm">
                              {t.spent_hours || 0}h
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 mt-auto p-4 sm:p-5">
                  {(() => {
                    const buttons = [
                      {
                        component: (
                          <Button 
                            variant="default"
                            className="w-full h-11 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                            onClick={() => openDetails(t)}
                          >
                            View
                          </Button>
                        )
                      },
                      ...(t.status !== 'done' ? [{
                        component: (
                          <Button 
                            size="sm" 
                            onClick={() => markCompleted(t)} 
                            className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            Complete
                          </Button>
                        )
                      }] : []),
                      {
                        component: (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openEdit(t)} 
                            className="w-full h-11 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            Edit
                          </Button>
                        )
                      },
                      {
                        component: taskToDelete?.id === t.id && undoDeleteTask.isCountingDown ? (
                          <div className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md h-11 w-full">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-red-700 dark:text-red-300">
                              {undoDeleteTask.timeLeft}s
                            </span>
                          </div>
                        ) : (
                          <Button 
                            variant="destructive"
                            size="sm" 
                            onClick={() => onDelete(t.id)} 
                            className="w-full h-11 font-semibold shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
                          >
                            Delete
                          </Button>
                        )
                      }
                    ];

                    const buttonCount = buttons.length;
                    
                    // Professional responsive grid layout based on button count
                    const getGridClasses = () => {
                      if (buttonCount === 1) return "grid grid-cols-1 gap-3";
                      if (buttonCount === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-3";
                      if (buttonCount === 3) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3";
                      if (buttonCount === 4) return "grid grid-cols-1 sm:grid-cols-2 gap-3";
                      return "grid grid-cols-1 sm:grid-cols-2 gap-3";
                    };

                    return (
                      <div className={getGridClasses()}>
                        {buttons.map((button, index) => (
                          <div key={index}>
                            {button.component}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
        </div>
        </TabsContent>

        {/* Shared Tasks Tab */}
        <TabsContent value="shared-tasks" className="space-y-6 sm:space-y-8">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {/* Search & Filters */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/40 rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</h3>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="shared-tasks-search"
                      placeholder="Search shared tasks..."
                      value={sharedSearchTerm}
                      onChange={(e) => setSharedSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSharedSearchTerm("")}
                      className="px-4"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shared Tasks Grid with Enhanced Professional Design */}
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {sharedLoading ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
              </>
            ) : filteredSharedTasks.length === 0 ? (
              <div className="col-span-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
                  <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">No shared tasks found</h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    {sharedSearchTerm ? "Try adjusting your search terms" : "No shared tasks have been created yet"}
                  </p>
                  {currentUser?.role === 'admin' && (
                    <Button onClick={openCreateShared} className="h-10 sm:h-11 px-6 sm:px-8 bg-gradient-to-r from-blue-600 to-emerald-600 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Shared Task
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              filteredSharedTasks.map((t, index) => (
                <div key={t.id} className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col h-full shadow-sm transition-all duration-300 hover:shadow-2xl">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-emerald-50/40 dark:from-blue-950/15 dark:via-transparent dark:to-emerald-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Card Header */}
                  <div className="pb-2 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
                      <Badge
                        variant={
                          t.status === "approved" ? "default" : "outline"
                        }
                        className="text-xs sm:text-sm px-2 py-1 rounded-full backdrop-blur-sm self-start"
                      >
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1).replace('_', ' ')}
                      </Badge>
                      <div className="text-xs sm:text-sm text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="truncate">
                          {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No due date'}
                        </span>
                      </div>
                    </div>
                    <div className="break-words text-base sm:text-lg lg:text-xl font-semibold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent hover:opacity-90 transition-opacity cursor-pointer" onClick={() => openDetailsShared(t)}>
                      {t.title}
                    </div>
                    {t.description && (
                      <div className="break-words text-xs sm:text-sm lg:text-base mt-1 sm:mt-2 text-muted-foreground">
                        {t.description}
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="relative flex-1 flex flex-col justify-end py-2 px-4 sm:px-5">
                    <div className="flex flex-col gap-3">
                      {/* Priority and Status Stats */}
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2">
                        <div className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg bg-blue-50/70 dark:bg-blue-900/20 hover:bg-blue-100/80 dark:hover:bg-blue-900/30 transition-colors duration-200">
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            Priority
                          </span>
                          <span className={`font-semibold text-lg sm:text-xl ${
                            t.priority === 'high' ? 'text-red-600 dark:text-red-400' :
                            t.priority === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-green-600 dark:text-green-400'
                          }`}>
                            {t.priority || 'medium'}
                          </span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            Level
                          </span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg bg-green-50/70 dark:bg-green-900/20 hover:bg-green-100/80 dark:hover:bg-green-900/30 transition-colors duration-200">
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            Status
                          </span>
                          <span className={`font-semibold text-lg sm:text-xl ${
                            t.status === 'approved' ? 'text-purple-600 dark:text-purple-400' :
                            t.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                            t.status === 'in_progress' ? 'text-blue-600 dark:text-blue-400' :
                            'text-gray-600 dark:text-gray-400'
                          }`}>
                            {t.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            Current
                          </span>
                        </div>
                      </div>

                      {/* Task Information */}
                      <div className="mt-1 p-2 sm:p-3 rounded-lg bg-gray-50/70 dark:bg-gray-800/20 hover:bg-gray-100/80 dark:hover:bg-gray-800/30 transition-colors duration-200">
                        <div className="space-y-2">
                          {/* First Row - Assigned Info */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                              <span className="text-sm sm:text-base font-medium">
                                Assigned
                              </span>
                            </div>
                            <div className="flex items-center gap-1" title="Assigned To">
                              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
                              <span className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[100px]">
                                {getUserDisplayName(t.assigned_to).split(' ')[0]}
                              </span>
                            </div>
                          </div>
                          {/* Second Row - Date Info */}
                          <div className="flex items-center justify-end">
                            <div className="flex items-center gap-1" title="Created Date">
                              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                              <span className="text-xs sm:text-sm">
                                {new Date(t.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2 mt-auto p-4 sm:p-5">
                    {(() => {
                      const buttons = [
                        // View button (always present)
                        {
                          component: (
                            <Button 
                              variant="default"
                              className="w-full h-11 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                              onClick={() => openDetailsShared(t)}
                            >
                              View
                            </Button>
                          )
                        },
                        // Edit button (only for creator)
                        ...(t.created_by === currentUser?.id ? [{
                          component: (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => openEditShared(t)} 
                              className="w-full h-11 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                            >
                              Edit
                            </Button>
                          )
                        }] : []),
                        // Complete button (only for assignee when not completed)
                        ...(t.status !== 'completed' && t.assigned_to === currentUser?.id ? [{
                          component: (
                            <Button 
                              size="sm" 
                              onClick={() => markSharedCompleted(t)} 
                              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                            >
                              Complete
                            </Button>
                          )
                        }] : []),
                        // Delete button (only for creator)
                        ...(t.created_by === currentUser?.id ? [{
                          component: sharedTaskToDelete?.id === t.id && undoDeleteSharedTask.isCountingDown ? (
                            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md h-11 w-full">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                                {undoDeleteSharedTask.timeLeft}s
                              </span>
                            </div>
                          ) : (
                            <Button 
                              variant="destructive"
                              size="sm" 
                              onClick={() => onDeleteShared(t.id)} 
                              className="w-full h-11 font-semibold shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
                            >
                              Delete
                            </Button>
                          )
                        }] : [])
                      ];

                      const buttonCount = buttons.length;
                      
                      // Professional responsive grid layout based on button count
                      const getGridClasses = () => {
                        if (buttonCount === 1) return "grid grid-cols-1 gap-3";
                        if (buttonCount === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-3";
                        if (buttonCount === 3) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3";
                        if (buttonCount === 4) return "grid grid-cols-1 sm:grid-cols-2 gap-3";
                        return "grid grid-cols-1 sm:grid-cols-2 gap-3";
                      };

                      return (
                        <div className={getGridClasses()}>
                          {buttons.map((button, index) => (
                            <div key={index}>
                              {button.component}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
        </Tabs>

        {/* Professional Modal for Create/Edit Task */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent 
            className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0 sm:max-w-2xl sm:w-full sm:max-h-[85vh] rounded-xl hide-scrollbar fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 !ml-0"
            style={{ marginLeft: '0 !important' }}
            aria-describedby="task-edit-description"
          >
            <DialogHeader className="relative">
              <DialogTitle className="flex items-center gap-3 pr-12">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-600">
                  <ListChecks className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg sm:text-xl font-semibold">
                  {editing?.id ? 'Edit Task' : 'Create New Task'}
                </span>
              </DialogTitle>
              <p id="task-edit-description" className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {editing?.id ? 'Update your task details and settings.' : 'Create a new task with title, description, and other details.'}
              </p>
              <Button
                onClick={() => setModalOpen(false)}
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X className="h-4 w-4" />
                </Button>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-4 sm:space-y-5">
                {/* Title */}
                <div>
                  <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Task Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-task-title"
                    value={editing?.title || ''}
                    onChange={(e) => setEditing((prev) => ({ ...(prev as UserTask), title: e.target.value }))}
                    placeholder="Enter task title..."
                    className="h-11"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </Label>
                  <Textarea
                    id="edit-task-description"
                    className="min-h-[80px] sm:min-h-[100px] resize-none"
                    value={editing?.description || ''}
                    onChange={(e) => setEditing((prev) => ({ ...(prev as UserTask), description: e.target.value }))}
                    placeholder="Describe what needs to be done..."
                  />
                </div>

                {/* Status and Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </Label>
                  <select
                      id="edit-task-status"
                      className="h-11 w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                    value={editing?.status || 'todo'}
                    onChange={(e) => setEditing((prev) => ({ ...(prev as UserTask), status: e.target.value as UserTask['status'] }))}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>{s.replace('_',' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Priority
                    </Label>
                  <select
                      id="edit-task-priority"
                      className="h-11 w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                    value={editing?.priority || 'medium'}
                    onChange={(e) => setEditing((prev) => ({ ...(prev as UserTask), priority: e.target.value as UserTask['priority'] }))}
                  >
                    {['low','medium','high'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  </div>
                </div>

                {/* Due Date and Period */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Due Date
                    </Label>
                    <DatePicker
                    value={editing?.due_date || ''}
                      onChange={(value) => setEditing((prev) => ({ ...(prev as UserTask), due_date: value }))}
                      placeholder="Select due date"
                  />
                </div>

                <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Period
                    </Label>
                  <select
                      id="edit-task-period"
                      className="h-11 w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                    value={editing?.period || 'daily'}
                    onChange={(e) => setEditing((prev) => ({ ...(prev as UserTask), period: e.target.value as UserTask['period'] }))}
                  >
                    {['daily','weekly','monthly','yearly','custom'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  </div>
                </div>

                {/* Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Expected Hours
                    </Label>
                  <Input
                    id="edit-task-expected-hours"
                    type="number"
                    step="0.25"
                    value={editing?.expected_hours ?? ''}
                    onChange={(e) => setEditing((prev) => ({ ...(prev as UserTask), expected_hours: Number(e.target.value) }))}
                      placeholder="0"
                      className="h-11"
                  />
                </div>

                <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Spent Hours
                    </Label>
                  <Input
                    id="edit-task-spent-hours"
                    type="number"
                    step="0.25"
                    value={editing?.spent_hours ?? ''}
                    onChange={(e) => setEditing((prev) => ({ ...(prev as UserTask), spent_hours: Number(e.target.value) }))}
                      placeholder="0"
                      className="h-11"
                  />
                  </div>
                </div>
              </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button 
                  onClick={onSave} 
                    disabled={submitting || !editing?.title?.trim()}
                    className={`flex-1 h-11 sm:h-12 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                      "bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white"
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        <span className="text-sm">Saving…</span>
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        <span className="text-sm">{editing?.id ? 'Update Task' : 'Create Task'}</span>
                      </>
                    )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Professional Detail Modal */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent 
            className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0 sm:max-w-2xl sm:w-full sm:max-h-[85vh] rounded-xl hide-scrollbar fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 !ml-0"
            style={{ marginLeft: '0 !important' }}
            aria-describedby="task-detail-description"
          >
            <DialogHeader className="relative">
              <DialogTitle className="flex items-center gap-3 pr-12">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-600">
                  <ListChecks className="h-5 w-5 text-white" />
          </div>
                <span className="text-lg sm:text-xl font-semibold line-clamp-2">
                  {selected?.title}
                </span>
              </DialogTitle>
              <p id="task-detail-description" className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                View detailed information about this task including status, priority, and progress.
              </p>
              <Button
                onClick={() => setDetailOpen(false)}
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            {selected && (
              <div className="space-y-6">
                {/* Status and Priority Badges */}
                <div className="flex flex-wrap items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`capitalize text-xs ${
                          selected.status === 'done' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400' :
                          selected.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400' :
                          selected.status === 'blocked' ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400' :
                          'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {selected.status.replace('_', ' ')}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`capitalize text-xs ${
                          selected.priority === 'high' ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400' :
                          selected.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400'
                        }`}
                      >
                        {selected.priority || 'medium'} priority
                      </Badge>
              </div>

                {/* Description Section */}
                {selected.description && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <div className="p-1.5 bg-blue-600 rounded-lg">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      Description
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {selected.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Task Information Grid */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-600 rounded-lg">
                      <ListChecks className="h-4 w-4 text-white" />
                    </div>
                    Task Information
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">Created:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(selected.created_at || '').toLocaleDateString()}
                        </span>
                    </div>

                      <div className="flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selected.due_date ? new Date(selected.due_date).toLocaleDateString() : 'No due date'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {selected.status.replace('_', ' ')}
                        </span>
                        </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                          <ListChecks className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {selected.priority || 'medium'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Actions */}
                <div className="pt-6 border-t border-gray-200/60 dark:border-gray-700/60">
                  {(() => {
                    const buttons = [
                      {
                        component: (
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setDetailOpen(false);
                              openEdit(selected);
                            }} 
                            className="w-full h-12 px-6 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20 font-semibold shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Edit Task
                          </Button>
                        )
                      },
                      {
                        component: (
                          <Button 
                            variant="outline" 
                            onClick={() => setDetailOpen(false)} 
                            className="w-full h-12 px-6 font-semibold shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                          >
                            Close
                          </Button>
                        )
                      },
                      ...(selected.status !== 'done' ? [{
                        component: (
                          <Button 
                            onClick={async () => { 
                              await markCompleted(selected); 
                              setDetailOpen(false); 
                            }} 
                            className="w-full h-12 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark as Completed
                          </Button>
                        )
                      }] : [])
                    ];

                    const buttonCount = buttons.length;
                    
                    // Professional responsive grid layout based on button count
                    const getGridClasses = () => {
                      if (buttonCount === 1) return "grid grid-cols-1 gap-4";
                      if (buttonCount === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-4";
                      if (buttonCount === 3) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";
                      if (buttonCount === 4) return "grid grid-cols-1 sm:grid-cols-2 gap-4";
                      return "grid grid-cols-1 sm:grid-cols-2 gap-4";
                    };

                    return (
                      <div className={getGridClasses()}>
                        {buttons.map((button, index) => (
                          <div key={index} className="flex">
                            {button.component}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
          </div>
        )}
          </DialogContent>
        </Dialog>

        {/* Professional Shared Task Creation/Edit Modal */}
        <Dialog open={sharedModalOpen} onOpenChange={setSharedModalOpen}>
          <DialogContent 
            className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0 sm:max-w-2xl sm:w-full sm:max-h-[85vh] rounded-xl hide-scrollbar fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 !ml-0"
            style={{ marginLeft: '0 !important' }}
            aria-describedby="shared-task-edit-description"
          >
            <DialogHeader className="relative">
              <DialogTitle className="flex items-center gap-3 pr-12">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-600">
                  <ListChecks className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg sm:text-xl font-semibold">
                  {editingShared?.id ? 'Edit Shared Task' : 'Create New Shared Task'}
                      </span>
              </DialogTitle>
              <p id="shared-task-edit-description" className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {editingShared?.id ? 'Update the shared task details and assignee.' : 'Create a new shared task that can be assigned to team members.'}
              </p>
                      <Button 
                onClick={() => setSharedModalOpen(false)}
                variant="ghost"
                        size="sm" 
                className="absolute top-0 right-0 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                      >
                <X className="h-4 w-4" />
                      </Button>
            </DialogHeader>

            <div className="space-y-6">
                <div className="space-y-4 sm:space-y-5">
                  {/* Title */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Task Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                    id="edit-shared-task-title"
                    value={editingShared?.title || ""}
                    onChange={(e) => setEditingShared({ ...editingShared, title: e.target.value } as SharedTask)}
                      placeholder="Enter task title..."
                    className="w-full"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </Label>
                    <Textarea
                    id="edit-shared-task-description"
                    value={editingShared?.description || ""}
                    onChange={(e) => setEditingShared({ ...editingShared, description: e.target.value } as SharedTask)}
                    placeholder="Enter task description..."
                    rows={3}
                    className="w-full"
                    />
                  </div>

                {/* Assigned To */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Assign To <span className="text-red-500">*</span>
                    </Label>
                  <Select
                    value={editingShared?.assigned_to || ""}
                    onValueChange={(value) => setEditingShared({ ...editingShared, assigned_to: value } as SharedTask)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select user to assign task to" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>

                {/* Due Date */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Due Date
                    </Label>
                    <DatePicker
                      value={editingShared?.due_date || ''}
                      onChange={(value) => setEditingShared({ ...editingShared, due_date: value } as SharedTask)}
                      placeholder="Select due date"
                    />
                  </div>

                {/* Priority */}
                    <div>
                      <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Priority
                      </Label>
                  <Select
                    value={editingShared?.priority || "medium"}
                    onValueChange={(value) => setEditingShared({ ...editingShared, priority: value } as SharedTask)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                </div>

                {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button 
                    onClick={onSaveShared} 
                  disabled={submitting || !editingShared?.title?.trim() || !editingShared?.assigned_to}
                  className={`flex-1 h-11 sm:h-12 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                    "bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white"
                  }`}
                >
                  {submitting ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      <span className="text-sm">Saving…</span>
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      <span className="text-sm">{editingShared?.id ? 'Update Task' : 'Create Task'}</span>
                    </>
                  )}
                  </Button>
                </div>
              </div>
          </DialogContent>
        </Dialog>

        {/* Professional Shared Task Detail Modal */}
        <Dialog open={sharedDetailOpen} onOpenChange={setSharedDetailOpen}>
          <DialogContent 
            className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0 sm:max-w-2xl sm:w-full sm:max-h-[85vh] rounded-xl hide-scrollbar fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 !ml-0"
            style={{ marginLeft: '0 !important' }}
            aria-describedby="shared-task-detail-description"
          >
            <DialogHeader className="relative">
              <DialogTitle className="flex items-center gap-3 pr-12">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-600">
                  <ListChecks className="h-5 w-5 text-white" />
            </div>
                <span className="text-lg sm:text-xl font-semibold line-clamp-2">
                  {selectedShared?.title}
                </span>
              </DialogTitle>
              <p id="shared-task-detail-description" className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                View detailed information about this shared task including assignee, status, and progress.
              </p>
              <Button
                onClick={() => setSharedDetailOpen(false)}
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            {selectedShared && (
              <div className="space-y-6">
                {/* Status and Priority Badges */}
                <div className="flex flex-wrap items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`capitalize text-xs ${
                          selectedShared.status === 'approved' ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400' :
                          selectedShared.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400' :
                          selectedShared.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400' :
                          'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {selectedShared.status.replace('_', ' ')}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`capitalize text-xs ${
                          selectedShared.priority === 'high' ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400' :
                          selectedShared.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400'
                        }`}
                      >
                        {selectedShared.priority || 'medium'} priority
                      </Badge>
              </div>

                {/* Description Section */}
                {selectedShared.description && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <div className="p-1.5 bg-blue-600 rounded-lg">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      Description
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {selectedShared.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Task Information Grid */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-600 rounded-lg">
                      <ListChecks className="h-4 w-4 text-white" />
                    </div>
                    Task Information
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">Created:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(selectedShared.created_at || '').toLocaleDateString()}
                        </span>
                    </div>

                      <div className="flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedShared.due_date ? new Date(selectedShared.due_date).toLocaleDateString() : 'No due date'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                        <span className="text-gray-600 dark:text-gray-400">Assigned to:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {getUserDisplayName(selectedShared.assigned_to)}
                        </span>
                        </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                          <ListChecks className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                        <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {selectedShared.priority || 'medium'}
                        </span>
                        </div>
                      </div>
                          </div>
                </div>

                {/* Professional Actions */}
                <div className="pt-6 border-t border-gray-200/60 dark:border-gray-700/60">
                  {(() => {
                    const buttons = [
                      // Close button (always present)
                      {
                        component: (
                          <Button 
                            variant="outline" 
                            onClick={() => setSharedDetailOpen(false)} 
                            className="w-full h-12 px-6 font-semibold shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                          >
                            Close
                          </Button>
                        )
                      },
                      // Edit button (only for creator)
                      ...(selectedShared.created_by === currentUser?.id ? [{
                        component: (
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setSharedDetailOpen(false);
                              openEditShared(selectedShared);
                            }} 
                            className="w-full h-12 px-6 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20 font-semibold shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Edit Task
                          </Button>
                        )
                      }] : []),
                      // Complete button (only for assignee when not completed/approved)
                      ...(selectedShared.status !== 'completed' && selectedShared.status !== 'approved' && selectedShared.assigned_to === currentUser?.id ? [{
                        component: (
                          <Button 
                            onClick={async () => { 
                              await markSharedCompleted(selectedShared); 
                              setSharedDetailOpen(false); 
                            }} 
                            className="w-full h-12 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark as Completed
                          </Button>
                        )
                      }] : []),
                      // Approve button (only for creator when completed)
                      ...(selectedShared.status === 'completed' && selectedShared.created_by === currentUser?.id ? [{
                        component: (
                          <Button 
                            onClick={async () => { 
                              await approveSharedTask(selectedShared); 
                              setSharedDetailOpen(false); 
                            }} 
                            className="w-full h-12 px-6 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve Task
                          </Button>
                        )
                      }] : []),
                      // Delete button (only for creator)
                      ...(selectedShared.created_by === currentUser?.id ? [{
                        component: selectedShared.id && undoDeleteSharedTask.isCountingDown && sharedTaskToDelete?.id === selectedShared.id ? (
                          <div className="flex items-center justify-center gap-2 px-6 py-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md h-12 w-full">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-red-700 dark:text-red-300">
                              Deleting in {undoDeleteSharedTask.timeLeft}s
                            </span>
                          </div>
                        ) : (
                          <Button 
                            variant="outline"
                            onClick={async () => { 
                              await onDeleteShared(selectedShared.id); 
                              setSharedDetailOpen(false); 
                            }} 
                            className="w-full h-12 px-6 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 font-semibold shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        )
                      }] : [])
                    ];

                    const buttonCount = buttons.length;
                    
                    // Professional responsive grid layout based on button count
                    const getGridClasses = () => {
                      if (buttonCount === 1) return "grid grid-cols-1 gap-4";
                      if (buttonCount === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-4";
                      if (buttonCount === 3) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";
                      if (buttonCount === 4) return "grid grid-cols-1 sm:grid-cols-2 gap-4";
                      return "grid grid-cols-1 sm:grid-cols-2 gap-4";
                    };

                    return (
                      <div className={getGridClasses()}>
                        {buttons.map((button, index) => (
                          <div key={index} className="flex">
                            {button.component}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </section>
    </main>
  );
}
