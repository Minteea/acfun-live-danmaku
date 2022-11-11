import ProtoBufJs from "protobufjs";
import StateHandler from "./stateHandler";
import ActionHandler from "./actionHandler";
import { unzip } from "zlib";
import { promisify } from "util";
import proto from "../proto";
import AcClient from "../client";
const ROOT = ProtoBufJs.Root.fromJSON(require("../protos.bundle.json"));
const do_unzip = promisify(unzip);
  /**
   *
   * @param {Object} payload
   * @param  client
   */

export default async function CommandHandler(payload: any, client: AcClient) {
    switch (payload.command) {
      case "Push.ZtLiveInteractive.Message":
        const ZtLiveScMessage = ROOT.lookupType("ZtLiveScMessage");
        const CompressionType = ROOT.lookupEnum(
          "ZtLiveScMessage.CompressionType"
        );
        client.sendBytes(
          proto.genPushMessagePack(
            client.seqId,
            client.instanceId,
            client.userId,
            client.sessionKey
          )
        );
        let ztPayload: any = ZtLiveScMessage.decode(payload.payloadData);
        let msg = ztPayload.payload;
        if (ztPayload.compressionType == CompressionType.values.GZIP)
          msg = await do_unzip(ztPayload.payload);
        switch (ztPayload.messageType) {
          case "ZtLiveScActionSignal":  // 直播Action类型信息
            ActionHandler(msg, client);
            break;
          case "ZtLiveScStateSignal":   // 直播State类型信息
            //todo
            StateHandler(msg, client);
            break;
          case "ZtLiveScNotifySignal":
            //todo
            break;
          case "ZtLiveScStatusChanged": // 直播状态发生变化
            const ZtLiveScStatusChanged = ROOT.lookupType(
              "ZtLiveScStatusChanged"
            );
            const liveStateType = ROOT.lookupEnum("ZtLiveScStatusChanged.Type");
            let ztLiveScStatusChanged: any = ZtLiveScStatusChanged.decode(
              ztPayload.payload
            );
            switch (ztLiveScStatusChanged.type) {
              case liveStateType.values.LIVE_CLOSED:  // 直播结束
                client.emit("live_closed", ztLiveScStatusChanged)
                break;
              case liveStateType.values.LIVE_BANNED:  // 直播间被封禁
                client.emit("live_banned", ztLiveScStatusChanged)
                break;
              case liveStateType.values.NEW_LIVE_OPENED:    // 开启新直播
                client.emit("new_live_opened", ztLiveScStatusChanged)
                break;
              case liveStateType.values.LIVE_URL_CHANGED:   // 直播url更改
                client.emit("live_url_changed", ztLiveScStatusChanged)
                break;
            }
            break;
          case "ZtLiveScTicketInvalid":
            console.log("changeKey");
            client.ticketIndex =
              (client.ticketIndex + 1) / client.availableTickets.length;
            client.sendBytes(
              proto.genEnterRoomPack(
                client.seqId,
                client.instanceId,
                client.userId,
                client.sessionKey,
                client.enterRoomAttach,
                client.availableTickets[client.ticketIndex],
                client.liveId
              )
            );
          default:
            console.log("unkown message type:" + ztPayload.messageType);
            break;
        }
        break;
      case "Basic.KeepAlive":
        const KeepAliveResponse = ROOT.lookupType("KeepAliveResponse");
        let keepAliveResponse = KeepAliveResponse.decode(payload.payloadData);
        //todo 处理返回
        break;
      case "Basic.Ping":
        //todo
        break;
      case "Basic.Unregister":
        //todo
        break;
      case "Global.ZtLiveInteractive.CsCmd":
        const ZtLiveCsCmdAck = ROOT.lookupType("ZtLiveCsCmdAck");
        let ztLiveCsCmdAck: any = ZtLiveCsCmdAck.decode(payload.payloadData);
        switch (ztLiveCsCmdAck.cmdAckType) {
          case "ZtLiveCsEnterRoomAck":
            const ZtLiveCsEnterRoomAck = ROOT.lookupType(
              "ZtLiveCsEnterRoomAck"
            );
            let enterRoomAck: any = ZtLiveCsEnterRoomAck.decode(
              ztLiveCsCmdAck.payload
            );
            //发送进入事件
            client.emit("EnterRoomAck", enterRoomAck);
            let ms = enterRoomAck.heartbeatIntervalMs.toNumber()?enterRoomAck.heartbeatIntervalMs.toNumber():1000;
            client.timer = setInterval(() => {
              client.sendBytes(
                proto.genHeartbeatPack(
                  client.seqId,
                  client.instanceId,
                  client.userId,
                  client.sessionKey,
                  client.availableTickets[client.ticketIndex],
                  client.liveId
                )
              );
            }, ms);
            break;
          case "ZtLiveCsHeartbeatAck":
            //todo
            break;
          case "ZtLiveCsUserExitAck":
            //todo
            break;
          default:
            console.log("这消息可能有点毛病");
            break;
        }
        break;
      case "Push.SyncSession":
        //todo
        break;
      case "Push.DataUpdate":
        //todo
        break;
      default:
        console.log("啊这，这消息是：" + payload.command);
        break;
    }
  };
