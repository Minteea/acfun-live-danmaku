import ProtoBufJs, { Long } from "protobufjs";

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
  instanceId: Long;
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

function genRegister(instanceId: bigint | Long, uid: number) {
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

function int32ToUint8ArrayBE(n: number): Uint8Array {
  const buffer = new Uint8Array(4);
  new DataView(buffer.buffer).setInt32(0, n, false); // Big-endian
  return buffer;
}

function concatUint8Arrays(arrs: Uint8Array[]) {
  // 计算总长度
  let totalLength = 0;
  for (const arr of arrs) {
    if (!(arr instanceof Uint8Array)) {
      throw new TypeError("All elements must be Uint8Array");
    }
    totalLength += arr.length;
  }

  // 创建新数组
  const result = new Uint8Array(totalLength);

  // 复制数据
  let offset = 0;
  for (const arr of arrs) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

function readInt32BE(buffer: Uint8Array, offset: number): number {
  return new DataView(buffer.buffer, offset).getInt32(0, false); // Big-endian
}

export async function encode(
  header: Uint8Array,
  body: Uint8Array,
  key: string
) {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  let keyBuffer = Uint8Array.from(atob(key), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-CBC" },
    false,
    ["encrypt"]
  );

  // 加密数据
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv,
    },
    cryptoKey,
    body
  );

  let headerSize = header.length;
  let bodySize = encrypted.byteLength;
  let s1 = new Uint8Array([0xab, 0xcd, 0x00, 0x01]);
  let s2 = int32ToUint8ArrayBE(headerSize);
  let s3 = int32ToUint8ArrayBE(bodySize + 16);
  let r = concatUint8Arrays([
    s1,
    s2,
    s3,
    header,
    iv,
    new Uint8Array(encrypted),
  ]);
  return r;
}

export async function decrypt(buffer: Uint8Array, key: string) {
  try {
    // 解析报文头
    let headerSize = readInt32BE(buffer, 4);
    const ivStart = 12 + headerSize;
    const ivBuffer = buffer.slice(ivStart, ivStart + 16);

    if (ivBuffer.length !== 16) return null;

    // 准备密钥
    const keyBuffer = Uint8Array.from(atob(key), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );

    let encryptedData = buffer.slice(ivStart + 16);
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-CBC",
        iv: ivBuffer,
      },
      cryptoKey,
      encryptedData
    );
    return new Uint8Array(decrypted);
  } catch (error) {
    console.error(error);
    return;
  }
}
export function decodeHeader(buffer: Uint8Array) {
  const PacketHeader = ROOT.lookupType("PacketHeader");
  let headersize = readInt32BE(buffer, 4);
  let header = buffer.slice(12, 12 + headersize);
  return PacketHeader.decode(header);
}

export function genPushMessagePack(
  seqId: number,
  instanceId: Long,
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
  instanceId: Long,
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
  instanceId: Long,
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
const encoder = new TextEncoder();

export function genRegisterPack(
  seqId: number,
  instanceId: Long,
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
      tokenInfo: { tokenType: 1, token: encoder.encode(token!) },
    }),
    registerBody,
    key
  );
}

export function genKeepAlivePack(
  seqId: number,
  instanceId: Long,
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
