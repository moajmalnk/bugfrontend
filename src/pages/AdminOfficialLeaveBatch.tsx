import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Loader2,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  deleteOfficialLeave,
  leaveStatusPillClass,
  listOfficialLeave,
  updateOfficialLeave,
  type LeaveRequest,
} from '@/services/leaveService';
import { getEffectiveRole, hasPermissionOrAdmin } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDay, formatDayShort } from '@/pages/adminAttendanceShared';

function dateRangeLabel(start: string, end: string) {
  if (!start) return '—';
  if (start === end) return formatDay(start);
  return `${formatDayShort(start)} → ${formatDayShort(end)}`;
}

export default function AdminOfficialLeaveBatch() {
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const canManage = hasPermissionOrAdmin(role, hasPermission, 'LEAVE_MANAGE');
  const isAdmin = role === 'admin';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const title = (searchParams.get('title') || '').trim();
  const startDate = (searchParams.get('start') || '').trim();
  const endDate = (searchParams.get('end') || searchParams.get('start') || '').trim();

  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [editRow, setEditRow] = useState<LeaveRequest | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editHours, setEditHours] = useState('8');
  const [editSaving, setEditSaving] = useState(false);
  const [editDirty, setEditDirty] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  const [deleteRow, setDeleteRow] = useState<LeaveRequest | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!canManage || !title || !startDate || !endDate) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await listOfficialLeave({
        title,
        start_date: startDate,
        end_date: endDate,
        page: 1,
        limit: 200,
      });
      setItems(result.items);
    } catch (e) {
      setItems([]);
      toast({
        title: 'Failed to load users',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [canManage, title, startDate, endDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeItems = useMemo(
    () => items.filter((r) => r.status === 'approved' || r.status === 'pending'),
    [items]
  );

  const summaryHours = useMemo(() => {
    const sample = activeItems[0] || items[0];
    if (!sample) return 8;
    return sample.hours_per_day != null && !Number.isNaN(Number(sample.hours_per_day))
      ? Number(sample.hours_per_day)
      : 8;
  }, [activeItems, items]);

  const openEdit = (row: LeaveRequest) => {
    setEditRow(row);
    setEditStart(row.start_date);
    setEditEnd(row.end_date);
    setEditTitle(String(row.reason || title));
    const h =
      row.hours_per_day != null && !Number.isNaN(Number(row.hours_per_day))
        ? Number(row.hours_per_day)
        : 8;
    setEditHours(String(h));
    setEditDirty(false);
  };

  const closeEdit = (force = false) => {
    if (!force && editDirty) {
      setUnsavedOpen(true);
      return;
    }
    setEditRow(null);
    setEditStart('');
    setEditEnd('');
    setEditTitle('');
    setEditHours('8');
    setEditDirty(false);
    setUnsavedOpen(false);
  };

  const editHoursNum = (() => {
    const n = Number(editHours);
    return Number.isFinite(n) ? n : NaN;
  })();

  const editValid =
    !!editRow &&
    !!editStart &&
    !!editEnd &&
    editEnd >= editStart &&
    editTitle.trim().length > 0 &&
    Number.isFinite(editHoursNum) &&
    editHoursNum >= 0 &&
    editHoursNum <= 24;

  const handleSaveEdit = async () => {
    if (!editRow || !editValid || editSaving) return;
    setEditSaving(true);
    try {
      const updated = await updateOfficialLeave({
        id: editRow.id,
        start_date: editStart,
        end_date: editEnd,
        title: editTitle.trim(),
        hours_per_day: Math.round(editHoursNum * 100) / 100,
      });
      toast({ title: 'Official Leave updated' });
      setEditDirty(false);
      setEditRow(null);
      // If title/dates changed, navigate to the new batch URL.
      const nextTitle = String(updated.reason || editTitle.trim());
      const nextStart = updated.start_date;
      const nextEnd = updated.end_date;
      if (nextTitle !== title || nextStart !== startDate || nextEnd !== endDate) {
        const params = new URLSearchParams({
          title: nextTitle,
          start: nextStart,
          end: nextEnd,
        });
        navigate(`/${role}/official-leave/batch?${params.toString()}`, { replace: true });
      } else {
        await load();
      }
    } catch (e) {
      toast({
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteRow || deleting) return;
    setDeleting(true);
    try {
      await deleteOfficialLeave({ id: deleteRow.id });
      toast({
        title: 'Official Leave cancelled',
        description: `${deleteRow.username || 'User'} removed from this celebration.`,
      });
      setDeleteRow(null);
      await load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelAll = async () => {
    if (deleting || activeItems.length === 0) return;
    setDeleting(true);
    try {
      const result = await deleteOfficialLeave({
        ids: activeItems.map((r) => r.id),
        admin_note: `Official Leave cancelled for entire celebration: ${title}`,
      });
      toast({
        title: 'Celebration cancelled',
        description: `${result.cancelled} user grant${result.cancelled === 1 ? '' : 's'} cancelled.`,
      });
      setDeleteAllOpen(false);
      await load();
    } catch (e) {
      toast({
        title: 'Cancel all failed',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!currentUser) return null;
  if (!isAdmin && !canManage) {
    return <Navigate to={`/${role}/dashboard`} replace />;
  }
  if (!title || !startDate || !endDate) {
    return <Navigate to={`/${role}/official-leave`} replace />;
  }

  return (
    <div className="min-w-0 w-full space-y-6 sm:space-y-8 overflow-x-hidden">
      <div className="relative min-w-0 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-amber-50/50 via-transparent to-orange-50/50 dark:from-amber-950/20 dark:via-transparent dark:to-orange-950/20" />
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col gap-4">
            <Button asChild variant="ghost" className="rounded-xl w-fit -ms-2">
              <Link to={`/${role}/official-leave`}>
                <ArrowLeft className="h-4 w-4 me-2" />
                Back to Official Leave
              </Link>
            </Button>
            <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-4">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shrink-0">
                    <Building2 className="h-6 w-6 text-white" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight break-words">
                      {title}
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    {dateRangeLabel(startDate, endDate)}
                  </span>
                  <span>·</span>
                  <span>{summaryHours}h per day</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 shrink-0" />
                    {items.length} user{items.length === 1 ? '' : 's'}
                  </span>
                </p>
              </div>
              {activeItems.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl shrink-0 text-destructive border-destructive/40 hover:bg-destructive/10"
                  onClick={() => setDeleteAllOpen(true)}
                >
                  <Trash2 className="h-4 w-4 me-2" />
                  Cancel all active
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-900/70">
        <CardHeader>
          <CardTitle className="text-xl">Users on this celebration</CardTitle>
          <CardDescription>
            Edit or cancel individual Official Leave grants. Hours apply on Daily Update and work stats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-10 text-center text-sm text-muted-foreground">
              No users found for this celebration.
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200/60 dark:border-gray-700/60 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2.5 font-semibold">User</th>
                      <th className="px-3 py-2.5 font-semibold">Dates</th>
                      <th className="px-3 py-2.5 font-semibold">Hours</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/40 dark:divide-gray-700/40">
                    {items.map((row) => {
                      const active = row.status === 'approved' || row.status === 'pending';
                      const perDay =
                        row.hours_per_day != null && !Number.isNaN(Number(row.hours_per_day))
                          ? Number(row.hours_per_day)
                          : 8;
                      const hours = Number(row.days_count || 0) * perDay;
                      return (
                        <tr key={row.id} className="hover:bg-muted/30">
                          <td className="px-3 py-3 align-top min-w-0">
                            <div className="font-medium truncate">{row.username || row.user_id}</div>
                            <div className="text-xs text-muted-foreground uppercase">
                              {row.role || 'user'}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top text-muted-foreground whitespace-nowrap">
                            {dateRangeLabel(row.start_date, row.end_date)}
                          </td>
                          <td className="px-3 py-3 align-top tabular-nums whitespace-nowrap">
                            {hours.toFixed(1)}h
                            <span className="block text-xs text-muted-foreground">
                              {Number(row.days_count)}d × {perDay}h
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <span
                              className={`inline-flex rounded-xl border px-2 py-0.5 text-xs font-medium capitalize ${leaveStatusPillClass(
                                row.status
                              )}`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="rounded-xl h-8 px-2"
                                disabled={!active}
                                onClick={() => openEdit(row)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="rounded-xl h-8 px-2 text-destructive hover:text-destructive"
                                disabled={!active}
                                onClick={() => setDeleteRow(row)}
                                title="Cancel"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Cancel</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editRow}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <DialogContent className="max-w-[600px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Official Leave</DialogTitle>
            <DialogDescription>
              {editRow
                ? `${editRow.username || editRow.user_id} · update dates, title, or hours.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-12 gap-4 py-2">
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label className="text-sm font-semibold">Start date</Label>
              <DatePicker
                value={editStart}
                onChange={(v) => {
                  setEditStart(v);
                  setEditDirty(true);
                  if (editEnd && v && editEnd < v) setEditEnd(v);
                }}
                placeholder="Start date"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label className="text-sm font-semibold">End date</Label>
              <DatePicker
                value={editEnd}
                onChange={(v) => {
                  setEditEnd(v);
                  setEditDirty(true);
                }}
                placeholder="End date"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="col-span-12 space-y-2">
              <Label htmlFor="batch-edit-title" className="text-sm font-semibold">
                Title / reason
              </Label>
              <Input
                id="batch-edit-title"
                maxLength={255}
                value={editTitle}
                onChange={(e) => {
                  setEditTitle(e.target.value.slice(0, 255));
                  setEditDirty(true);
                }}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label htmlFor="batch-edit-hours" className="text-sm font-semibold">
                How many hours?
              </Label>
              <Input
                id="batch-edit-hours"
                type="text"
                inputMode="decimal"
                maxLength={5}
                value={editHours}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d.]/g, '');
                  const parts = raw.split('.');
                  const cleaned =
                    parts.length > 1
                      ? `${parts[0].slice(0, 2)}.${parts.slice(1).join('').slice(0, 2)}`
                      : parts[0].slice(0, 2);
                  setEditHours(cleaned);
                  setEditDirty(true);
                }}
                onBlur={() => {
                  const n = Number(editHours);
                  if (!Number.isFinite(n) || editHours.trim() === '') {
                    setEditHours('8');
                    return;
                  }
                  setEditHours(String(Math.min(24, Math.max(0, Math.round(n * 100) / 100))));
                }}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={editSaving}
              onClick={() => closeEdit()}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              disabled={!editValid || editSaving || !editDirty}
              onClick={() => void handleSaveEdit()}
            >
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={unsavedOpen} onOpenChange={setUnsavedOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>Discard edits to this grant?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep editing</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={() => closeEdit(true)}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteRow}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteRow(null);
        }}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this user’s leave?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow
                ? `${deleteRow.username || 'User'} will no longer get credited hours for ${title}.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>
              Keep
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel leave'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteAllOpen}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteAllOpen(false);
        }}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel entire celebration?</AlertDialogTitle>
            <AlertDialogDescription>
              This cancels Official Leave for all {activeItems.length} active user
              {activeItems.length === 1 ? '' : 's'} on {title}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>
              Keep
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleCancelAll();
              }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel all'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
