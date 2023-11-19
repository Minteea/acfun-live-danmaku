import ProtoBufJs from "protobufjs";
import crypto from "crypto";

import { config } from "./config";
import { protoJson } from "./protos.bundle";

export const ROOT = ProtoBufJs.Root.fromJSON(protoJson);

const EncryptionMode = ROOT.lookupEnum("EncryptionMode");

function genCmd(data: {
  cmdType: any;
  payload: any;
  ticket: string;
  liveId: string;
}) {
  const ZtLiveCsCmd = ROOT.lookupType("ZtLiveCsCmd");
  let ztLiveCsCmd = ZtLiveCsCmd.create(data);
  return ZtLiveCsCmd.encode(ztLiveCsCmd).finish();
}

function genPayload(data: {
  seqId: number;
  retryCount: number;
  command: string;
  payloadData?: any;
}) {
  const UpstreamPayload = ROOT.lookupType("UpstreamPayload");
  let upstreamPayload = UpstreamPayload.create({
    ...data,
    subBiz: config.kuaishou.subBiz,
  });
  let buffer = UpstreamPayload.encode(upstreamPayload).finish();
  return buffer;
}

function genHeader(data: {
  seqId: number;
  instanceId: number;
  uid: number;
  decodedPayloadLen: number;
  encryptionMode?: number;
  tokenInfo?: { tokenType: number; token: any };
}) {
  const PacketHeader = ROOT.lookupType("PacketHeader");
  let packetHeader = PacketHeader.create({
    encryptionMode: EncryptionMode.values.kEncryptionSessionKey,
    flags: null,
    encodingType: null,
    tokenInfo: null,
    features: [],
    appId: config.app_id,
    kpn: config.kuaishou.kpn,
    ...data,
  });
  let buffer = PacketHeader.encode(packetHeader).finish();
  return buffer;
}

function genEnterRoom(enterRoomAttach: any) {
  const ZtLiveCsEnterRoom = ROOT.lookupType("ZtLiveCsEnterRoom");
  let payload = {
    enterRoomAttach: enterRoomAttach,
    clientLiveSdkVersion: config.client_live_sdk_version,
  };
  let ztLiveCsEnterRoom = ZtLiveCsEnterRoom.create(payload);
  return ZtLiveCsEnterRoom.encode(ztLiveCsEnterRoom).finish();
}

function genKeepAlive() {
  const KeepAliveRequest = ROOT.lookupType("KeepAliveRequest");
  const PresenceStatus = ROOT.lookupEnum("PresenceStatus");
  const ActiveStatus = ROOT.lookupEnum("ActiveStatus");
  let payload = {
    presenceStatus: PresenceStatus.values.kPresenceOnline,
    appActiveStatus: ActiveStatus.values.kAppInForeground,
  };
  let keepAliveRequest = KeepAliveRequest.create(payload);
  return KeepAliveRequest.encode(keepAliveRequest).finish();
}

function genRegister(instanceId: number, uid: number) {
  const RegisterRequest = ROOT.lookupType("RegisterRequest");
  const PlatformType = ROOT.lookupEnum("DeviceInfo.PlatformType");
  const PresenceStatus = ROOT.lookupEnum("RegisterRequest.PresenceStatus");
  const ActiveStatus = ROOT.lookupEnum("RegisterRequest.ActiveStatus");
  let payload = {
    appInfo: {
      appName: config.app_name,
      sdkVersion: config.sdk_version,
    },
    deviceInfo: {
      platformType: PlatformType.values.H5,
      deviceModel: "h5",
      imeiMd5: null,
    },
    presenceStatus: PresenceStatus.values.kPresenceOnline,
    appActiveStatus: ActiveStatus.values.kAppInForeground,
    instanceId: instanceId,
    ztCommonInfo: {
      kpn: config.kuaishou.kpn,
      kpf: config.kuaishou.kpf,
      uid: uid,
    },
  };
  let register = RegisterRequest.create(payload);
  let buffer = RegisterRequest.encode(register).finish();
  // console.log("register object")
  // console.log(RegisterRequest.decode(buffer))
  return buffer;
}

function genHeartbeat(seqId: number) {
  const ZtLiveCsHeartbeat = ROOT.lookupType("ZtLiveCsHeartbeat");
  let payload = {
    clientTimestampMs: new Date().getTime(),
    sequence: seqId,
  };
  let ztLiveCsHeartbeat = ZtLiveCsHeartbeat.create(payload);
  return ZtLiveCsHeartbeat.encode(ztLiveCsHeartbeat).finish();
}

