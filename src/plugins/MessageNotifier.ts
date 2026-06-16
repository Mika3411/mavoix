import { registerPlugin } from "@capacitor/core";

export interface MessageNotifierPlugin {
  requestPermission(): Promise<{
    granted: boolean;
    permission: "granted" | "denied" | "prompted";
  }>;
  showIncoming(options: {
    title: string;
    body: string;
    tag?: string;
    url?: string;
  }): Promise<{ shown: boolean }>;
}

const MessageNotifier = registerPlugin<MessageNotifierPlugin>("MessageNotifier");

export default MessageNotifier;
