import { userService, type BirthdayPerson } from "@/services/userService";
import { useQuery } from "@tanstack/react-query";

/** IST calendar date Y-m-d for cache keys / collapse persistence. */
export function getIstTodayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export type TodaysBirthdaysData = {
  date: string;
  birthdays: BirthdayPerson[];
};

export function useTodaysBirthdays(enabled = true) {
  const istDate = getIstTodayYmd();

  return useQuery<TodaysBirthdaysData>({
    queryKey: ["todays-birthdays", istDate],
    queryFn: () => userService.getTodaysBirthdays(),
    enabled,
    // Why: new wishes should appear on the celebrant's card without a reload,
    // but only poll on days someone is actually celebrating.
    staleTime: 30 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: (query) =>
      (query.state.data?.birthdays.length ?? 0) > 0 ? 60 * 1000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
