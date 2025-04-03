import { commandHandler } from "./handler";
import * as proto from "./proto";
import { LiveInfo, LoginInfo } from "./types";
import { url } from "./config";
import { ROOT } from "./proto";
import { MessageData } from "./types/message";
import { ErrorEvent, CloseEvent } from "./utils/ponyfill";
import Long from "long";

interface ClientTokens extends LoginInfo, LiveInfo {}

const shortSignalNameMap: Record<string, string> = {};

function shortenSignalName(signalType: string) {
  let name = shortSignalNameMap[signalType];
  if (!name) {
    name = signalType.split("Signal")[1] || signalType;
    shortSignalNameMap[signalType] = name;
  }
  return name;
}

export class AcClient extends EventTarget {
  ws: WebSocket;

  userId: number;
  st: string;
  security: string;

  liveId: string;
  availableTickets: string[];
  enterRoomAttach: string;

  seqId = 1;
  instanceId = Long.fromNumber(0);
  sessionKey = "";
  headerSeqId = 1;
  heartbeatSeqId = 1;
  ticketIndex = 0;
  retryCount = 0;
  timer: any = null;

  handleCommand = commandHandler;

  constructor({
    userId,
    st,
    security,
    liveId,
    availableTickets,
    enterRoomAttach,
  }: ClientTokens) {
    super();
    this.ws = new WebSocket(url.WSS_HOST);

    this.userId = userId;
    this.st = st;
    this.security = security;

    this.liveId = liveId;
    this.availableTickets = availableTickets;
    this.enterRoomAttach = enterRoomAttach;

    // 连接到服务器时，发送Register包
    this.ws.addEventListener("open", async (e) => {
      this.dispatchEvent(new Event(e.type, e));
      let register = await proto.genRegisterPack(
        this.seqId,
        this.instanceId,
        this.userId,
        this.security,
        this.st
      );
      this.send(register);
    });
    this.ws.addEventListener("error", (e) => {
      console.error(e);
      this.dispatchEvent(new ErrorEvent(e.type, e));
    });
    this.ws.addEventListener("close", (e) => {
      this.dispatchEvent(new CloseEvent(e.type, e));
    });
    // 获得信息后，发送给数据包解码
    this.ws.addEventListener("message", async (e) => {
      this.dispatchEvent(
        new MessageEvent(e.type, e as unknown as MessageEventInit<any>)
      );
      const buffer = new Uint8Array(await (e.data as Blob).arrayBuffer());
      await this.decodeProcess(buffer).catch((error) => {
        this.dispatchEvent(new ErrorEvent("error:decode", { error }));
      });
    });

    this.addEventListener("StateSignal", (e) =>
      this.dispatchEvent(new DataEvent(shortenSignalName(e.signalType!), e))
    );
    this.addEventListener("ActionSignal", (e) =>
      this.dispatchEvent(new DataEvent(shortenSignalName(e.signalType!), e))
    );
    this.addEventListener("NotifySignal", (e) =>
      this.dispatchEvent(new DataEvent(shortenSignalName(e.signalType!), e))
    );
  }

  send(data: Uint8Array) {
    this.ws.send(data);
    this.seqId++;
  }

  close(code?: number, data?: string) {
    this.ws.close(code, data);
  }

  /** 数据解码 */
  async decodeProcess(buffer: Uint8Array) {
    const DownstreamPayload = ROOT.lookupType("DownstreamPayload");
    let header: any = proto.decodeHeader(buffer);
    const decrypted = await proto.decrypt(
      buffer,
      header.encryptionMode == 1 ? this.security : this.sessionKey
    );
    if (!decrypted) {
      throw new Error("Decryption failed");
    }
    let payload = DownstreamPayload.decode(decrypted);
    await commandHandler(this, payload);
  }

  wsClose() {
    this.ws.close();
  }
}

export interface AcClient {
  addEventListener<K extends keyof LiveEventMap>(
    type: K,
    listener: (ev: LiveEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener<T>(
    type: string,
    listener: (ev: DataEvent<T>) => any,
    options?: boolean | AddEventListenerOptions
  ): void;

  dispatchEvent<K extends keyof LiveEventMap>(event: LiveEventMap[K]): boolean;
  dispatchEvent<T>(event: DataEvent<T>): boolean;

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
}

interface LiveEventMap extends WebSocketEventMap {
  EnterRoomAck: DataEvent;

  ActionSignal: DataEvent<MessageData.ActionSignal>;
  Comment: DataEvent<MessageData.CommonActionSignalComment>;
  Like: DataEvent<MessageData.CommonActionSignalLike>;
  Gift: DataEvent<MessageData.CommonActionSignalGift>;
  UserFollowAuthor: DataEvent<MessageData.CommonActionSignalUserFollowAuthor>;
  UserEnterRoom: DataEvent<MessageData.CommonActionSignalUserEnterRoom>;
  JoinClub: DataEvent<MessageData.AcfunActionSignalJoinClub>;

  StateSignal: DataEvent<MessageData.StateSignal>;
  DisplayInfo: DataEvent<MessageData.CommonStateSignalDisplayInfo>;
  RecentComment: DataEvent;
  TopUsers: DataEvent;

  NotifySignal: DataEvent;

  StatusChanged: DataEvent<MessageData.ZtLiveScStatusChanged>;
  LiveClosed: DataEvent<MessageData.ZtLiveScStatusChanged>;
  LiveBanned: DataEvent<MessageData.ZtLiveScStatusChanged>;
  NewLiveOpened: DataEvent<MessageData.ZtLiveScStatusChanged>;
  LiveUrlChanged: DataEvent<MessageData.ZtLiveScStatusChanged>;

  "error:decode": ErrorEvent;
}

export class DataEvent<T = unknown> extends Event {
  data: T;
  signalType?: string;
  messageType?: string;
  cmdAckType?: string;
  command: string;
  constructor(
    type: string,
    { data, signalType, messageType, cmdAckType, command }: DataEventInitDict<T>
  ) {
    super(type);
    this.command = command;
    this.signalType = signalType;
    this.messageType = messageType;
    this.cmdAckType = cmdAckType;
    this.data = data;
  }
}

export interface DataEventInitDict<T> {
  command: string;
  messageType?: string;
  cmdAckType?: string;
  signalType?: string;
  data: T;
}
