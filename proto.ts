import ProtoBufJs from "protobufjs";
import crypto from "crypto";

const acConfig = require("./config/config.json");
const ROOT = ProtoBufJs.Root.fromJSON(require("./protos.bundle.json"));
const EncryptionMode = ROOT.lookupEnum("EncryptionMode");
let base = {
  genCommand: (command: any, msg: any, ticket: any, liveId: any) => {
    const ZtLiveCsCmd = ROOT.lookupType("ZtLiveCsCmd");
    let payload = {
      cmdType: command,
      ticket: ticket,
      liveId: liveId,
      payload: msg,
    };
    let ztLiveCsCmd = ZtLiveCsCmd.create(payload);
    return ZtLiveCsCmd.encode(ztLiveCsCmd).finish();
  },
  genPayload: (seqId: any, retryCount: any, command: any, msg: any) => {
    const UpstreamPayload = ROOT.lookupType("UpstreamPayload");
    let payload = {
      command: command,
      payloadData: msg,
      seqId: seqId,
      retryCount: retryCount,
      subBiz: acConfig.kuaishou.subBiz,
    };
    let upstreamPayload = UpstreamPayload.create(payload);
    let buffer = UpstreamPayload.encode(upstreamPayload).finish();
    return buffer;
  },
  /**
   * @argument key {string}
   */
  genHeader: (
    seqId: any,
    instanceId: any,
    uid: any,
    length: any,
    encryptionMode = EncryptionMode.values.kEncryptionSessionKey,
    token?: any
  ) => {
    const PacketHeader = ROOT.lookupType("PacketHeader");

    let payload: any = {
      flags: null,
      encodingType: null,
      tokenInfo: null,
      features: [],
      appId: acConfig.app_id,
      uid: uid,
      instanceId: instanceId,
      decodedPayloadLen: length,
      encryptionMode: encryptionMode,
      kpn: acConfig.kuaishou.kpn,
      seqId: seqId,
    };
    if (encryptionMode === EncryptionMode.values.kEncryptionServiceToken)
      payload.tokenInfo = { tokenType: 1, token: Buffer.from(token) };
    let packetHeader = PacketHeader.create(payload);
    let buffer = PacketHeader.encode(packetHeader).finish();
    // console.log("header object")
    // console.log(buffer)
    // console.log(PacketHeader.decode(buffer))
    return buffer;
  },
  genEnterRoom: (enterRoomAttach: any) => {
    const ZtLiveCsEnterRoom = ROOT.lookupType("ZtLiveCsEnterRoom");
    let payload = {
      enterRoomAttach: enterRoomAttach,
      clientLiveSdkVersion: acConfig.client_live_sdk_version,
    };
    let ztLiveCsEnterRoom = ZtLiveCsEnterRoom.create(payload);
    return ZtLiveCsEnterRoom.encode(ztLiveCsEnterRoom).finish();
  },
  genKeepAlive: () => {
    const KeepAliveRequest = ROOT.lookupType("KeepAliveRequest");
    const PresenceStatus = ROOT.lookupEnum("PresenceStatus");
    const ActiveStatus = ROOT.lookupEnum("ActiveStatus");
    let payload = {
      presenceStatus: PresenceStatus.values.kPresenceOnline,
      appActiveStatus: ActiveStatus.values.kAppInForeground,
    };
    let keepAliveRequest = KeepAliveRequest.create(payload);
    return KeepAliveRequest.encode(keepAliveRequest).finish();
  },
  genRegister: (instanceId: any, uid: any) => {
    const RegisterRequest = ROOT.lookupType("RegisterRequest");
    const PlatformType = ROOT.lookupEnum("DeviceInfo.PlatformType");
    const PresenceStatus = ROOT.lookupEnum("RegisterRequest.PresenceStatus");
    const ActiveStatus = ROOT.lookupEnum("RegisterRequest.ActiveStatus");
    let payload = {
      appInfo: {
        appName: acConfig.app_name,
        sdkVersion: acConfig.sdk_version,
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
        kpn: acConfig.kuaishou.kpn,
        kpf: acConfig.kuaishou.kpf,
        uid: uid,
      },
    };
    let register = RegisterRequest.create(payload);
    let buffer = RegisterRequest.encode(register).finish();
    // console.log("register object")
    // console.log(RegisterRequest.decode(buffer))
    return buffer;
  },
  genHeartbeat: (seqId: any) => {
    const ZtLiveCsHeartbeat = ROOT.lookupType("ZtLiveCsHeartbeat");
    let payload = {
      clientTimestampMs: new Date().getTime(),
      sequence: seqId,
    };
    let ztLiveCsHeartbeat = ZtLiveCsHeartbeat.create(payload);
    return ZtLiveCsHeartbeat.encode(ztLiveCsHeartbeat).finish();
  },
  encode: (header: any, body: any, key: any) => {
    // console.log(UpstreamPayload.decode(body))
    //console.log(body.length)
    const iv = crypto.randomBytes(16);
    let keyBuffer = Buffer.from(key, "base64");
    let cipher = crypto.createCipheriv("AES-128-CBC", keyBuffer, iv, {});
    cipher.setAutoPadding(true);
    let encrypted = Buffer.concat([cipher.update(body), cipher.final()]);
    // console.log(encrypted.length)
    let headerSize = header.length;
    let bodySize = encrypted.length;
    // console.log(bodySize)
    let s1 = Buffer.from([0xab, 0xcd, 0x00, 0x01]);
    let s2 = Buffer.alloc(4);
    let s3 = Buffer.alloc(4);
    s2.writeInt32BE(headerSize);
    s3.writeInt32BE(bodySize + 16);
    // console.log(header.toString("base64"))
    // console.log(iv.toString("base64"))
    // console.log(encrypted.toString("base64"))
    // console.log(ss.toString("base64"))
    let r = Buffer.concat([s1, s2, s3, header, iv, encrypted]);
    //console.log(r.slice(12 + headerSize, 28 + headerSize))
    // console.log(r.slice(28 + headerSize, r.length))
    // console.log(encrypted)
    return r;
  },
};

