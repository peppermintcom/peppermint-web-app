import type {Entity} from '../domain'

export type SaveConfig = {
  checkConflict?: boolean;
}

export type QueryConfig = {
  limit: number;
  position?: string;
}

export type QueryResult = {entities: Entity[]; position?: string};

export type QueryMessagesByEmail = {
  email: string;
  role: 'sender' | 'recipient';
  order: 'chronological' | 'reverse';
  start_time: number;
  end_time: number;
}
