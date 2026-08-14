import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AttendanceDayCalendar,
  AttendancePeriodTable,
} from '@/components/attendance/AttendanceDayCalendar';
import { buildAttendancePeriodRows } from '@/pages/adminAttendanceShared';
import { getEffectiveRole } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  listAttendanceExceptions,
  type AttendanceDayException,
  type AttendanceModeDay,
  type LateDayRow,
} from '@/services/attendanceExceptionService';
import { listUserWfhRequests, type WfhRequest } from '@/services/wfhRequestService';
import { listLeaveRequests, type LeaveRequest } from '@/services/leaveService';

type Props = {
  userId: string;
};

/**
 * Why: Admins reviewing a user profile need the same office/WFH calendar
 * as the attendance exception detail page, placed after leave details.
 */
export function UserOfficeWfhCalendar({ userId }: Props) {
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});
  const isAdmin = role === 'admin';

  const [loading, setLoading] = useState(true);
  const [exceptions, setExceptions] = useState<AttendanceDayException[]>([]);
  const [lates, setLates] = useState<LateDayRow[]>([]);
  const [attendanceDays, setAttendanceDays] = useState<AttendanceModeDay[]>([]);
  const [wfhRequests, setWfhRequests] = useState<WfhRequest[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [tab, setTab] = useState<'day' | 'weekly' | 'monthly'>('day');

  const load = useCallback(async () => {
    if (!userId || !isAdmin) return;
    setLoading(true);
    try {
      const [payload, wfhHistory, leaveRows] = await Promise.all([
        listAttendanceExceptions(userId),
        listUserWfhRequests(userId).catch(() => null),
        listLeaveRequests({ user_id: userId }).catch(() => [] as LeaveRequest[]),
      ]);
      setExceptions(payload.exceptions ?? []);
      setLates(payload.late_days ?? []);
      setAttendanceDays(payload.attendance_days ?? []);
      setWfhRequests(Array.isArray(wfhHistory?.requests) ? wfhHistory.requests : []);
      setLeaveRequests(Array.isArray(leaveRows) ? leaveRows : []);
    } catch {
      setExceptions([]);
      setLates([]);
      setAttendanceDays([]);
      setWfhRequests([]);
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const dailyRows = useMemo(
    () => buildAttendancePeriodRows(attendanceDays, 'day', wfhRequests, exceptions, leaveRequests),
    [attendanceDays, wfhRequests, exceptions, leaveRequests]
  );
  const weeklyRows = useMemo(
    () => buildAttendancePeriodRows(attendanceDays, 'week', wfhRequests, exceptions, leaveRequests),
    [attendanceDays, wfhRequests, exceptions, leaveRequests]
  );
  const monthlyRows = useMemo(
    () => buildAttendancePeriodRows(attendanceDays, 'month', wfhRequests, exceptions, leaveRequests),
    [attendanceDays, wfhRequests, exceptions, leaveRequests]
  );

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-sky-500 rounded-xl shrink-0">
            <MapPin className="h-3.5 w-3.5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Office &amp; WFH days</h3>
        </div>
        <Link
          to={`/${role}/attendance-exceptions/${userId}`}
          className="text-xs sm:text-sm text-sky-700 dark:text-sky-300 hover:underline"
        >
          Open full attendance
        </Link>
      </div>
      <p className="text-[11px] sm:text-xs text-muted-foreground">
        Last ~120 days · office, leave, exceptions, WFH
      </p>
      <Tabs
        value={tab}
        onValueChange={(v) =>
          setTab(v === 'weekly' ? 'weekly' : v === 'monthly' ? 'monthly' : 'day')
        }
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 rounded-xl h-10 bg-sky-50/80 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 p-1">
          <TabsTrigger
            value="day"
            className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-sky-700 dark:data-[state=active]:text-sky-300 data-[state=active]:shadow-sm"
          >
            Day
          </TabsTrigger>
          <TabsTrigger
            value="weekly"
            className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-sky-700 dark:data-[state=active]:text-sky-300 data-[state=active]:shadow-sm"
          >
            Weekly
          </TabsTrigger>
          <TabsTrigger
            value="monthly"
            className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-sky-700 dark:data-[state=active]:text-sky-300 data-[state=active]:shadow-sm"
          >
            Monthly
          </TabsTrigger>
        </TabsList>
        <TabsContent value="day" className="mt-3">
          <AttendanceDayCalendar
            rows={dailyRows}
            emptySearch=""
            attendanceDays={attendanceDays}
            exceptions={exceptions}
            wfhRequests={wfhRequests}
            lates={lates}
            leaveRequests={leaveRequests}
          />
        </TabsContent>
        <TabsContent value="weekly" className="mt-3">
          <AttendancePeriodTable
            rows={weeklyRows}
            periodLabel="Week"
            emptySearch=""
            emptyDefault="No office or WFH days recorded for this user yet."
          />
        </TabsContent>
        <TabsContent value="monthly" className="mt-3">
          <AttendancePeriodTable
            rows={monthlyRows}
            periodLabel="Month"
            emptySearch=""
            emptyDefault="No office or WFH days recorded for this user yet."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
