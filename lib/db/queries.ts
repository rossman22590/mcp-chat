import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, count, desc, eq, gt, gte, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  creditTransaction,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import {
  CREDIT_COST_PER_CHAT_MESSAGE,
  getNextMonthlyCreditResetDate,
  getPlanMonthlyCredits,
  type CreditPlan,
} from '@/lib/credits';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
export const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

type UserCreditState = {
  id: string;
  credits: number;
  plan: CreditPlan;
  isSuspended: boolean;
  creditResetAt: Date;
};

async function resetMonthlyCreditsIfDue(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  currentUser: UserCreditState,
) {
  const now = new Date();

  if (currentUser.creditResetAt > now) {
    return currentUser;
  }

  const monthlyCredits = getPlanMonthlyCredits(currentUser.plan);
  const nextResetAt = getNextMonthlyCreditResetDate(now);
  const creditDelta = monthlyCredits - currentUser.credits;

  const [updatedUser] = await tx
    .update(user)
    .set({
      credits: monthlyCredits,
      creditResetAt: nextResetAt,
    })
    .where(eq(user.id, currentUser.id))
    .returning({
      id: user.id,
      credits: user.credits,
      plan: user.plan,
      isSuspended: user.isSuspended,
      creditResetAt: user.creditResetAt,
    });

  if (creditDelta !== 0) {
    await tx.insert(creditTransaction).values({
      userId: currentUser.id,
      type: creditDelta > 0 ? 'grant' : 'adjustment',
      amount: creditDelta,
      balanceAfter: monthlyCredits,
      reason: 'Monthly plan reset',
      createdAt: now,
    });
  }

  return updatedUser;
}

export async function getUserCreditBalance({ userId }: { userId: string }) {
  try {
    return await db.transaction(async (tx) => {
      const [selectedUser] = await tx
        .select({
          id: user.id,
          credits: user.credits,
          plan: user.plan,
          isSuspended: user.isSuspended,
          creditResetAt: user.creditResetAt,
        })
        .from(user)
        .where(eq(user.id, userId));

      if (!selectedUser) {
        return selectedUser;
      }

      const currentUser = await resetMonthlyCreditsIfDue(tx, selectedUser);

      if (!currentUser) {
        return currentUser;
      }

      return {
        credits: currentUser.credits,
        plan: currentUser.plan,
        isSuspended: currentUser.isSuspended,
        creditResetAt: currentUser.creditResetAt,
      };
    });
  } catch (error) {
    console.error('Failed to get user credit balance');
    throw error;
  }
}

export async function consumeUserCredit({
  userId,
  amount = CREDIT_COST_PER_CHAT_MESSAGE,
}: {
  userId: string;
  amount?: number;
}) {
  try {
    return await db.transaction(async (tx) => {
      const [selectedUser] = await tx
        .select({
          id: user.id,
          credits: user.credits,
          plan: user.plan,
          isSuspended: user.isSuspended,
          creditResetAt: user.creditResetAt,
        })
        .from(user)
        .where(eq(user.id, userId));

      if (!selectedUser) {
        return selectedUser;
      }

      await resetMonthlyCreditsIfDue(tx, selectedUser);

      const [updatedUser] = await tx
        .update(user)
        .set({
          credits: sql`${user.credits} - ${amount}`,
        })
        .where(and(eq(user.id, userId), gte(user.credits, amount)))
        .returning({
          credits: user.credits,
          plan: user.plan,
          isSuspended: user.isSuspended,
          creditResetAt: user.creditResetAt,
        });

      if (updatedUser) {
        await tx.insert(creditTransaction).values({
          userId,
          type: 'spend',
          amount: -amount,
          balanceAfter: updatedUser.credits,
          reason: 'Chat message',
          createdAt: new Date(),
        });
      }

      return updatedUser;
    });
  } catch (error) {
    console.error('Failed to consume user credit');
    throw error;
  }
}

export async function getUserAdminAccess({ userId }: { userId: string }) {
  try {
    const [selectedUser] = await db
      .select({
        isAdmin: user.isAdmin,
        isSuspended: user.isSuspended,
      })
      .from(user)
      .where(eq(user.id, userId));

    return selectedUser;
  } catch (error) {
    console.error('Failed to get user admin access');
    throw error;
  }
}

export async function getUsersForAdmin() {
  try {
    return await db
      .select({
        id: user.id,
        email: user.email,
        plan: user.plan,
        credits: user.credits,
        isSuspended: user.isSuspended,
        isAdmin: user.isAdmin,
        chatCount: count(chat.id),
      })
      .from(user)
      .leftJoin(chat, eq(chat.userId, user.id))
      .groupBy(
        user.id,
        user.email,
        user.plan,
        user.credits,
        user.isSuspended,
        user.isAdmin,
      )
      .orderBy(asc(user.email), asc(user.id));
  } catch (error) {
    console.error('Failed to get users for admin');
    throw error;
  }
}

export async function updateUserPlanAndCredits({
  userId,
  plan,
  credits,
}: {
  userId: string;
  plan: CreditPlan;
  credits: number;
}) {
  try {
    const [updatedUser] = await db
      .update(user)
      .set({
        plan,
        credits,
        creditResetAt: getNextMonthlyCreditResetDate(),
      })
      .where(eq(user.id, userId))
      .returning({
        id: user.id,
        email: user.email,
        plan: user.plan,
        credits: user.credits,
        creditResetAt: user.creditResetAt,
        isSuspended: user.isSuspended,
        isAdmin: user.isAdmin,
      });

    return updatedUser;
  } catch (error) {
    console.error('Failed to update user plan and credits');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}
