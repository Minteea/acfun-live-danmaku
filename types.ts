/** 登录信息 */
export interface LoginInfo {
  userId: number;
  visitorSt: string;
  acSecurity: string;
}
/** 直播信息 */
export interface LiveInfo {
  liveId: string;
  availableTickets: string[];
  enterRoomAttach: string;
}
