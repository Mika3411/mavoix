export type CaregiverPushTokenRow = {
  channel: string;
  platform: "android" | "ios";
  token: string;
  package_name: string | null;
  environment: string | null;
  bundle_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CaregiverAlertRow = {
  id: string;
  room_key: string;
  channel: string;
  profile_name: string | null;
  message: string;
  last_unread_message: string | null;
  created_at: string;
};

export type CaregiverMessageRow = {
  id: string;
  room_key: string;
  channel: string;
  sender_role: "user" | "caregiver";
  sender_name: string | null;
  message: string;
  message_type: "text" | "audio";
  delivered_to: number;
  delivered_at: string | null;
  read_by_user_at: string | null;
  read_by_caregiver_at: string | null;
  created_at: string;
};
