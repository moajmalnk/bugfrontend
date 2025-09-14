import { apiClient as api } from "@/lib/axios";

export const createMeeting = (title: string) => {
  return api.post("/meetings/create.php", { title });
};

export const getMeeting = (code: string) => {
  return api.get(`/meetings/get.php`, { params: { code } });
};

export const joinMeeting = (code: string, displayName?: string) => {
  return api.post(`/meetings/join.php`, { code, displayName });
};

export const leaveMeeting = (code: string) => {
  return api.post(`/meetings/leave.php`, { code });
};

export const getMessages = (code: string, limit = 100) => {
  return api.get(`/meetings/messages.php`, { params: { code, limit } });
};

export const sendMessage = (code: string, message: string, senderId?: string, senderName?: string) => {
  return api.post(`/meetings/messages.php`, { code, message, senderId, senderName });
};


