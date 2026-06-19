export type CaregiverMessage = {
  id: string;
  channel: string;
  createdAt: string;
  senderRole: "user" | "caregiver";
  senderName: string;
  message: string;
  messageType?: "text" | "audio";
};

export type CaregiverMessageStore = Record<string, CaregiverMessage[]>;
export type CaregiverMessageReadState = Record<string, string>;

const MESSAGE_HISTORY_LIMIT = 80;

export function getCaregiverMessageStorageKey(profileId?: string) {
  return `maVoixCaregiverMessages:${profileId || "default"}`;
}

export function getCaregiverMessageReadStorageKey(profileId?: string) {
  return `maVoixCaregiverMessageRead:${profileId || "default"}`;
}

export function readCaregiverMessages(storageKey: string): CaregiverMessageStore {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeCaregiverMessages(
  storageKey: string,
  data: CaregiverMessageStore
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {}
}

export function readCaregiverMessageReadState(
  storageKey: string
): CaregiverMessageReadState {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeCaregiverMessageReadState(
  storageKey: string,
  data: CaregiverMessageReadState
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {}
}

export function mergeCaregiverMessages(
  currentMessages: CaregiverMessage[] = [],
  incomingMessages: CaregiverMessage[] = []
) {
  const messageMap = new Map<string, CaregiverMessage>();

  [...currentMessages, ...incomingMessages].forEach((message) => {
    if (!message?.id || (!message?.message && message?.messageType !== "audio")) {
      return;
    }

    messageMap.set(message.id, message);
  });

  return Array.from(messageMap.values())
    .sort((a, b) => getMessageTimeMs(a) - getMessageTimeMs(b))
    .slice(-MESSAGE_HISTORY_LIMIT);
}

export function mergeCaregiverMessagesIntoStorage(
  storageKey: string,
  channel: string,
  incomingMessages: CaregiverMessage[] = []
) {
  if (!channel || incomingMessages.length === 0) {
    return readCaregiverMessages(storageKey);
  }

  const data = readCaregiverMessages(storageKey);
  const nextData = {
    ...data,
    [channel]: mergeCaregiverMessages(data[channel], incomingMessages),
  };

  writeCaregiverMessages(storageKey, nextData);
  return nextData;
}

export function initializeCaregiverReadState(
  messageStorageKey: string,
  readStorageKey: string,
  channels: string[] = []
) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(readStorageKey)) return;

  const messages = readCaregiverMessages(messageStorageKey);
  const channelList = channels.length ? channels : Object.keys(messages);
  const readState: CaregiverMessageReadState = {};

  channelList.forEach((channel) => {
    const latestTime = getLatestMessageTimeMs(messages[channel] || []);
    if (latestTime > 0) {
      readState[channel] = new Date(latestTime).toISOString();
    }
  });

  writeCaregiverMessageReadState(readStorageKey, readState);
}

export function markCaregiverMessagesRead(
  messageStorageKey: string,
  readStorageKey: string,
  channels: string[] = []
) {
  const messages = readCaregiverMessages(messageStorageKey);
  const readState = readCaregiverMessageReadState(readStorageKey);
  const channelList = channels.length ? channels : Object.keys(messages);

  channelList.forEach((channel) => {
    const latestTime = getLatestMessageTimeMs(messages[channel] || []);
    if (latestTime > 0) {
      readState[channel] = new Date(latestTime).toISOString();
    }
  });

  writeCaregiverMessageReadState(readStorageKey, readState);
  return readState;
}

export function countUnreadCaregiverMessages(
  messageStorageKey: string,
  readStorageKey: string,
  channels: string[] = []
) {
  const messages = readCaregiverMessages(messageStorageKey);
  const readState = readCaregiverMessageReadState(readStorageKey);
  const channelList = channels.length ? channels : Object.keys(messages);

  return channelList.reduce((total, channel) => {
    const readTime = getStoredTimeMs(readState[channel]);
    const channelMessages = messages[channel] || [];

    return (
      total +
      channelMessages.filter(
        (message) =>
          message.senderRole === "caregiver" && getMessageTimeMs(message) > readTime
      ).length
    );
  }, 0);
}

function getMessageTimeMs(message: CaregiverMessage) {
  return getStoredTimeMs(message?.createdAt);
}

function getStoredTimeMs(value?: string) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getLatestMessageTimeMs(messages: CaregiverMessage[]) {
  return messages.reduce(
    (latest, message) => Math.max(latest, getMessageTimeMs(message)),
    0
  );
}
