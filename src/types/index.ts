export * from "./request";
export * from "./message";

/** 登录信息 */
export interface LoginInfo {
  userId: number;
  st: string;
  security: string;
}

/** 直播信息 */
export interface LiveInfo {
  liveId: string;
  availableTickets: string[];
  enterRoomAttach: string;
}