function encode(header: Uint8Array, body: Uint8Array, key: string) {
  // console.log(UpstreamPayload.decode(body))
  //console.log(body.length)
  const iv = crypto.randomBytes(16);
  let keyBuffer = Buffer.from(key, "base64");
  let cipher = crypto.createCipheriv("AES-128-CBC", keyBuffer, iv, {});
  cipher.setAutoPadding(true);
  let encrypted = Buffer.concat([cipher.update(body), cipher.final()]);
  let headerSize = header.length;
  let bodySize = encrypted.length;
  let s1 = Buffer.from([0xab, 0xcd, 0x00, 0x01]);
  let s2 = Buffer.alloc(4);
  let s3 = Buffer.alloc(4);
  s2.writeInt32BE(headerSize);
  s3.writeInt32BE(bodySize + 16);
  let r = Buffer.concat([s1, s2, s3, header, iv, encrypted]);
  return r;
}

export function decrypt(buffer: Buffer, key: string) {
  try {
    let headersize = buffer.readInt32BE(4);
    let keyBuffer = Buffer.from(key, "base64");
    let ivBuffer = buffer.slice(12 + headersize, 28 + headersize);
    if (ivBuffer.length != 16) {
      return false;
    }
    let bodyBuffer = buffer.slice(28 + headersize);
    let decipher = crypto.createDecipheriv("AES-128-CBC", keyBuffer, ivBuffer);
    return Buffer.concat([decipher.update(bodyBuffer), decipher.final()]);
  } catch (error) {
    console.log(error);
    return;
  }
}
export function decodeHeader(buffer: Buffer) {
  const PacketHeader = ROOT.lookupType("PacketHeader");
  let headersize = buffer.readInt32BE(4);
  let header = buffer.slice(12, 12 + headersize);
  return PacketHeader.decode(header);
}

export function genPushMessagePack(
  seqId: number,
  instanceId: number,
  uid: number,
  key: string
) {
  let payload = genPayload({
    seqId,
    retryCount: 1,
    command: "Push.ZtLiveInteractive.Message",
  });
  return encode(
    genHeader({ seqId, instanceId, uid, decodedPayloadLen: payload.length }),
    payload,
    key
  );
}

export function genHeartbeatPack(
  seqId: number,
  instanceId: number,
  uid: number,
  key: string,
  ticket: string,
  liveId: string
) {
  let heartbeatBody = genHeartbeat(seqId);
  let cmd = genCmd({
    cmdType: "ZtLiveCsHeartbeat",
    payload: heartbeatBody,
    ticket,
    liveId,
  });
  let payload = genPayload({
    seqId,
    retryCount: 1,
    command: "Global.ZtLiveInteractive.CsCmd",
    payloadData: cmd,
  });
  return encode(
    genHeader({ seqId, instanceId, uid, decodedPayloadLen: payload.length }),
    payload,
    key
  );
}

export function genEnterRoomPack(
  seqId: number,
  instanceId: number,
  uid: number,
  key: string,
  enterRoomAttach: string,
  ticket: string,
  liveId: string
) {
  let enterRoom = genEnterRoom(enterRoomAttach);
  let enterRoomCmd = genCmd({
    cmdType: "ZtLiveCsEnterRoom",
    payload: enterRoom,
    ticket,
    liveId,
  });
  let enterRoomBody = genPayload({
    seqId,
    retryCount: 1,
    command: "Global.ZtLiveInteractive.CsCmd",
    payloadData: enterRoomCmd,
  });
  return encode(
    genHeader({
      seqId,
      instanceId,
      uid,
      decodedPayloadLen: enterRoomBody.length,
    }),
    enterRoomBody,
    key
  );
}

export function genRegisterPack(
  seqId: number,
  instanceId: number,
  uid: number,
  key: string,
  token: string
) {
  let register = genRegister(instanceId, uid);
  let registerBody = genPayload({
    seqId,
    retryCount: 1,
    command: "Basic.Register",
    payloadData: register,
  });
  return encode(
    genHeader({
      seqId,
      instanceId,
      uid,
      decodedPayloadLen: registerBody.length,
      encryptionMode: EncryptionMode.values.kEncryptionServiceToken,
      tokenInfo: { tokenType: 1, token: Buffer.from(token!) },
    }),
    registerBody,
    key
  );
}

export function genKeepAlivePack(
  seqId: number,
  instanceId: number,
  uid: number,
  key: string
) {
  let keepAlive = genKeepAlive();
  let keepAliveBody = genPayload({
    seqId,
    retryCount: 1,
    command: "Basic.KeepAlive",
    payloadData: keepAlive,
  });
  return encode(
    genHeader({
      seqId,
      instanceId,
      uid,
      decodedPayloadLen: keepAliveBody.length,
    }),
    keepAliveBody,
    key
  );
}
