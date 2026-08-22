import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
  ListPageHeader,
  ListPageShell,
  ListPageTabTrigger,
  ListPageTabsShell,
  LIST_TABS_CONTENT,
} from '@/components/layout/list-page';
import {
  ApplicantFiltersBar,
  type ApplicantFilters,
} from '@/components/recruitment/ApplicantFiltersBar';
import { ApplicantFormModal } from '@/components/recruitment/ApplicantFormModal';
import {
  ApplicantPipelineBoard,
  type RecruitmentBoardTab,
} from '@/components/recruitment/ApplicantPipelineBoard';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { getEffectiveRole, hasPermissionOrAdmin } from '@/lib/utils';
import type {
  RecruitmentApplicant,
  RecruitmentStatus,
} from '@/services/recruitmentService';
import {
  PIPELINE_COLUMNS,
  deleteApplicant,
  listApplicants,
  updateApplicantStatus,
} from '@/services/recruitmentService';
import {
  Ban,
  Briefcase,
  CheckCircle2,
  Loader2,
  Plus,
  UserRoundSearch,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const DEFAULT_FILTERS: ApplicantFilters = {
  q: '',
  status: 'all',
  department: 'all',
  role: 'all',
  has_resume: 'any',
  sort: 'newest',
};

const APPLICANT_PARAM = 'applicant';
const TAB_PARAM = 'tab';

function parseTab(raw: string | null): RecruitmentBoardTab {
  if (raw === 'offered' || raw === 'rejected') return raw;
  return 'pipeline';
}

export default function BugRecruitment() {
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const canView = hasPermissionOrAdmin(role, hasPermission, 'RECRUITMENT_VIEW');
  const canManage = hasPermissionOrAdmin(role, hasPermission, 'RECRUITMENT_MANAGE');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const applicantParam = searchParams.get(APPLICANT_PARAM);
  const activeTab = parseTab(searchParams.get(TAB_PARAM));

  const [formOpen, setFormOpen] = useState(Boolean(applicantParam) && canManage);
  const [activeApplicantKey, setActiveApplicantKey] = useState<string | null>(
    applicantParam
  );
  const editId =
    activeApplicantKey && activeApplicantKey !== 'new' ? activeApplicantKey : null;

  const [filters, setFilters] = useState<ApplicantFilters>(DEFAULT_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState('');
  const [applicants, setApplicants] = useState<RecruitmentApplicant[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<RecruitmentApplicant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [unsavedBackOpen, setUnsavedBackOpen] = useState(false);
  const formDirtyRef = useRef(false);
  const lastApplicantParamRef = useRef<string | null>(applicantParam);

  const setApplicantUrl = useCallback(
    (value: string | null, { replace = false }: { replace?: boolean } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(APPLICANT_PARAM, value);
          else next.delete(APPLICANT_PARAM);
          return next;
        },
        { replace }
      );
    },
    [setSearchParams]
  );

  const setTab = useCallback(
    (tab: RecruitmentBoardTab) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === 'pipeline') next.delete(TAB_PARAM);
          else next.set(TAB_PARAM, tab);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    if (!canManage) {
      if (applicantParam) setApplicantUrl(null, { replace: true });
      setFormOpen(false);
      setActiveApplicantKey(null);
      formDirtyRef.current = false;
      lastApplicantParamRef.current = null;
      setUnsavedBackOpen(false);
      return;
    }

    if (applicantParam) {
      lastApplicantParamRef.current = applicantParam;
      setActiveApplicantKey(applicantParam);
      setFormOpen(true);
      return;
    }

    if (formDirtyRef.current && lastApplicantParamRef.current) {
      const restore = lastApplicantParamRef.current;
      setApplicantUrl(restore, { replace: true });
      setUnsavedBackOpen(true);
      return;
    }

    setFormOpen(false);
    setActiveApplicantKey(null);
    lastApplicantParamRef.current = null;
    setUnsavedBackOpen(false);
  }, [applicantParam, canManage, setApplicantUrl]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(filters.q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [filters.q]);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const data = await listApplicants({
        q: debouncedQ || undefined,
        status: 'all',
        department: filters.department,
        role: filters.role,
        has_resume: filters.has_resume,
        sort: filters.sort,
        page: 1,
        limit: 100,
      });
      setApplicants(data.items);
      setDepartments(data.facets.departments);
      setRoles(data.facets.roles);
    } catch (e) {
      toast({
        title: 'Failed to load applicants',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [
    canView,
    debouncedQ,
    filters.department,
    filters.role,
    filters.has_resume,
    filters.sort,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    if (!canManage) return;
    setApplicantUrl('new');
  };

  const openEdit = (applicant: RecruitmentApplicant) => {
    if (!canManage) return;
    setApplicantUrl(applicant.id);
  };

  const closeForm = useCallback(() => {
    formDirtyRef.current = false;
    lastApplicantParamRef.current = null;
    setUnsavedBackOpen(false);
    setApplicantUrl(null, { replace: true });
  }, [setApplicantUrl]);

  const discardFromBack = useCallback(() => {
    formDirtyRef.current = false;
    lastApplicantParamRef.current = null;
    setUnsavedBackOpen(false);
    setFormOpen(false);
    setActiveApplicantKey(null);
    setApplicantUrl(null, { replace: true });
  }, [setApplicantUrl]);

  const handleStatusChange = async (id: string, status: RecruitmentStatus) => {
    if (!canManage) return;
    const prev = applicants;
    setApplicants((rows) =>
      rows.map((r) => (r.id === id ? { ...r, status } : r))
    );
    try {
      const updated = await updateApplicantStatus(id, status);
      setApplicants((rows) =>
        rows.map((r) => (r.id === id ? { ...r, ...updated } : r))
      );
    } catch (e) {
      setApplicants(prev);
      toast({
        title: 'Status not saved',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const id = deleteTarget.id;
    const prev = applicants;
    setApplicants((rows) => rows.filter((r) => r.id !== id));
    setDeleteTarget(null);
    try {
      await deleteApplicant(id);
      toast({ title: 'Applicant removed' });
    } catch (e) {
      setApplicants(prev);
      toast({
        title: 'Delete failed',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const pipelineCount = useMemo(
    () =>
      applicants.filter((a) => PIPELINE_COLUMNS.includes(a.status)).length,
    [applicants]
  );
  const offeredCount = useMemo(
    () => applicants.filter((a) => a.status === 'offered').length,
    [applicants]
  );
  const rejectedCount = useMemo(
    () => applicants.filter((a) => a.status === 'rejected').length,
    [applicants]
  );
  const headerCount =
    activeTab === 'pipeline'
      ? pipelineCount
      : activeTab === 'offered'
        ? offeredCount
        : rejectedCount;

  if (!canView) {
    return (
      <ListPageShell>
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Admin access required.</p>
          <Button
            className="mt-4 w-full rounded-xl sm:w-auto"
            variant="outline"
            onClick={() => navigate(`/${role}/projects`)}
          >
            Back
          </Button>
        </div>
      </ListPageShell>
    );
  }

  return (
    <ListPageShell>
      <ListPageHeader
        icon={<UserRoundSearch className="h-5 w-5 sm:h-6 sm:w-6" />}
        title="BugRecruitment"
        description="CV vault and hiring pipeline — filter by department, role, and stage."
        accentBarClassName="from-emerald-600 to-teal-600"
        underlayClassName="from-emerald-50/50 via-transparent to-teal-50/50 dark:from-emerald-950/20 dark:via-transparent dark:to-teal-950/20"
        count={headerCount}
        countIcon={<Briefcase className="h-5 w-5" />}
        countClassName="from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
        loading={loading}
        actions={
          canManage ? (
            <Button
              type="button"
              size="lg"
              className="h-11 w-full px-6 font-semibold text-white shadow-lg sm:h-12 sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800"
              onClick={openCreate}
            >
              <Plus className="mr-2 h-5 w-5" />
              New Applicant
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(val) => setTab(parseTab(val))}
        className="w-full"
      >
        <ListPageTabsShell
          columns={3}
          underlayClassName="from-gray-50/50 to-emerald-50/50 dark:from-gray-800/50 dark:to-emerald-900/50"
        >
          <ListPageTabTrigger value="pipeline" className="min-w-0 flex-1 basis-0">
            <Briefcase className="mr-1 h-4 w-4 shrink-0 sm:mr-1.5 sm:h-5 sm:w-5" />
            <span className="truncate">Pipeline</span>
            <span className="ml-1 shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 sm:ml-1.5 sm:px-2 sm:text-xs">
              {pipelineCount}
            </span>
          </ListPageTabTrigger>
          <ListPageTabTrigger value="offered" className="min-w-0 flex-1 basis-0">
            <CheckCircle2 className="mr-1 h-4 w-4 shrink-0 sm:mr-1.5 sm:h-5 sm:w-5" />
            <span className="truncate">Offered</span>
            <span className="ml-1 shrink-0 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 sm:ml-1.5 sm:px-2 sm:text-xs">
              {offeredCount}
            </span>
          </ListPageTabTrigger>
          <ListPageTabTrigger value="rejected" className="min-w-0 flex-1 basis-0">
            <Ban className="mr-1 h-4 w-4 shrink-0 sm:mr-1.5 sm:h-5 sm:w-5" />
            <span className="truncate">Rejected</span>
            <span className="ml-1 shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 sm:ml-1.5 sm:px-2 sm:text-xs">
              {rejectedCount}
            </span>
          </ListPageTabTrigger>
        </ListPageTabsShell>

        <TabsContent value={activeTab} className={LIST_TABS_CONTENT}>
          <ApplicantFiltersBar
            filters={filters}
            onChange={setFilters}
            departments={departments}
            roles={roles}
          />

          <ApplicantPipelineBoard
            applicants={applicants}
            loading={loading}
            canManage={canManage}
            tab={activeTab}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onStatusChange={handleStatusChange}
            onCreate={openCreate}
          />
        </TabsContent>
      </Tabs>

      <ApplicantFormModal
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        onDirtyChange={(dirty) => {
          formDirtyRef.current = dirty;
        }}
        applicantId={editId}
        departmentSuggestions={departments}
        roleSuggestions={roles}
        onSaved={() => {
          formDirtyRef.current = false;
          load();
        }}
      />

      <AlertDialog
        open={unsavedBackOpen}
        onOpenChange={(open) => {
          if (!open) setUnsavedBackOpen(false);
        }}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader className="space-y-2 text-left">
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Discard them and close this dialog?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="mt-0 rounded-xl">
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={discardFromBack}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this applicant?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${deleteTarget.full_name} will be removed from the recruitment pipeline.`
                : 'This applicant will be removed from the recruitment pipeline.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListPageShell>
  );
}
