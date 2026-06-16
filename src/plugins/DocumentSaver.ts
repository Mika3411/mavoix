import { registerPlugin } from "@capacitor/core";

export interface DocumentSaverPlugin {
  saveJson(options: {
    fileName: string;
    content: string;
    mimeType?: string;
  }): Promise<{ uri: string }>;
}

const DocumentSaver = registerPlugin<DocumentSaverPlugin>("DocumentSaver");

export default DocumentSaver;