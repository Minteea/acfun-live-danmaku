/** 登录信息 */
export type LoginInfo = {
  userId: string,
  visitorSt: string,
  acSecurity: string,
}
/** 直播信息 */
export type LiveInfo = {
  liveId: string,
  availableTickets: string[],
  enterRoomAttach: string,
  /** 直播开始时间 */
  liveStartTime: number,
  /** 直播标题 */
  caption: number
}

export type GiftList = any