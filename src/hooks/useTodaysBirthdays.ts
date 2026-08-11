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
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
