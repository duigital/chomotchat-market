import { eq, and, or, lt } from "drizzle-orm";
import { db } from "./db";
import { 
  type User, 
  type InsertUser, 
  type Message, 
  type InsertMessage, 
  type ChatRoom, 
  type InsertChatRoom,
  type OAuthState,
  type InsertOAuthState,
  users,
  chatRooms,
  messages,
  oauthStates
} from "@shared/schema";
import { type IStorage } from "./storage";

export class PostgresStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByWordPressId(wordpressUserId: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.wordpressUserId, wordpressUserId)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const result = await db.insert(chatRooms).values(room).returning();
    return result[0];
  }

  async getChatRoom(id: string): Promise<ChatRoom | undefined> {
    const result = await db.select().from(chatRooms).where(eq(chatRooms.id, id)).limit(1);
    return result[0];
  }

  async getChatRoomsByUser(userId: string): Promise<ChatRoom[]> {
    const result = await db.select().from(chatRooms).where(
      or(
        eq(chatRooms.buyerId, userId),
        eq(chatRooms.sellerId, userId)
      )
    );
    return result;
  }

  async getChatRoomByProductAndBuyer(productId: string, buyerId: string): Promise<ChatRoom | undefined> {
    const result = await db.select().from(chatRooms).where(
      and(
        eq(chatRooms.productId, productId),
        eq(chatRooms.buyerId, buyerId)
      )
    ).limit(1);
    return result[0];
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  async getMessagesByRoom(roomId: string): Promise<Message[]> {
    const result = await db.select().from(messages).where(eq(messages.roomId, roomId));
    return result;
  }

  async createOAuthState(state: InsertOAuthState): Promise<OAuthState> {
    const result = await db.insert(oauthStates).values(state).returning();
    return result[0];
  }

  async getOAuthState(stateValue: string): Promise<OAuthState | undefined> {
    const result = await db.select().from(oauthStates).where(eq(oauthStates.state, stateValue)).limit(1);
    return result[0];
  }

  async deleteOAuthState(stateValue: string): Promise<void> {
    await db.delete(oauthStates).where(eq(oauthStates.state, stateValue));
  }

  async cleanupExpiredOAuthStates(): Promise<void> {
    const now = new Date();
    await db.delete(oauthStates).where(lt(oauthStates.expiresAt, now));
  }
}
