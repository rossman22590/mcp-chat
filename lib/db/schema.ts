import { sql, type InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';
import { DEFAULT_CREDIT_PLAN, INITIAL_USER_CREDITS } from '../credits';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).unique(),
  password: varchar('password', { length: 64 }),
  plan: varchar('plan', { enum: ['premium', 'ultra'] })
    .notNull()
    .default(DEFAULT_CREDIT_PLAN),
  credits: integer('credits').notNull().default(INITIAL_USER_CREDITS),
  creditResetAt: timestamp('creditResetAt')
    .notNull()
    .default(sql`now() + interval '1 month'`),
  isSuspended: boolean('isSuspended').notNull().default(false),
  isAdmin: boolean('isAdmin').notNull().default(false),
});

export type User = InferSelectModel<typeof user>;

export const adminAuditLog = pgTable('AdminAuditLog', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  adminUserId: uuid('adminUserId').references(() => user.id),
  adminEmail: varchar('adminEmail', { length: 64 }).notNull(),
  targetUserId: uuid('targetUserId').references(() => user.id),
  targetEmail: varchar('targetEmail', { length: 64 }),
  action: varchar('action', { length: 64 }).notNull(),
  before: json('before').$type<Record<string, unknown> | null>(),
  after: json('after').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type AdminAuditLog = InferSelectModel<typeof adminAuditLog>;

export const creditTransaction = pgTable('CreditTransaction', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  adminUserId: uuid('adminUserId').references(() => user.id),
  adminEmail: varchar('adminEmail', { length: 64 }),
  type: varchar('type', {
    enum: ['grant', 'spend', 'refund', 'adjustment'],
  }).notNull(),
  amount: integer('amount').notNull(),
  balanceAfter: integer('balanceAfter').notNull(),
  reason: text('reason'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type CreditTransaction = InferSelectModel<typeof creditTransaction>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

export const accounts = pgTable(
  'account',
  {
    userId: uuid('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [
    {
      compoundKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ],
);

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://github.com/vercel/ai-chatbot/blob/main/docs/04-migrate-to-parts.md
export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://github.com/vercel/ai-chatbot/blob/main/docs/04-migrate-to-parts.md
export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;
