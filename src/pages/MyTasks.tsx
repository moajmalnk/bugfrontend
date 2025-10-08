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
import { Plus, Search, Filter, Clock, ListChecks, User, FileText, Calendar, Users, CheckCircle2 } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { useAuth } from '@/context/AuthContext';
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
          Authorization: `Bearer ${localStorage.getItem("token")}`,
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

  async function onDelete(id?: number) {
    if (!id) return;
    
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
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Delete Task</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p class="text-sm text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete this task? This action cannot be undone and all task data will be permanently removed.
            </p>
            <div class="flex items-center justify-end gap-3">
              <button class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors" onclick="this.closest('.fixed').remove(); window.taskDeleteResolve?.(false)">
                Cancel
              </button>
              <button class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors" onclick="this.closest('.fixed').remove(); window.taskDeleteResolve?.(true)">
                Delete Task
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      (window as any).taskDeleteResolve = resolve;
    });
    
    if (!confirmed) return;
    
    try {
      await deleteTask(id);
      toast({ title: 'Task deleted successfully' });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete task');
    }
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

  async function onDeleteShared(id?: number) {
    if (!id) return;
    
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
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Delete Shared Task</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p class="text-sm text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete this shared task?
            </p>
            <div class="flex items-center justify-end gap-3">
              <button class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors" onclick="this.closest('.fixed').remove(); window.sharedTaskDeleteResolve?.(false)">
                Cancel
              </button>
              <button class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors" onclick="this.closest('.fixed').remove(); window.sharedTaskDeleteResolve?.(true)">
                Delete Task
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      (window as any).sharedTaskDeleteResolve = resolve;
    });
    
    if (!confirmed) return;
    
    try {
      await sharedTaskService.deleteSharedTask(id);
      toast({ title: 'Shared task deleted successfully' });
      await loadSharedTasks();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete shared task');
      toast({ title: 'Error', description: e?.message, variant: 'destructive' });
    }
  }

  async function markSharedCompleted(t: SharedTask) {
    if (!t?.id) return;
    
    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to mark this task as completed?');
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
    
    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to mark this task as incomplete?');
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
    
    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to decline this task? This will remove you from the task.');
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
    
    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to approve this task?');
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
                        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                        if (token) {
                          const payload = JSON.parse(atob(token.split('.')[1]));
                          if (payload.purpose === 'dashboard_access' && payload.admin_id) {
                            // For dashboard tokens, show admin info for personal tasks
                            return (
                              <>
                                <span>Personal Tasks for: <strong>{currentUser.username}</strong> (ID: {currentUser.id})</span>
                                <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">Admin Personal Tasks</span>
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
                  value="my-tasks"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <ListChecks className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">My Tasks</span>
                  <span className="sm:hidden">My</span>
                  <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
                    {items.length}
                  </span>
                </TabsTrigger>
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
                    <select
                    className="h-11 w-full sm:w-[140px] rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                      value={(activeTab === 'my-tasks' ? myFilter.status : sharedFilter.status) || ''}
                      onChange={(e) => {
                        if (activeTab === 'my-tasks') setMyFilter({ ...myFilter, status: e.target.value || undefined });
                        else setSharedFilter({ ...sharedFilter, status: e.target.value || undefined });
                      }}
                    >
                      <option value="">All statuses</option>
                      {statuses.map((s) => (
                        <option key={s} value={s}>{s.replace('_',' ')}</option>
                      ))}
                    </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-lg" />
              ))
            : itemsFiltered(items, myFilter.q).length === 0
            ? (
              <div className="col-span-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    <Clock className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Tasks</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    Create your first task to get started.
                  </p>
                  <Button onClick={openCreate} className="h-11 px-6 bg-gradient-to-r from-blue-600 to-emerald-600 text-white">New Task</Button>
                </div>
              </div>
            )
            : itemsFiltered(items, myFilter.q).map((t) => (
              <div key={t.id ?? Math.random()} className="group relative overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex flex-col p-5 shadow-sm hover:shadow-lg transition-all duration-200">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <button
                      onClick={() => openDetails(t)}
                    className="text-left flex-1 min-w-0"
                    >
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors line-clamp-2">
                      {t.title}
                    </h3>
                    </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge 
                      variant="outline" 
                      className={`capitalize text-xs ${
                        t.status === 'done' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400' :
                        t.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400' :
                        t.status === 'blocked' ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400' :
                        'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {t.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                  {t.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                    {t.description}
                  </p>
                )}

                {/* Task Details */}
                <div className="space-y-2 mb-4">
                  {t.priority && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Priority:</span>
                      <span className={`font-medium capitalize ${
                        t.priority === 'high' ? 'text-red-600 dark:text-red-400' :
                        t.priority === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                  )}
                  {t.due_date && (
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">Due:</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{t.due_date}</span>
                    </div>
                  )}
                  {(typeof t.expected_hours === 'number' || typeof t.spent_hours === 'number') && (
                    <div className="flex items-center gap-4 text-xs">
                      {typeof t.expected_hours === 'number' && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 dark:text-gray-400">Expected:</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{t.expected_hours}h</span>
                        </div>
                      )}
                      {typeof t.spent_hours === 'number' && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 dark:text-gray-400">Spent:</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{t.spent_hours}h</span>
                        </div>
                      )}
                  </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-auto flex flex-col sm:grid sm:grid-cols-4 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openDetails(t)} 
                    className="h-10 px-3 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    <span className="hidden sm:inline">View</span>
                    <span className="sm:hidden flex items-center gap-1">
                      <span>👁</span>
                      <span>View</span>
                    </span>
                  </Button>
                  {t.status !== 'done' && (
                    <Button 
                      size="sm" 
                      onClick={() => markCompleted(t)} 
                      className="h-10 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                      <span className="hidden sm:inline">Complete</span>
                      <span className="sm:hidden flex items-center gap-1">
                        <span>✓</span>
                        <span>Complete</span>
                      </span>
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openEdit(t)} 
                    className="h-10 px-3 text-xs"
                  >
                    <span className="hidden sm:inline">Edit</span>
                    <span className="sm:hidden flex items-center gap-1">
                      <span>✏</span>
                      <span>Edit</span>
                    </span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onDelete(t.id)} 
                    className="h-10 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <span className="hidden sm:inline">Delete</span>
                    <span className="sm:hidden flex items-center gap-1">
                      <span>🗑</span>
                      <span>Delete</span>
                    </span>
                  </Button>
                </div>
              </div>
            ))}
        </div>

        {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2 sm:p-4 overflow-y-auto no-scrollbar">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 mt-0">
            {/* Header */}
            <div className="relative overflow-hidden rounded-t-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-emerald-50/50 dark:from-blue-950/20 dark:to-emerald-950/20"></div>
              <div className="relative flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
                    {editing?.id ? 'Edit Task' : 'Create New Task'}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                    {editing?.id ? 'Update your task details' : 'Add a new task to your list'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="h-8 w-8 sm:h-9 sm:w-auto shrink-0 ml-2">
                  <span className="sm:hidden">✕</span>
                  <span className="hidden sm:inline">✕</span>
                </Button>
              </div>
            </div>

            {/* Form */}
            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <div className="space-y-4 sm:space-y-5">
                {/* Title */}
                <div>
                  <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Task Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
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
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setModalOpen(false)} className="h-11 px-6 order-2 sm:order-1">
                  Cancel
                </Button>
                <Button 
                  disabled={submitting || !editing?.title?.trim()} 
                  onClick={onSave} 
                  className="h-11 px-6 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-medium disabled:opacity-50 order-1 sm:order-2"
                >
                  {submitting ? 'Saving…' : editing?.id ? 'Update Task' : 'Create Task'}
                </Button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Detail Modal */}
        {detailOpen && selected && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2 sm:p-4 overflow-y-auto no-scrollbar">
            <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 mt-0">
              {/* Header */}
              <div className="relative overflow-hidden rounded-t-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-emerald-50/50 dark:from-blue-950/20 dark:to-emerald-950/20"></div>
                <div className="relative flex items-start justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white line-clamp-2">
                      {selected.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
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
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)} className="h-8 w-8 sm:h-9 sm:w-auto shrink-0">
                    <span className="sm:hidden">✕</span>
                    <span className="hidden sm:inline">✕</span>
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-6">
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
                  
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {/* Status */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-gray-600 rounded-lg">
                          <Badge className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`capitalize text-sm px-3 py-1 ${
                          selected.status === 'done' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400' :
                          selected.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400' :
                          selected.status === 'blocked' ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400' :
                          'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {selected.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Priority */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-yellow-600 rounded-lg">
                          <Clock className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`capitalize text-sm px-3 py-1 ${
                          selected.priority === 'high' ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400' :
                          selected.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400'
                        }`}
                      >
                        {selected.priority || 'medium'}
                      </Badge>
                    </div>

                    {/* Due Date */}
                    {selected.due_date && (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-purple-600 rounded-lg">
                            <Calendar className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {new Date(selected.due_date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    )}

                    {/* Period */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-indigo-600 rounded-lg">
                          <Clock className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Period</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                        {selected.period || 'daily'}
                      </p>
                    </div>

                    {/* Expected Hours */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-blue-600 rounded-lg">
                          <Clock className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Expected Hours</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {(selected.expected_hours !== null && selected.expected_hours !== undefined && selected.expected_hours !== 0) 
                          ? `${selected.expected_hours} hours` 
                          : 'Not set'}
                      </p>
                    </div>

                    {/* Spent Hours */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-emerald-600 rounded-lg">
                          <Clock className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Spent Hours</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {(selected.spent_hours !== null && selected.spent_hours !== undefined && selected.spent_hours !== 0) 
                          ? `${selected.spent_hours} hours` 
                          : 'Not set'}
                      </p>
                    </div>

                    {/* Project ID */}
                    {selected.project_id && (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-orange-600 rounded-lg">
                            <FileText className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Project</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selected.project_id}
                        </p>
                      </div>
                    )}

                    {/* Task ID */}
                    {selected.id && (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-gray-600 rounded-lg">
                            <ListChecks className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Task ID</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          #{selected.id}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setDetailOpen(false);
                      openEdit(selected);
                    }} 
                    className="h-11 px-6 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20 order-2 sm:order-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Edit Task
                  </Button>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 order-1 sm:order-2">
                    <Button variant="outline" onClick={() => setDetailOpen(false)} className="h-11 px-6">
                      Close
                    </Button>
                    {selected.status !== 'done' && (
                      <Button 
                        onClick={async () => { 
                          await markCompleted(selected); 
                          setDetailOpen(false); 
                        }} 
                        className="h-11 px-6 bg-green-600 hover:bg-green-700 text-white"
                      >
                      Mark as Completed
                    </Button>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
                  <Search className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search Shared Tasks</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search shared tasks by title or description..."
                    value={sharedFilter.q || ''}
                    onChange={(e) => setSharedFilter((f) => ({ ...f, q: e.target.value }))}
                    className="w-full pl-4 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-600 rounded-lg shrink-0">
                    <Filter className="h-4 w-4 text-white" />
                  </div>
                  <select
                    className="h-11 w-full sm:w-[140px] rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                    value={sharedFilter.status || ''}
                    onChange={(e) => setSharedFilter({ ...sharedFilter, status: e.target.value || undefined })}
                  >
                    <option value="">All statuses</option>
                    {sharedStatuses.map((s) => (
                      <option key={s} value={s}>{s.replace('_',' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Shared Tasks Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sharedLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 rounded-lg" />
                ))
              : itemsFilteredShared(sharedTasks, sharedFilter.q).length === 0
              ? (
                <div className="col-span-full relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                  <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                      <Users className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Shared Tasks</h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                      Create your first shared task to collaborate with your team.
                    </p>
                    <Button onClick={openCreateShared} className="h-11 px-6 bg-gradient-to-r from-blue-600 to-emerald-600 text-white">New Shared Task</Button>
                  </div>
                </div>
              )
              : itemsFilteredShared(sharedTasks, sharedFilter.q).map((t) => (
                <div key={t.id ?? Math.random()} className="group relative overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex flex-col p-5 shadow-sm hover:shadow-lg transition-all duration-200">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <button
                      onClick={() => openDetailsShared(t)}
                      className="text-left flex-1 min-w-0"
                    >
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors line-clamp-2">
                        {t.title}
                      </h3>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge 
                        variant="outline" 
                        className={`capitalize text-xs ${
                          t.status === 'approved' ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400' :
                          t.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400' :
                          t.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400' :
                          'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  {t.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                      {t.description}
                    </p>
                  )}

                  {/* Task Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs">
                      <User className="h-3 w-3 text-blue-500" />
                      <span className="text-gray-500 dark:text-gray-400">Created by:</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {t.created_by_name || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <Users className="h-3 w-3 text-purple-500 mt-0.5" />
                      <span className="text-gray-500 dark:text-gray-400">Assigned to:</span>
                      <div className="flex flex-wrap gap-1">
                        {(t as any).assigned_to_names?.map((name: string, index: number) => {
                          const isCompleted = (t as any).completed_assignee_names?.includes(name);
                          return (
                            <span
                              key={index}
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                isCompleted
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                              }`}
                            >
                              {name} {isCompleted && '✓'}
                            </span>
                          );
                        }) || [(t as any).assigned_to_name || 'Unknown'].map((name: string) => (
                          <span key={name} className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                    {t.project_names && t.project_names.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <FileText className="h-3 w-3 text-orange-500" />
                        <span className="text-gray-500 dark:text-gray-400">Projects:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300 line-clamp-1">
                          {t.project_names.join(', ')}
                        </span>
                      </div>
                    )}
                    {t.due_date && (
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-500 dark:text-gray-400">Due:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{t.due_date}</span>
                      </div>
                    )}
                    {t.completed_at && (
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="text-gray-500 dark:text-gray-400">Completed:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {new Date(t.completed_at).toLocaleDateString()} {t.completed_by_name && `by ${t.completed_by_name}`}
                        </span>
                      </div>
                    )}
                    {t.approved_by_name && t.status === 'approved' && (
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-purple-500" />
                        <span className="text-gray-500 dark:text-gray-400">Approved by:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {t.approved_by_name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openDetailsShared(t)} 
                        className="h-10 px-3 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                      >
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openEditShared(t)} 
                        className="h-10 px-3 text-xs"
                      >
                        Edit
                      </Button>
                    </div>
                    {/* Individual completion buttons for assigned users */}
                    {t.status !== 'completed' && t.status !== 'approved' && ((t as any).assigned_to_ids ? (t as any).assigned_to_ids.includes(currentUser?.id || '') : t.assigned_to === currentUser?.id) && (
                      <div className="space-y-2">
                        {((t as any).completed_assignee_ids?.includes(currentUser?.id || '')) ? (
                          <Button 
                            size="sm" 
                            onClick={() => uncompleteSharedTask(t)} 
                            className="h-10 w-full text-xs bg-yellow-600 hover:bg-yellow-700 text-white"
                          >
                            Mark Incomplete
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => markSharedCompleted(t)} 
                            className="h-10 w-full text-xs bg-green-600 hover:bg-green-700 text-white"
                          >
                            Mark Complete
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          onClick={() => declineSharedTask(t)} 
                          className="h-10 w-full text-xs bg-red-600 hover:bg-red-700 text-white"
                        >
                          Decline Task
                        </Button>
                      </div>
                    )}
                    {t.status === 'completed' && currentUser?.role === 'admin' && (
                      <Button 
                        size="sm" 
                        onClick={() => approveSharedTask(t)} 
                        className="h-10 w-full text-xs bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Approve
                      </Button>
                    )}
                    {(t.created_by === currentUser?.id || currentUser?.role === 'admin') && (
                      <Button 
                        variant="outline"
                        size="sm" 
                        onClick={() => onDeleteShared(t.id)} 
                        className="h-10 w-full text-xs border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>
        </Tabs>

        {/* Shared Task Creation/Edit Modal */}
        {sharedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2 sm:p-4 overflow-y-auto no-scrollbar">
            <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 mt-0">
              {/* Header */}
              <div className="relative overflow-hidden rounded-t-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-emerald-50/50 dark:from-blue-950/20 dark:to-emerald-950/20"></div>
                <div className="relative flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
                      {editingShared?.id ? 'Edit Shared Task' : 'Create New Shared Task'}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                      {editingShared?.id ? 'Update shared task details' : 'Create a task to share with team members'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSharedModalOpen(false)} className="h-8 w-8 sm:h-9 sm:w-auto shrink-0 ml-2">
                    ✕
                  </Button>
                </div>
              </div>

              {/* Form */}
              <div className="px-4 sm:px-6 py-4 sm:py-5">
                <div className="space-y-4 sm:space-y-5">
                  {/* Title */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Task Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={editingShared?.title || ''}
                      onChange={(e) => setEditingShared((prev) => ({ ...(prev as SharedTask), title: e.target.value }))}
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
                      className="min-h-[80px] sm:min-h-[100px] resize-none"
                      value={editingShared?.description || ''}
                      onChange={(e) => setEditingShared((prev) => ({ ...(prev as SharedTask), description: e.target.value }))}
                      placeholder="Describe the task..."
                    />
                  </div>

                  {/* Assigned To (multiple) */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Assign To <span className="text-red-500">*</span>
                    </Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      {users.filter(user => user.id !== currentUser?.id).map((user) => (
                        <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={(editingShared?.assigned_to_ids || (editingShared?.assigned_to ? [editingShared.assigned_to] : [])).includes(user.id)}
                            onChange={(e) => {
                              const current = editingShared?.assigned_to_ids || (editingShared?.assigned_to ? [editingShared.assigned_to] : []);
                              const next = e.target.checked
                                ? Array.from(new Set([...current, user.id]))
                                : current.filter((id) => id !== user.id);
                              const primary = next[0] || '';
                              setEditingShared((prev) => ({ ...(prev as SharedTask), assigned_to_ids: next, assigned_to: primary }));
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{user.username} ({user.role})</span>
                        </label>
                      ))}
                    </div>
                    {!(editingShared?.assigned_to_ids && editingShared.assigned_to_ids.length > 0) && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">Select at least one assignee</p>
                    )}
                  </div>

                  {/* Projects Selection */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Projects (Optional)
                    </Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      {projects.filter(project => project.created_by === currentUser?.id).map((project) => (
                        <label key={project.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={editingShared?.project_ids?.includes(project.id) || false}
                            onChange={(e) => {
                              const currentProjects = editingShared?.project_ids || [];
                              const newProjects = e.target.checked
                                ? [...currentProjects, project.id]
                                : currentProjects.filter(id => id !== project.id);
                              setEditingShared((prev) => ({ ...(prev as SharedTask), project_ids: newProjects }));
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{project.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Status and Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status
                      </Label>
                      <select
                        className="h-11 w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        value={editingShared?.status || 'pending'}
                        onChange={(e) => setEditingShared((prev) => ({ ...(prev as SharedTask), status: e.target.value as SharedTask['status'] }))}
                      >
                        {sharedStatuses.map((s) => (
                          <option key={s} value={s}>{s.replace('_',' ')}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Priority
                      </Label>
                      <select
                        className="h-11 w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        value={editingShared?.priority || 'medium'}
                        onChange={(e) => setEditingShared((prev) => ({ ...(prev as SharedTask), priority: e.target.value as SharedTask['priority'] }))}
                      >
                        {['low','medium','high'].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Due Date
                    </Label>
                    <DatePicker
                      value={editingShared?.due_date || ''}
                      onChange={(value) => setEditingShared((prev) => ({ ...(prev as SharedTask), due_date: value }))}
                      placeholder="Select due date"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                  <Button variant="outline" onClick={() => setSharedModalOpen(false)} className="h-11 px-6 order-2 sm:order-1">
                    Cancel
                  </Button>
                  <Button 
                    disabled={submitting || !editingShared?.title?.trim() || !editingShared?.assigned_to} 
                    onClick={onSaveShared} 
                    className="h-11 px-6 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-medium disabled:opacity-50 order-1 sm:order-2"
                  >
                    {submitting ? 'Saving…' : editingShared?.id ? 'Update Task' : 'Create Task'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shared Task Detail Modal */}
        {sharedDetailOpen && selectedShared && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2 sm:p-4 overflow-y-auto no-scrollbar">
            <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 mt-0">
              {/* Header */}
              <div className="relative overflow-hidden rounded-t-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-emerald-50/50 dark:from-blue-950/20 dark:to-emerald-950/20"></div>
                <div className="relative flex items-start justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white line-clamp-2">
                      {selectedShared.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
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
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSharedDetailOpen(false)} className="h-8 w-8 sm:h-9 sm:w-auto shrink-0">
                    ✕
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-6">
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
                  
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {/* Created By */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-blue-600 rounded-lg">
                          <User className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Created By</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedShared.created_by_name || 'Unknown'}
                      </p>
                    </div>

                    {/* Assigned To */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-purple-600 rounded-lg">
                          <Users className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned To</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {((selectedShared as any).assigned_to_names?.length
                          ? (selectedShared as any).assigned_to_names
                          : [(selectedShared as any).assigned_to_name || 'Unknown']).join(', ')}
                      </p>
                    </div>

                    {/* Projects */}
                    {selectedShared.project_names && selectedShared.project_names.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-orange-600 rounded-lg">
                            <FileText className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Projects</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedShared.project_names.map((name, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Due Date */}
                    {selectedShared.due_date && (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-purple-600 rounded-lg">
                            <Calendar className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {new Date(selectedShared.due_date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    )}

                    {/* Completed At */}
                    {selectedShared.completed_at && (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-green-600 rounded-lg">
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Completed At</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {new Date(selectedShared.completed_at).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}

                    {/* Completed By */}
                    {selectedShared.completed_by_name && (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-green-600 rounded-lg">
                            <User className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Completed By</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedShared.completed_by_name}
                        </p>
                      </div>
                    )}

                    {/* Approved By */}
                    {selectedShared.approved_by_name && (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-purple-600 rounded-lg">
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Approved By</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedShared.approved_by_name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSharedDetailOpen(false);
                      openEditShared(selectedShared);
                    }} 
                    className="h-11 px-6 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20 order-2 sm:order-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Edit Task
                  </Button>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 order-1 sm:order-2">
                    <Button variant="outline" onClick={() => setSharedDetailOpen(false)} className="h-11 px-6">
                      Close
                    </Button>
                    {selectedShared.status !== 'completed' && selectedShared.status !== 'approved' && selectedShared.assigned_to === currentUser?.id && (
                      <Button 
                        onClick={async () => { 
                          await markSharedCompleted(selectedShared); 
                          setSharedDetailOpen(false); 
                        }} 
                        className="h-11 px-6 bg-green-600 hover:bg-green-700 text-white"
                      >
                        Mark as Completed
                      </Button>
                    )}
                    {selectedShared.status === 'completed' && currentUser?.role === 'admin' && (
                      <Button 
                        onClick={async () => { 
                          await approveSharedTask(selectedShared); 
                          setSharedDetailOpen(false); 
                        }} 
                        className="h-11 px-6 bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Approve Task
                      </Button>
                    )}
                    {(selectedShared.created_by === currentUser?.id || currentUser?.role === 'admin') && (
                      <Button 
                        variant="outline"
                        onClick={async () => { 
                          await onDeleteShared(selectedShared.id); 
                          setSharedDetailOpen(false); 
                        }} 
                        className="h-11 px-6 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function itemsFiltered(items: UserTask[], q?: string) {
  if (!q) return items;
  const qq = q.toLowerCase();
  return items.filter((t) =>
    (t.title || '').toLowerCase().includes(qq) || (t.description || '').toLowerCase().includes(qq)
  );
}

function itemsFilteredShared(items: SharedTask[], q?: string) {
  if (!q) return items;
  const qq = q.toLowerCase();
  return items.filter((t) =>
    (t.title || '').toLowerCase().includes(qq) || (t.description || '').toLowerCase().includes(qq)
  );
}
