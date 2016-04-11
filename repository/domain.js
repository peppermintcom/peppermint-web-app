// @flow
export type Message = {
  message_id: string;
  audio_url: string;
  created: number;
  recipient_email: string;
  sender_email: string;
  sender_name?: string;
  handled?: number;
  handled_by?: string;
  outcome?: string;
  read?: number;
}

export type Upload = {}

export type Entity = Message | Upload;
