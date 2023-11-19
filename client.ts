import ProtoBufJs from "protobufjs";
import { commandHandler } from "./handler";
import WebSocket from "isomorphic-ws";
import * as proto from "./proto";
import { EventEmitter } from "events";
import { resolve } from "path";
import { LiveInfo, LoginInfo } from "./types";
import { url } from "./config";
import { ROOT } from "./proto";

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

export const isNode = !!WebSocket.Server;

export class WebsocketClient extends EventEmitter {
  ws: WebSocket;
  constructor(address: string, options?: any) {
    super();
    const ws = new WebSocket(address, isNode ? options : null);
    this.ws = ws;
    ws.onopen = () => this.emit("open");
    ws.onmessage = ({ data }) => this.emit("message", data);
    ws.onerror = (error) => this.emit("error", error);
    ws.onclose = () => this.emit("close");
  }
}

export class AcClient extends WebsocketClient {
  userId: number;
  visitorSt: string;
  acSecurity: string;

  liveId: string;
  availableTickets: string[];
  enterRoomAttach: string;

  seqId = 1;
  instanceId = 0;
  sessionKey = "";
  headerSeqId = 1;
  heartbeatSeqId = 1;
  ticketIndex = 0;
  retryCount = 0;
  timer: any = null;

  handleCommand = commandHandler;

  constructor({
    userId,
    visitorSt,
    acSecurity,
    liveId,
    availableTickets,
    enterRoomAttach,
  }: ClientTokens) {
    super(url.WSS_HOST);

    this.userId = userId;
    this.visitorSt = visitorSt;
    this.acSecurity = acSecurity;

    this.liveId = liveId;
    this.availableTickets = availableTickets;
    this.enterRoomAttach = enterRoomAttach;

    // 连接到服务器时，发送Register包
    this.on("open", () => {
      let register = proto.genRegisterPack(
        this.seqId,
        this.instanceId,
        this.userId,
        this.acSecurity,
        this.visitorSt
      );
      this.send(register);
    });
    this.on("error", (error: any) => {
      console.log("Connection Error: " + error.toString());
    });
    this.on("close", () => {
      this.emit("close");
    });
    // 获得信息后，发送给数据包解码
    this.on("message", async (message: any) => {
      try {
        if ((await this.decodeProcess(message)) === false) {
          this.emit("decode-error");
        }
      } catch (error) {
        console.log(error);
      }
    });

    this.on("StateSignal", (signalType, msg) =>
      this.emit(shortenSignalName(signalType), msg)
    );
    this.on("ActionSignal", (signalType, msg) =>
      this.emit(shortenSignalName(signalType), msg)
    );
    this.on("NotifySignal", (signalType, msg) =>
      this.emit(shortenSignalName(signalType), msg)
    );
  }

  send(data: Buffer) {
    this.ws.send(data);
    this.seqId++;
  }

  close(code?: number, data?: string) {
    this.ws.close(code, data);
  }

  /** 数据解码 */
  async decodeProcess(buffer: Buffer) {
    const DownstreamPayload = ROOT.lookupType("DownstreamPayload");
    let header: any = proto.decodeHeader(buffer);
    const decrypted = proto.decrypt(
      buffer,
      header.encryptionMode == 1 ? this.acSecurity : this.sessionKey
    );
    if (!decrypted) {
      return false;
    }
    let payload = DownstreamPayload.decode(decrypted);
    //console.log(payload)
    await commandHandler(this, payload);
  }

  wsClose() {
    this.ws.close();
  }
}
