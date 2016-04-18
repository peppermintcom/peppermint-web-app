import type {Entity} from './domain'

export type QueryMessagesByEmail = {
  email: string;
  role: 'sender' | 'recipient';
  offset?: string;
}

export type QueryResult = {entities: Entity[]; next?: string};
