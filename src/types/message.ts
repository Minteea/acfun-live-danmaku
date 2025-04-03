import type Long from "long";

export namespace MessageData {
  type ZtLiveScMessagePayloads =
    | ZtLiveActionSignalItem
    | ZtLiveStateSignalItem
    | ZtLiveNotifySignalItem
    | ZtLiveScStatusChanged;

  type ZtLiveActionSignalItemPayloads =
    | CommonActionSignalComment
    | CommonActionSignalGift
    | CommonActionSignalUserEnterRoom
    | CommonActionSignalUserFollowAuthor
    | CommonActionSignalLike
    | AcfunActionSignalJoinClub
    | CommonStateSignalDisplayInfo;

  type ZtLiveStateSignalItemPayloads = CommonStateSignalDisplayInfo;

  export type ActionSignal = ZtLiveActionSignalItemPayloads;
  export type StateSignal = ZtLiveStateSignalItemPayloads;

  export interface ZtLiveScMessage<T extends ZtLiveScMessagePayloads> {
    messageType: string;
    payload: T;
    liveId?: string;
    ticket?: string;
    serverTimestampMs?: Long;
  }

  export interface ZtLiveActionSignalItem<
    T extends ZtLiveActionSignalItemPayloads = ZtLiveActionSignalItemPayloads
  > {
    signalType: string;
    payload: T;
  }

  export interface ZtLiveStateSignalItem<
    T extends ZtLiveStateSignalItemPayloads = ZtLiveStateSignalItemPayloads
  > {
    signalType: string;
    payload: T;
  }

  export interface ZtLiveNotifySignalItem {}

  export interface ZtLiveScStatusChanged {
    type: StatusChangedType;
    maxRandomDelayMs?: Long;
    bannedInfo?: BannedInfo;
  }

  export interface ZtLiveUserInfo {
    userIdentity: {
      managerType?: ManagerType;
    };
    badge?: string;
    nickname: string;
    userId: Long;
    avatar: [
      {
        url: string;
      }
    ];
  }
  export interface AcFunUserInfo {
    userId?: Long;
    name?: string;
  }
  export interface CommonActionSignalComment {
    content: string;
    sendTimeMs: Long;
    userInfo: ZtLiveUserInfo;
  }
  export interface CommonActionSignalGift {
    userInfo: ZtLiveUserInfo;
    sendTimeMs: Long;
    giftId: string;
    batchSize: number;
    comboCount: number;
    rank: string;
    comboKey: string;
    slotDisplayDurationMs: Long;
    expireDurationMs: Long;
  }
  export interface CommonActionSignalUserEnterRoom {
    userInfo: ZtLiveUserInfo;
    sendTimeMs: Long;
  }
  export interface CommonActionSignalUserFollowAuthor {
    userInfo: ZtLiveUserInfo;
    sendTimeMs: Long;
  }
  export interface CommonActionSignalLike {
    userInfo: ZtLiveUserInfo;
    sendTimeMs: Long;
  }
  export interface AcfunActionSignalJoinClub {
    fansInfo: AcFunUserInfo;
    uperInfo: AcFunUserInfo;
    joinTimeMs: Long;
  }
  export interface CommonStateSignalDisplayInfo {
    watchingCount: string;
    likeCount: string;
    likeDelta: number;
  }

  export interface BannedInfo {
    banReason: string;
  }

  export enum ManagerType {
    UNKNOWN_MANAGER_TYPE = 0,
    NORMAL = 1,
  }

  export enum StatusChangedType {
    UNKNOWN = 0,
    LIVE_CLOSED = 1,
    NEW_LIVE_OPENED = 2,
    LIVE_URL_CHANGED = 3,
    LIVE_BANNED = 4,
  }

  export type All =
    | CommonActionSignalComment
    | CommonActionSignalGift
    | CommonActionSignalUserEnterRoom
    | CommonActionSignalUserFollowAuthor
    | CommonActionSignalLike
    | AcfunActionSignalJoinClub
    | CommonStateSignalDisplayInfo
    | ZtLiveScStatusChanged;
}
