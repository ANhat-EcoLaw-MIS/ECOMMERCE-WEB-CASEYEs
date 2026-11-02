import { Database } from './database.types';

export interface AppError {
  message: string;
  code?: string;
}

export type Result<T> =
  | { data: T; error: null }
  | { data: null; error: AppError };

export type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export const ok = <T>(data: T): Result<T> => ({
  data,
  error: null
});

export const fail = (error: { message: string; code?: string }): Result<never> => ({
  data: null,
  error: { message: error.message, code: error.code },
});

export type TableName = keyof Database['public']['Tables'];