export default {
  decrypt: (buffer: any, key: any) => {
    try {
      let headersize = buffer.readInt32BE(4);
      let keyBuffer = Buffer.from(key, "base64");
      let ivBuffer = buffer.slice(12 + headersize, 28 + headersize);
      if(ivBuffer.length!=16){
        return false
      }
      let bodyBuffer = buffer.slice(28 + headersize);
      let decipher = crypto.createDecipheriv("AES-128-CBC", keyBuffer, ivBuffer)
      return Buffer.concat([decipher.update(bodyBuffer), decipher.final()]);
    } catch (error) {
      console.log(error)
      return 
    }

  },
  decodeHeader: (buffer: any) => {
    const PacketHeader = ROOT.lookupType("PacketHeader");
    let headersize = buffer.readInt32BE(4);
    let header = buffer.slice(12, 12 + headersize);
    return PacketHeader.decode(header);
  },
  genPushMessagePack: (seqId: any, instanceId: any, uid: any, key: any) => {
    let payload = base.genPayload(
      seqId,
      1,
      "Push.ZtLiveInteractive.Message",
      null
    );
    return base.encode(
      base.genHeader(seqId, instanceId, uid, payload.length),
      payload,
      key
    );
  },
  genHeartbeatPack: (seqId: any, instanceId: any, uid: any, key: any, ticket: any, liveId: any) => {
    let heartbeatBody = base.genHeartbeat(seqId);
    let cmd = base.genCommand(
      "ZtLiveCsHeartbeat",
      heartbeatBody,
      ticket,
      liveId
    );
    let payload = base.genPayload(
      seqId,
      1,
      "Global.ZtLiveInteractive.CsCmd",
      cmd
    );
    return base.encode(
      base.genHeader(seqId, instanceId, uid, payload.length),
      payload,
      key
    );
  },
  genEnterRoomPack: (
    seqId: any,
    instanceId: any,
    uid: any,
    key: any,
    enterRoomAttach: any,
    ticket: any,
    liveId: any
  ) => {
    let enterRoom = base.genEnterRoom(enterRoomAttach);
    let enterRoomCmd = base.genCommand(
      "ZtLiveCsEnterRoom",
      enterRoom,
      ticket,
      liveId
    );
    let enterRoomBody = base.genPayload(
      seqId,
      1,
      "Global.ZtLiveInteractive.CsCmd",
      enterRoomCmd
    );
    let bodySize = enterRoomBody.length;
    return base.encode(
      base.genHeader(seqId, instanceId, uid, bodySize),
      enterRoomBody,
      key
    );
  },
  genRegisterPack: (seqId: any, instanceId: any, uid: any, key: any, token: any) => {
    let register = base.genRegister(instanceId, uid);
    let registerBody = base.genPayload(seqId, 1, "Basic.Register", register);
    let bodySize = registerBody.length;
    return base.encode(
      base.genHeader(
        seqId,
        instanceId,
        uid,
        bodySize,
        EncryptionMode.values.kEncryptionServiceToken,
        token
      ),
      registerBody,
      key
    );
  },
  genKeepAlivePack: (seqId: any, instanceId: any, uid: any, key: any) => {
    let keepAlive = base.genKeepAlive();
    let keepAliveBody = base.genPayload(seqId, 1, "Basic.KeepAlive", keepAlive);
    let bodySize = keepAliveBody.length;
    return base.encode(
      base.genHeader(seqId, instanceId, uid, bodySize),
      keepAliveBody,
      key
    );
  },
};
