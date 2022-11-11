import ProtoBufJs from "protobufjs";
import tools from "./tools";
import _ from "lodash";
import commandHandler from "./handler/commandHandler";
import WebSocket from "websocket";
import proto from "./proto";
import { EventEmitter } from "events";
import { resolve } from "path";
import { LiveInfo, LoginInfo, GiftList } from "./types"

const ROOT = ProtoBufJs.Root.fromJSON(require("./protos.bundle.json"));

export default class AcClient extends EventEmitter{
  did: string
  giftList: GiftList

  userId: LoginInfo["userId"]
  visitorSt: LoginInfo["visitorSt"]
  acSecurity: LoginInfo["acSecurity"]

  liveId: LiveInfo["liveId"]
  availableTickets: LiveInfo["availableTickets"]
  enterRoomAttach: LiveInfo["enterRoomAttach"]
  
  connection: WebSocket.connection | null = null
  seqId = 1
  instanceId = 0;
  sessionKey = "";
  headerSeqId = 1;
  heartbeatSeqId = 1;
  ticketIndex = 0;
  retryCount = 0;
  timer: any = null;

  caption: LiveInfo["caption"]
  liveStartTime: LiveInfo["liveStartTime"]

  constructor({did, loginInfo, liveInfo, giftList} : {
    did: string,
    loginInfo: LoginInfo,
    liveInfo: LiveInfo,
    giftList: GiftList
  }) {
    super()
    this.did = did
    this.giftList = giftList

    this.userId = loginInfo.userId;
    this.visitorSt = loginInfo.visitorSt
    this.acSecurity = loginInfo.acSecurity

    this.liveId = liveInfo.liveId;
    this.availableTickets = liveInfo.availableTickets;
    this.enterRoomAttach = liveInfo.enterRoomAttach;

    this.caption = liveInfo.caption
    this.liveStartTime = liveInfo.liveStartTime
  }

  sendBytes(buffer: any) {
    if (this.connection?.connected) {
      this.connection.sendBytes(buffer);
      this.seqId++;
    } else
      console.log("ws->reconnect");
  };
  //确定返回类型
  async decodeProcess(buffer: any) {
    const DownstreamPayload = ROOT.lookupType("DownstreamPayload");
    let header: any = proto.decodeHeader(buffer);
    if (header.encryptionMode == 1)
      this.processRegisterResponse(buffer);
    else {
      let decrypted = proto.decrypt(buffer, this.sessionKey);
      if (!decrypted) {
        return false;
      }
      let payload = DownstreamPayload.decode(decrypted);
      //console.log(payload)
      await commandHandler(payload, this);
    }
  };

  //处理RR
  processRegisterResponse(buffer: any) {
    const DownstreamPayload = ROOT.lookupType("DownstreamPayload");
    const RegisterResponse = ROOT.lookupType("RegisterResponse");
    let decrypted: any = proto.decrypt(buffer, this.acSecurity);
    let payload: any = DownstreamPayload.decode(decrypted);
    let rr: any = RegisterResponse.decode(payload.payloadData);
    this.instanceId = rr.instanceId;
    this.sessionKey = rr.sessKey.toString("base64");
    this.sendBytes(
      proto.genKeepAlivePack(
        this.seqId,
        this.instanceId,
        this.userId,
        this.sessionKey
      )
    );
    this.sendBytes(
      proto.genEnterRoomPack(
        this.seqId,
        this.instanceId,
        this.userId,
        this.sessionKey,
        this.enterRoomAttach,
        this.availableTickets[this.ticketIndex],
        this.liveId
      )
    );
  };
  wsClose() {
    this.connection?.close()
  }
  /** 连接ws服务 */
  wsStart() {
    if (this.connection?.connected) return

    const client = new WebSocket.client();

    client.on("connectFailed", function (error) {
      console.log("Connect Error: " + error.toString());
    });

    client.on("connect", (connection) => {
      this.emit("connect");
      this.connection = connection;
      let register = proto.genRegisterPack(
        this.seqId,
        this.instanceId,
        this.userId,
        this.acSecurity,
        this.visitorSt
      );
      this.sendBytes(register);
      this.connection.on("error", function (error: any) {
        console.log("Connection Error: " + error.toString());
      });
      this.connection.on("close", () => {
        console.warn("ws connection closed.");
        this.seqId = 1;
        this.emit("close");
      });
      this.connection.on("message", async (message: any) => {
        //console.log(message)
        try {
          if (await this.decodeProcess(message.binaryData) === false) {
            this.emit("decode-error");
          }
        } catch (error) {
          console.log(error);
          this.connection?.close();
        }
      });
    });

    client.connect("wss://klink-newproduct-ws3.kwaizt.com/");
  };
  /** 获取礼物名称 */
  getGiftInfo(giftId: number) {
    const giftDetail = _.find(this.giftList, { "giftId": giftId });
    return giftDetail;
  };
}