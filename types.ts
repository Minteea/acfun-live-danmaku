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

export interface StartPlayInfo {
  liveId: string;
  availableTickets: string[];
  enterRoomAttach: string;
  videoPlayRes: string;
  /** 直播间标题 */
  caption: string;
  ticketRetryCount: number;
  ticketRetryIntervalMs: number;
  notices: {
    userId: number;
    userName: string;
    userGender: string;
    notice: string;
  }[];
  config: {
    giftSlotSize: number;
  };
  /** 直播开始时间 */
  liveStartTime: number;
  panoramic: boolean;
}

export interface GiftInfo {
  giftId: number;
  giftName: string;
  arLiveName: string;
  /** 货币种类，1=AC币，2=香蕉 */
  payWalletType: number;
  giftPrice: number;
  webpPicList: {
    cdn: string;
    /** 图片url */
    url: string;
    urlPattern: string;
    freeTraffic: boolean;
  }[];
  pngPicList: {
    cdn: string;
    /** 图片url */
    url: string;
    urlPattern: string;
    freeTraffic: boolean;
  }[];
  smallPngPicList: {
    cdn: string;
    /** 图片url */
    url: string;
    urlPattern: string;
    freeTraffic: boolean;
  }[];
  allowBatchSendSizeList: number[];
  canCombo: boolean;
  canDraw: boolean;
  magicFaceId: boolean;
  vupArId: boolean;
  description: string;
  redpackPrice: number;
  cornerMarkerText: string;
}

export type GiftList = GiftInfo[];
