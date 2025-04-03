import ProtoBufJs from "protobufjs";
import {
  genEnterRoomPack,
  genHeartbeatPack,
  genKeepAlivePack,
  genPushMessagePack,
} from "./proto";
import { AcClient, DataEvent } from "./client";
import { ROOT } from "./proto";
import { MessageData } from "./types/message";
import { inflate } from "pako";

export async function commandHandler(client: AcClient, payload: any) {
  switch (payload.command) {
    case "Basic.Register":
      const RegisterResponse = ROOT.lookupType("RegisterResponse");
      let rr: any = RegisterResponse.decode(payload.payloadData);
      client.instanceId = rr.instanceId;
      client.sessionKey = btoa(
        String.fromCharCode(...(rr.sessKey as Uint8Array))
      );

      client.send(
        await genKeepAlivePack(
          client.seqId,
          client.instanceId,
          client.userId,
          client.sessionKey
        )
      );
      client.send(
        await genEnterRoomPack(
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
        await genPushMessagePack(
          client.seqId,
          client.instanceId,
          client.userId,
          client.sessionKey
        )
      );
      const ztPayload: any = ZtLiveScMessage.decode(payload.payloadData);
      let msg = ztPayload.payload;
      if (ztPayload.compressionType == CompressionType.values.GZIP)
        msg = inflate(ztPayload.payload);
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
          let statusChanged = ZtLiveScStatusChanged.decode(
            ztPayload.payload
          ) as unknown as MessageData.ZtLiveScStatusChanged;
          const eventInit = {
            command: payload.command,
            messageType: ztPayload.messageType,
            data: statusChanged,
          };
          client.dispatchEvent(new DataEvent("StatusChanged", eventInit));
          switch (statusChanged.type) {
            case liveStateType.values.LIVE_CLOSED: // 直播结束
              client.dispatchEvent(new DataEvent("LiveClosed", eventInit));
              break;
            case liveStateType.values.LIVE_BANNED: // 直播间被封禁
              client.dispatchEvent(new DataEvent("LiveBanned", eventInit));
              break;
            case liveStateType.values.NEW_LIVE_OPENED: // 开启新直播
              client.dispatchEvent(new DataEvent("NewLiveOpened", eventInit));
              break;
            case liveStateType.values.LIVE_URL_CHANGED: // 直播url更改
              client.dispatchEvent(new DataEvent("LiveUrlChanged", eventInit));
              break;
          }
          break;
        case "ZtLiveScTicketInvalid":
          client.dispatchEvent(
            new DataEvent("TicketInvalid", {
              command: payload.command,
              messageType: ztPayload.messageType,
              data: undefined,
            })
          );
          client.ticketIndex =
            (client.ticketIndex + 1) / client.availableTickets.length;
          client.send(
            await genEnterRoomPack(
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
          client.dispatchEvent(
            new DataEvent("EnterRoomAck", {
              command: payload.command,
              cmdAckType: ztLiveCsCmdAck.cmdAckType,
              data: enterRoomAck,
            })
          );
          let ms = enterRoomAck.heartbeatIntervalMs.toNumber() || 1000;
          client.timer = setInterval(async () => {
            client.send(
              await genHeartbeatPack(
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
  const command = "Push.ZtLiveInteractive.Message";
  const messageType = "ZtLiveScStateSignal";
  const ZtLiveScStateSignal = ROOT.lookupType(messageType);
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
        let data = ProtobufType.decode(payload);
        client.dispatchEvent(
          new DataEvent("StateSignal", {
            command,
            messageType,
            signalType,
            data,
          })
        );
      } catch (error) {
        client.dispatchEvent(
          new DataEvent("StateSignal", {
            command,
            messageType,
            signalType,
            data: undefined,
          })
        );
      }
    }
  );
}

export function ActionHandler(
  client: AcClient,
  buffer: ProtoBufJs.Reader | Uint8Array
) {
  const command = "Push.ZtLiveInteractive.Message";
  const messageType = "ZtLiveScActionSignal";
  const ZtLiveScActionSignal = ROOT.lookupType(messageType);
  let items = (ZtLiveScActionSignal.decode(buffer) as any).item;
  items.forEach(
    ({ signalType, payload }: { signalType: string; payload: any[] }) => {
      try {
        let ProtobufType = ROOT.lookupType(signalType);
        payload.forEach((e: ProtoBufJs.Reader | Uint8Array) => {
          let data = ProtobufType.decode(e);
          client.dispatchEvent(
            new DataEvent("ActionSignal", {
              command,
              messageType,
              signalType,
              data,
            })
          );
        });
      } catch (error) {
        client.dispatchEvent(
          new DataEvent("ActionSignal", {
            command,
            messageType,
            signalType,
            data: undefined,
          })
        );
      }
    }
  );
}

export function NotifyHandler(
  client: AcClient,
  buffer: ProtoBufJs.Reader | Uint8Array
) {
  const command = "Push.ZtLiveInteractive.Message";
  const messageType = "ZtLiveScNotifySignal";
  const ZtLiveScNotifySignal = ROOT.lookupType(messageType);
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
        let data = ProtobufType.decode(payload);
        client.dispatchEvent(
          new DataEvent("NotifySignal", {
            command,
            messageType,
            signalType,
            data,
          })
        );
      } catch (error) {
        client.dispatchEvent(
          new DataEvent("NotifySignal", {
            command,
            messageType,
            signalType,
            data: undefined,
          })
        );
      }
    }
  );
}
