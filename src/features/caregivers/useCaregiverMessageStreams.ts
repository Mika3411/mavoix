import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../../services/config";
import type { CaregiverAlertTarget } from "../../shared/types";
import {
  type CaregiverMessage,
  countUnreadCaregiverMessages,
  getCaregiverMessageReadStorageKey,
  getCaregiverMessageStorageKey,
  initializeCaregiverReadState,
  markCaregiverMessagesRead as markCaregiverMessagesReadInStorage,
  mergeCaregiverMessagesIntoStorage,
} from "./caregiverMessages";

type UseCaregiverMessageStreamsOptions = {
  caregiverAlertTargets: CaregiverAlertTarget[];
  currentProfileId: string;
  profileId?: string;
  page: string;
};

function appendCaregiverAccessKey(url: URL, accessKey?: string) {
  if (accessKey) {
    url.searchParams.set("key", accessKey);
  }
}

function buildCaregiverMessageStreamUrl(channel: string, accessKey?: string) {
  const url = new URL("/api/caregiver-messages/stream", API_BASE);
  url.searchParams.set("channel", channel);
  appendCaregiverAccessKey(url, accessKey);
  url.searchParams.set("role", "user");
  return url.href;
}

export default function useCaregiverMessageStreams({
  caregiverAlertTargets,
  currentProfileId,
  profileId,
  page,
}: UseCaregiverMessageStreamsOptions) {
  const [unreadCaregiverMessageCount, setUnreadCaregiverMessageCount] =
    useState(0);
  const pageRef = useRef(page);

  const caregiverMessageChannels = useMemo(
    () =>
      caregiverAlertTargets
        .map((target) => target.channel)
        .filter((channel): channel is string => Boolean(channel)),
    [caregiverAlertTargets]
  );
  const caregiverMessageChannelKey = useMemo(
    () =>
      caregiverAlertTargets
        .map((target) => `${target.channel}:${target.accessKey || ""}`)
        .join("|"),
    [caregiverAlertTargets]
  );
  const caregiverMessageStorageKey = useMemo(
    () => getCaregiverMessageStorageKey(currentProfileId || profileId || "default"),
    [currentProfileId, profileId]
  );
  const caregiverMessageReadStorageKey = useMemo(
    () =>
      getCaregiverMessageReadStorageKey(currentProfileId || profileId || "default"),
    [currentProfileId, profileId]
  );

  const refreshCaregiverUnreadCount = useCallback(() => {
    setUnreadCaregiverMessageCount(
      countUnreadCaregiverMessages(
        caregiverMessageStorageKey,
        caregiverMessageReadStorageKey,
        caregiverMessageChannels
      )
    );
  }, [
    caregiverMessageChannels,
    caregiverMessageReadStorageKey,
    caregiverMessageStorageKey,
  ]);

  const markCaregiverMessagesRead = useCallback(
    (channels: string[] = caregiverMessageChannels) => {
      markCaregiverMessagesReadInStorage(
        caregiverMessageStorageKey,
        caregiverMessageReadStorageKey,
        channels
      );
      setUnreadCaregiverMessageCount(
        countUnreadCaregiverMessages(
          caregiverMessageStorageKey,
          caregiverMessageReadStorageKey,
          caregiverMessageChannels
        )
      );
    },
    [
      caregiverMessageChannels,
      caregiverMessageReadStorageKey,
      caregiverMessageStorageKey,
    ]
  );

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    initializeCaregiverReadState(
      caregiverMessageStorageKey,
      caregiverMessageReadStorageKey,
      caregiverMessageChannels
    );
    refreshCaregiverUnreadCount();
  }, [
    caregiverMessageChannels,
    caregiverMessageReadStorageKey,
    caregiverMessageStorageKey,
    refreshCaregiverUnreadCount,
  ]);

  useEffect(() => {
    if (page === "aidants") {
      markCaregiverMessagesRead();
    }
  }, [markCaregiverMessagesRead, page]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof EventSource === "undefined" ||
      caregiverMessageChannels.length === 0
    ) {
      setUnreadCaregiverMessageCount(0);
      return;
    }

    const sources = caregiverAlertTargets
      .filter((target) => target.channel)
      .map((target) => {
        const source = new EventSource(
          buildCaregiverMessageStreamUrl(target.channel, target.accessKey)
        );

        const syncUnreadCount = () => {
          if (pageRef.current === "aidants") {
            markCaregiverMessagesRead([target.channel]);
            return;
          }

          refreshCaregiverUnreadCount();
        };

        source.addEventListener("caregiver-message-history", (event) => {
          try {
            const payload = JSON.parse((event as MessageEvent).data || "{}");
            const messages = Array.isArray(payload.messages)
              ? (payload.messages as CaregiverMessage[])
              : [];
            mergeCaregiverMessagesIntoStorage(
              caregiverMessageStorageKey,
              target.channel,
              messages
            );
            syncUnreadCount();
          } catch {}
        });

        source.addEventListener("caregiver-message", (event) => {
          try {
            const payload = JSON.parse((event as MessageEvent).data || "{}");
            mergeCaregiverMessagesIntoStorage(
              caregiverMessageStorageKey,
              target.channel,
              [payload as CaregiverMessage]
            );
            syncUnreadCount();
          } catch {}
        });

        return source;
      });

    return () => {
      sources.forEach((source) => source.close());
    };
  }, [
    caregiverAlertTargets,
    caregiverMessageChannelKey,
    caregiverMessageChannels.length,
    caregiverMessageStorageKey,
    markCaregiverMessagesRead,
    refreshCaregiverUnreadCount,
  ]);

  return {
    caregiverMessageChannels,
    caregiverMessageReadStorageKey,
    caregiverMessageStorageKey,
    markCaregiverMessagesRead,
    refreshCaregiverUnreadCount,
    unreadCaregiverMessageCount,
  };
}
