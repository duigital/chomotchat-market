import { type User, type InsertUser, type Message, type InsertMessage, type ChatRoom, type InsertChatRoom, type OAuthState, type InsertOAuthState } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByWordPressId(wordpressUserId: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Chat rooms
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  getChatRoom(id: string): Promise<ChatRoom | undefined>;
  getChatRoomsByUser(userId: string): Promise<ChatRoom[]>;
  getChatRoomByProductAndBuyer(productId: string, buyerId: string): Promise<ChatRoom | undefined>;
  
  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByRoom(roomId: string): Promise<Message[]>;
  
  // OAuth states
  createOAuthState(state: InsertOAuthState): Promise<OAuthState>;
  getOAuthState(state: string): Promise<OAuthState | undefined>;
  deleteOAuthState(state: string): Promise<void>;
  cleanupExpiredOAuthStates(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private chatRooms: Map<string, ChatRoom>;
  private messages: Map<string, Message>;
  private oauthStates: Map<string, OAuthState>;

  constructor() {
    this.users = new Map();
    this.chatRooms = new Map();
    this.messages = new Map();
    this.oauthStates = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByWordPressId(wordpressUserId: number): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.wordpressUserId === wordpressUserId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      rating: 0,
      reviewCount: 0,
      wordpressUserId: null,
      displayName: null,
      avatarUrl: null,
      wordpressEmail: null,
      wordpressAccessToken: null,
      wordpressRefreshToken: null,
      wordpressTokenExpiry: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createChatRoom(insertRoom: InsertChatRoom): Promise<ChatRoom> {
    const id = randomUUID();
    const room: ChatRoom = { ...insertRoom, id, createdAt: new Date() };
    this.chatRooms.set(id, room);
    return room;
  }

  async getChatRoom(id: string): Promise<ChatRoom | undefined> {
    return this.chatRooms.get(id);
  }

  async getChatRoomsByUser(userId: string): Promise<ChatRoom[]> {
    return Array.from(this.chatRooms.values()).filter(
      (room) => room.buyerId === userId || room.sellerId === userId
    );
  }

  async getChatRoomByProductAndBuyer(productId: string, buyerId: string): Promise<ChatRoom | undefined> {
    return Array.from(this.chatRooms.values()).find(
      (room) => room.productId === productId && room.buyerId === buyerId
    );
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { ...insertMessage, id, createdAt: new Date() };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesByRoom(roomId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((msg) => msg.roomId === roomId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createOAuthState(insertState: InsertOAuthState): Promise<OAuthState> {
    const state: OAuthState = {
      ...insertState,
      userId: insertState.userId ?? null,
      createdAt: new Date(),
    };
    this.oauthStates.set(insertState.state, state);
    return state;
  }

  async getOAuthState(stateValue: string): Promise<OAuthState | undefined> {
    return this.oauthStates.get(stateValue);
  }

  async deleteOAuthState(stateValue: string): Promise<void> {
    this.oauthStates.delete(stateValue);
  }

  async cleanupExpiredOAuthStates(): Promise<void> {
    const now = new Date();
    const entries = Array.from(this.oauthStates.entries());
    for (const [key, state] of entries) {
      if (state.expiresAt < now) {
        this.oauthStates.delete(key);
      }
    }
  }
}

import { PostgresStorage } from "./postgresStorage";

export const storage = new PostgresStorage();
