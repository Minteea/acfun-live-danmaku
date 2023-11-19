import ProtoBufJs from "protobufjs";
import { unzip } from "zlib";
import { promisify } from "util";
import * as proto from "./proto";
import { AcClient } from "./client";
import { ROOT } from "./proto";

const do_unzip = promisify(unzip);

export async function commandHandler(client: AcClient, payload: any) {
  switch (payload.command) {
    case "Basic.Register":
      const RegisterResponse = ROOT.lookupType("RegisterResponse");
      let rr: any = RegisterResponse.decode(payload.payloadData);
      client.instanceId = rr.instanceId;
      client.sessionKey = rr.sessKey.toString("base64");
      client.send(
        proto.genKeepAlivePack(
          client.seqId,
          client.instanceId,
          client.userId,
          client.sessionKey
        )
      );
      client.send(
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
      break;
    case "Basic.Unregister":
      //todo
      break;
    case "Basic.KeepAlive":
      const KeepAliveResponse = ROOT.lookupType("KeepAliveResponse");
      let response = KeepAliveResponse.decode(payload.payloadData);
      //todo 处理返回
      break;
    case "Basic.Ping":
      //todo
      break;
    case "Push.ZtLiveInteractive.Message":
      const ZtLiveScMessage = ROOT.lookupType("ZtLiveScMessage");
      const CompressionType = ROOT.lookupEnum(
        "ZtLiveScMessage.CompressionType"
      );
      client.send(
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
        case "ZtLiveScActionSignal":
          ActionHandler(client, msg);
          break;
        case "ZtLiveScStateSignal":
          StateHandler(client, msg);
          break;
        case "ZtLiveScNotifySignal":
          NotifyHandler(client, msg);
          break;
        case "ZtLiveScStatusChanged": // 直播状态发生变化
          const ZtLiveScStatusChanged = ROOT.lookupType(
            "ZtLiveScStatusChanged"
          );
          const liveStateType = ROOT.lookupEnum("ZtLiveScStatusChanged.Type");
          let ztLiveScStatusChanged: any = ZtLiveScStatusChanged.decode(
            ztPayload.payload
          );
          client.emit("StatusChanged", ztLiveScStatusChanged);
          switch (ztLiveScStatusChanged.type) {
            case liveStateType.values.LIVE_CLOSED: // 直播结束
              client.emit("LiveClosed", ztLiveScStatusChanged);
              break;
            case liveStateType.values.LIVE_BANNED: // 直播间被封禁
              client.emit("LiveBanned", ztLiveScStatusChanged);
              break;
            case liveStateType.values.NEW_LIVE_OPENED: // 开启新直播
              client.emit("NewLiveOpened", ztLiveScStatusChanged);
              break;
            case liveStateType.values.LIVE_URL_CHANGED: // 直播url更改
              client.emit("LiveUrlChanged", ztLiveScStatusChanged);
              break;
          }
          break;
        case "ZtLiveScTicketInvalid":
          console.log("changeKey");
          client.ticketIndex =
            (client.ticketIndex + 1) / client.availableTickets.length;
          client.send(
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
    case "Global.ZtLiveInteractive.CsCmd":
      const ZtLiveCsCmdAck = ROOT.lookupType("ZtLiveCsCmdAck");
      let ztLiveCsCmdAck: any = ZtLiveCsCmdAck.decode(payload.payloadData);
      switch (ztLiveCsCmdAck.cmdAckType) {
        case "ZtLiveCsEnterRoomAck":
          const ZtLiveCsEnterRoomAck = ROOT.lookupType("ZtLiveCsEnterRoomAck");
          let enterRoomAck: any = ZtLiveCsEnterRoomAck.decode(
            ztLiveCsCmdAck.payload
          );
          //发送进入事件
          client.emit("EnterRoomAck", enterRoomAck);
          let ms = enterRoomAck.heartbeatIntervalMs.toNumber() || 1000;
          client.timer = setInterval(() => {
            client.send(
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
      }
      break;
    case "Push.SyncSession":
      //todo
      break;
    case "Push.DataUpdate":
      //todo
      break;
  }
}

export function StateHandler(
  client: AcClient,
  buffer: ProtoBufJs.Reader | Uint8Array
) {
  const ZtLiveScStateSignal = ROOT.lookupType("ZtLiveScStateSignal");
  let items = (ZtLiveScStateSignal.decode(buffer) as any).item;
  items.forEach(
    ({
      signalType,
      payload,
    }: {
      signalType: string;
      payload: ProtoBufJs.Reader | Uint8Array;
    }) => {
      try {
        let ProtobufType = ROOT.lookupType(signalType);
        let result = ProtobufType.decode(payload);
        client.emit("StateSignal", signalType, result);
      } catch (error) {
        client.emit("StateSignal", signalType);
      }
    }
  );
}

export function ActionHandler(
  client: AcClient,
  buffer: ProtoBufJs.Reader | Uint8Array
) {
  const ZtLiveScActionSignal = ROOT.lookupType("ZtLiveScActionSignal");
  let items = (ZtLiveScActionSignal.decode(buffer) as any).item;
  items.forEach(
    ({ signalType, payload }: { signalType: string; payload: any[] }) => {
      try {
        let ProtobufType = ROOT.lookupType(signalType);
        payload.forEach((e: ProtoBufJs.Reader | Uint8Array) => {
          let result = ProtobufType.decode(e);
          client.emit("ActionSignal", signalType, result);
        });
      } catch (error) {
        client.emit("ActionSignal", signalType);
      }
    }
  );
}

export function NotifyHandler(
  client: AcClient,
  buffer: ProtoBufJs.Reader | Uint8Array
) {
  const ZtLiveScNotifySignal = ROOT.lookupType("ZtLiveScNotifySignal");
  let items = (ZtLiveScNotifySignal.decode(buffer) as any).item;
  items.forEach(
    ({
      signalType,
      payload,
    }: {
      signalType: string;
      payload: ProtoBufJs.Reader | Uint8Array;
    }) => {
      try {
        let ProtobufType = ROOT.lookupType(signalType);
        let result = ProtobufType.decode(payload);
        client.emit("NotifySignal", signalType, result);
      } catch (error) {
        client.emit("NotifySignal", signalType);
      }
    }
  );
}
