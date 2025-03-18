import { users, poems, userPoems, type User, type InsertUser, type Poem, type UserPoem } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<Map<number, User>>; // Adăugat pentru debug
  createUser(user: InsertUser): Promise<User>;
  updateUserSubscription(userId: number, isSubscribed: boolean): Promise<User>;
  updateUserStripeInfo(userId: number, stripeInfo: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User>;
  
  // Poem operations
  getAllPoems(): Promise<Poem[]>;
  getPremiumPoems(): Promise<Poem[]>;
  getFreePoems(): Promise<Poem[]>;
  getRecentlyAddedPoems(): Promise<Poem[]>; // Metodă nouă pentru a obține poemele adăugate recent
  getPoemById(id: number): Promise<Poem | undefined>;
  getPoemByTitle(title: string): Promise<Poem | undefined>;
  createPoem(poem: Poem): Promise<Poem>;
  getRelatedPoems(poemId: number, limit?: number): Promise<Poem[]>;
  
  // User-Poem interactions
  bookmarkPoem(userId: number, poemId: number): Promise<UserPoem>;
  getUserBookmarks(userId: number): Promise<Poem[]>;
  removeBookmark(userId: number, poemId: number): Promise<void>;
}

import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, desc, lt, gte, ne, sql, asc, count, ilike } from 'drizzle-orm';
import pg from 'pg';
const { Pool } = pg;
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private poems: Map<number, Poem>;
  private userPoems: Map<number, UserPoem>;
  private userIdCounter: number;
  private poemIdCounter: number;
  private userPoemIdCounter: number;
  private lastAddedPoems: Poem[] = []; // Păstrăm o referință la ultimele poeme adăugate

  constructor() {
    this.users = new Map();
    this.poems = new Map();
    this.userPoems = new Map();
    this.userIdCounter = 1;
    this.poemIdCounter = 1;
    this.userPoemIdCounter = 1;
    
    // Inițializăm datele
    this.initializeUsers();
    this.initializePoems();
  }
  
  private initializeUsers() {
    // Utilizator de test
    const testUser: User = {
      id: this.userIdCounter++,
      username: "test",
      email: "test@example.com",
      // Parola criptată pentru "123456" folosind bcrypt
      password: "$2a$10$9Xn39AyVI7wPGUGc5RIAQuTKDVzLDOJMXR4kHP1jQUFJbmvfkM/nG",
      isSubscribed: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
    };
    this.users.set(testUser.id, testUser);
    
    // Utilizator predefinit
    const savedUser: User = {
      id: this.userIdCounter++,
      username: "poet",
      email: "danen53@gmail.com",
      // Parola criptată pentru "123456" folosind bcrypt
      password: "$2a$10$9Xn39AyVI7wPGUGc5RIAQuTKDVzLDOJMXR4kHP1jQUFJbmvfkM/nG",
      isSubscribed: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
    };
    this.users.set(savedUser.id, savedUser);
  }

  private initializePoems() {
    const samplePoems: Omit<Poem, "id">[] = [
      {
        title: "Invictus",
        author: "William Ernest Henley",
        content: "Out of the night that covers me,\nBlack as the pit from pole to pole,\nI thank whatever gods may be\nFor my unconquerable soul.\n\nIn the fell clutch of circumstance\nI have not winced nor cried aloud.\nUnder the bludgeonings of chance\nMy head is bloody, but unbowed.\n\nBeyond this place of wrath and tears\nLooms but the Horror of the shade,\nAnd yet the menace of the years\nFinds and shall find me unafraid.\n\nIt matters not how strait the gate,\nHow charged with punishments the scroll,\nI am the master of my fate,\nI am the captain of my soul.",
        imageUrl: "https://images.unsplash.com/photo-1558786083-0fe8d4af66ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1558786083-0fe8d4af66ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
        description: "Written in 1875 and published in 1888, \"Invictus\" is a powerful poem that speaks to the indomitable spirit of human perseverance.",
        year: "1888",
        category: "Classic Poetry",
        isPremium: false,
        createdAt: new Date()
      },
      {
        title: "The Road Not Taken",
        author: "Robert Frost",
        content: "Two roads diverged in a yellow wood,\nAnd sorry I could not travel both\nAnd be one traveler, long I stood\nAnd looked down one as far as I could\nTo where it bent in the undergrowth;\n\nThen took the other, as just as fair,\nAnd having perhaps the better claim,\nBecause it was grassy and wanted wear;\nThough as for that the passing there\nHad worn them really about the same,\n\nAnd both that morning equally lay\nIn leaves no step had trodden black.\nOh, I kept the first for another day!\nYet knowing how way leads on to way,\nI doubted if I should ever come back.\n\nI shall be telling this with a sigh\nSomewhere ages and ages hence:\nTwo roads diverged in a wood, and I—\nI took the one less traveled by,\nAnd that has made all the difference.",
        imageUrl: "https://images.unsplash.com/photo-1480497490787-505ec076689f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1480497490787-505ec076689f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
        description: "Published in 1916, this poem uses a road as a metaphor for the journey of life.",
        year: "1916",
        category: "Classic Poetry",
        isPremium: false,
        createdAt: new Date()
      },
      {
        title: "If",
        author: "Rudyard Kipling",
        content: "If you can keep your head when all about you\nAre losing theirs and blaming it on you,\nIf you can trust yourself when all men doubt you,\nBut make allowance for their doubting too;\nIf you can wait and not be tired by waiting,\nOr being lied about, don't deal in lies,\nOr being hated, don't give way to hating,\nAnd yet don't look too good, nor talk too wise...",
        imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
        description: "Written in 1895, this poem is a literary example of Victorian-era stoicism.",
        year: "1895",
        category: "Classic Poetry",
        isPremium: true
      },
      {
        title: "Fire and Ice",
        author: "Robert Frost",
        content: "Some say the world will end in fire,\nSome say in ice.\nFrom what I've tasted of desire\nI hold with those who favor fire.\nBut if it had to perish twice,\nI think I know enough of hate\nTo say that for destruction ice\nIs also great\nAnd would suffice.",
        imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
        description: "Published in 1920, this poem reflects on the destructive forces of human nature.",
        year: "1920",
        category: "Classic Poetry",
        isPremium: false
      },
      {
        title: "Hope is the thing with feathers",
        author: "Emily Dickinson",
        content: "Hope is the thing with feathers\nThat perches in the soul,\nAnd sings the tune without the words,\nAnd never stops at all,\n\nAnd sweetest in the gale is heard;\nAnd sore must be the storm\nThat could abash the little bird\nThat kept so many warm.\n\nI've heard it in the chillest land,\nAnd on the strangest sea;\nYet, never, in extremity,\nIt asked a crumb of me.",
        imageUrl: "https://images.unsplash.com/photo-1518330859478-f0c7962aedb8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1518330859478-f0c7962aedb8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
        description: "Emily Dickinson uses a bird as a metaphor for hope in this lovely poem.",
        year: "1891",
        category: "Classic Poetry",
        isPremium: true
      },
      {
        title: "Do not go gentle into that good night",
        author: "Dylan Thomas",
        content: "Do not go gentle into that good night,\nOld age should burn and rave at close of day;\nRage, rage against the dying of the light.\n\nThough wise men at their end know dark is right,\nBecause their words had forked no lightning they\nDo not go gentle into that good night...",
        imageUrl: "https://images.unsplash.com/photo-1505506874110-6a7a69069a08?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1505506874110-6a7a69069a08?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
        description: "A passionate poem about confronting death with passion and resistance.",
        year: "1951",
        category: "Modern Poetry",
        isPremium: true
      },
      {
        title: "The Waste Land",
        author: "T.S. Eliot",
        content: "April is the cruellest month, breeding\nLilacs out of the dead land, mixing\nMemory and desire, stirring\nDull roots with spring rain...",
        imageUrl: "https://images.unsplash.com/photo-1501084291732-13b1ba8f0ebc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1501084291732-13b1ba8f0ebc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
        description: "A landmark of modernist poetry that reflects the disillusionment of the post-World War I generation.",
        year: "1922",
        category: "Modern Poetry",
        isPremium: true
      },
      {
        title: "Ozymandias",
        author: "Percy Bysshe Shelley",
        content: "I met a traveller from an antique land,\nWho said: Two vast and trunkless legs of stone\nStand in the desert. Near them, on the sand,\nHalf sunk, a shattered visage lies, whose frown,\nAnd wrinkled lip, and sneer of cold command,\nTell that its sculptor well those passions read\nWhich yet survive, stamped on these lifeless things,\nThe hand that mocked them, and the heart that fed;\nAnd on the pedestal these words appear:\nMy name is Ozymandias, King of Kings;\nLook on my Works, ye Mighty, and despair!\nNothing beside remains. Round the decay\nOf that colossal Wreck, boundless and bare\nThe lone and level sands stretch far away.",
        imageUrl: "https://images.unsplash.com/photo-1508036810581-a75d7b4d9c4f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1508036810581-a75d7b4d9c4f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
        description: "Shelley's famous sonnet about the fleeting nature of power and the inevitable decline of all leaders and empires.",
        year: "1818",
        category: "Classic Poetry",
        isPremium: false
      }
    ];
    
    // Add poems to storage and make sure they all have createdAt
    samplePoems.forEach(poem => {
      const id = this.poemIdCounter++;
      this.poems.set(id, { 
        ...poem, 
        id,
        createdAt: poem.createdAt || new Date() 
      });
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }
  
  async getAllUsers(): Promise<Map<number, User>> {
    return this.users;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { 
      ...user, 
      id, 
      password: user.password || null,
      isSubscribed: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date()
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUserSubscription(userId: number, isSubscribed: boolean): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error(`User with id ${userId} not found`);
    
    const updatedUser = { ...user, isSubscribed };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserStripeInfo(userId: number, stripeInfo: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error(`User with id ${userId} not found`);
    
    const updatedUser = { 
      ...user, 
      stripeCustomerId: stripeInfo.stripeCustomerId,
      stripeSubscriptionId: stripeInfo.stripeSubscriptionId,
      isSubscribed: true
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Poem operations
  async getAllPoems(): Promise<Poem[]> {
    return Array.from(this.poems.values());
  }

  async getPremiumPoems(): Promise<Poem[]> {
    return Array.from(this.poems.values()).filter(poem => poem.isPremium);
  }

  async getFreePoems(): Promise<Poem[]> {
    return Array.from(this.poems.values()).filter(poem => !poem.isPremium);
  }
  
  // Metodă nouă pentru a obține poemele adăugate recent
  async getRecentlyAddedPoems(): Promise<Poem[]> {
    return [...this.lastAddedPoems]; // Returnăm o copie a array-ului pentru a preveni modificările accidentale
  }

  async getPoemById(id: number | null): Promise<Poem | undefined> {
    if (id === null) return undefined;
    return this.poems.get(id);
  }

  async getPoemByTitle(title: string): Promise<Poem | undefined> {
    return Array.from(this.poems.values()).find(poem => poem.title.toLowerCase() === title.toLowerCase());
  }

  async createPoem(poem: Poem): Promise<Poem> {
    const id = this.poemIdCounter++;
    const newPoem = { ...poem, id };
    this.poems.set(id, newPoem);
    
    // Adăugăm poemul nou la colecția de poeme adăugate recent
    this.lastAddedPoems.push(newPoem);
    
    // Verificăm dacă avem poeme create de utilizator și le afișăm în consolă pentru debug
    console.log(`Poem nou adăugat: ID=${newPoem.id}, Titlu=${newPoem.title}`);
    console.log(`Total poeme adăugate: ${this.lastAddedPoems.length}`);
    
    return newPoem;
  }

  async getRelatedPoems(poemId: number, limit: number = 2): Promise<Poem[]> {
    const poem = await this.getPoemById(poemId);
    if (!poem) return [];
    
    // Get poems by the same author or in the same category
    return Array.from(this.poems.values())
      .filter(p => p.id !== poemId && (p.author === poem.author || p.category === poem.category))
      .slice(0, limit);
  }

  // User-Poem interactions
  async bookmarkPoem(userId: number, poemId: number): Promise<UserPoem> {
    const user = await this.getUser(userId);
    if (!user) throw new Error(`User with id ${userId} not found`);
    
    const poem = await this.getPoemById(poemId);
    if (!poem) throw new Error(`Poem with id ${poemId} not found`);
    
    // Check if already bookmarked
    const existing = Array.from(this.userPoems.values()).find(
      up => up.userId === userId && up.poemId === poemId
    );
    
    if (existing) {
      const updated = { ...existing, isBookmarked: true };
      this.userPoems.set(existing.id, updated);
      return updated;
    }
    
    // Create new bookmark
    const id = this.userPoemIdCounter++;
    const userPoem: UserPoem = {
      id,
      userId,
      poemId,
      isBookmarked: true
    };
    
    this.userPoems.set(id, userPoem);
    return userPoem;
  }

  async getUserBookmarks(userId: number): Promise<Poem[]> {
    const bookmarks = Array.from(this.userPoems.values()).filter(
      up => up.userId === userId && up.isBookmarked
    );
    
    const poemPromises = bookmarks.map(async bookmark => {
      if (bookmark.poemId === null) return null;
      const poem = await this.getPoemById(bookmark.poemId);
      if (!poem) throw new Error(`Poem with id ${bookmark.poemId} not found`);
      return poem;
    });
    
    const poems = await Promise.all(poemPromises);
    // Filtrăm poemele null (în caz că există)
    return poems.filter((poem): poem is Poem => poem !== null);
  }

  async removeBookmark(userId: number, poemId: number): Promise<void> {
    const bookmark = Array.from(this.userPoems.values()).find(
      up => up.userId === userId && up.poemId === poemId && up.isBookmarked
    );
    
    if (bookmark) {
      const updated = { ...bookmark, isBookmarked: false };
      this.userPoems.set(bookmark.id, updated);
    }
  }
}

// Implementare pentru baza de date PostgreSQL
export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  private pool: Pool;
  public sessionStore: ReturnType<typeof connectPgSimple>;

  constructor() {
    // Inițializare pool pentru PostgreSQL
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Inițializare drizzle ORM
    this.db = drizzle(this.pool);

    // Inițializare session store pentru PostgreSQL
    const PgSession = connectPgSimple(session);
    this.sessionStore = new PgSession({
      pool: this.pool,
      createTableIfMissing: true
    });

    this.initializeDatabase();
  }

  // Inițializare bază de date
  private async initializeDatabase() {
    try {
      console.log("Inițializare bază de date PostgreSQL...");
      
      // Verifică dacă tabelele există și creează-le dacă nu
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password TEXT,
          is_subscribed BOOLEAN DEFAULT FALSE,
          stripe_customer_id TEXT,
          stripe_subscription_id TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS poems (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          author TEXT NOT NULL,
          image_url TEXT,
          thumbnail_url TEXT,
          description TEXT,
          year TEXT,
          category TEXT,
          is_premium BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS user_poems (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          poem_id INTEGER REFERENCES poems(id),
          is_bookmarked BOOLEAN DEFAULT FALSE
        );
      `);

      // După creare, verifică dacă există înregistrări în tabelul de poezii
      const { rows: poemCount } = await this.pool.query('SELECT COUNT(*) FROM poems');
      
      // Dacă nu există poezii, inițializează datele
      if (parseInt(poemCount[0].count) === 0) {
        console.log("Nu există poezii, se inițializează date de pornire...");
        await this.initializeData();
      } else {
        console.log(`Există ${poemCount[0].count} poezii în baza de date.`);
      }
    } catch (error) {
      console.error("Eroare la inițializarea bazei de date:", error);
    }
  }

  // Inițializare date de test
  private async initializeData() {
    try {
      // Utilizatori de test
      await this.pool.query(`
        INSERT INTO users (username, email, password, is_subscribed)
        VALUES 
          ('test', 'test@example.com', '$2a$10$9Xn39AyVI7wPGUGc5RIAQuTKDVzLDOJMXR4kHP1jQUFJbmvfkM/nG', false),
          ('poet', 'danen53@gmail.com', '$2a$10$9Xn39AyVI7wPGUGc5RIAQuTKDVzLDOJMXR4kHP1jQUFJbmvfkM/nG', false)
      `);

      // Poezii de test
      await this.pool.query(`
        INSERT INTO poems (title, content, author, image_url, thumbnail_url, description, year, category, is_premium)
        VALUES 
          ('Invictus', 'Out of the night that covers me,\nBlack as the pit from pole to pole,\nI thank whatever gods may be\nFor my unconquerable soul.\n\nIn the fell clutch of circumstance\nI have not winced nor cried aloud.\nUnder the bludgeonings of chance\nMy head is bloody, but unbowed.\n\nBeyond this place of wrath and tears\nLooms but the Horror of the shade,\nAnd yet the menace of the years\nFinds and shall find me unafraid.\n\nIt matters not how strait the gate,\nHow charged with punishments the scroll,\nI am the master of my fate,\nI am the captain of my soul.', 'William Ernest Henley', 'https://images.unsplash.com/photo-1558786083-0fe8d4af66ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80', 'https://images.unsplash.com/photo-1558786083-0fe8d4af66ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80', 'Written in 1875 and published in 1888, \"Invictus\" is a powerful poem that speaks to the indomitable spirit of human perseverance.', '1888', 'Classic Poetry', false),
          
          ('The Road Not Taken', 'Two roads diverged in a yellow wood,\nAnd sorry I could not travel both\nAnd be one traveler, long I stood\nAnd looked down one as far as I could\nTo where it bent in the undergrowth;\n\nThen took the other, as just as fair,\nAnd having perhaps the better claim,\nBecause it was grassy and wanted wear;\nThough as for that the passing there\nHad worn them really about the same,\n\nAnd both that morning equally lay\nIn leaves no step had trodden black.\nOh, I kept the first for another day!\nYet knowing how way leads on to way,\nI doubted if I should ever come back.\n\nI shall be telling this with a sigh\nSomewhere ages and ages hence:\nTwo roads diverged in a wood, and I—\nI took the one less traveled by,\nAnd that has made all the difference.', 'Robert Frost', 'https://images.unsplash.com/photo-1480497490787-505ec076689f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1480497490787-505ec076689f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80', 'Published in 1916, this poem uses a road as a metaphor for the journey of life.', '1916', 'Classic Poetry', false)
      `);

      console.log("Date de test inițializate cu succes.");
    } catch (error) {
      console.error("Eroare la inițializarea datelor de test:", error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Eroare la obținerea utilizatorului:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Eroare la obținerea utilizatorului după email:", error);
      return undefined;
    }
  }

  async getAllUsers(): Promise<Map<number, User>> {
    try {
      const results = await this.db.select().from(users);
      const userMap = new Map<number, User>();
      
      for (const user of results) {
        userMap.set(user.id, user);
      }
      
      return userMap;
    } catch (error) {
      console.error("Eroare la obținerea tuturor utilizatorilor:", error);
      return new Map();
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const result = await this.db.insert(users).values({
        ...user,
        isSubscribed: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null
      }).returning();
      return result[0];
    } catch (error) {
      console.error("Eroare la crearea utilizatorului:", error);
      throw error;
    }
  }

  async updateUserSubscription(userId: number, isSubscribed: boolean): Promise<User> {
    try {
      const result = await this.db.update(users)
        .set({ isSubscribed })
        .where(eq(users.id, userId))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Eroare la actualizarea abonamentului utilizatorului:", error);
      throw error;
    }
  }

  async updateUserStripeInfo(userId: number, stripeInfo: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User> {
    try {
      const result = await this.db.update(users)
        .set({ 
          stripeCustomerId: stripeInfo.stripeCustomerId,
          stripeSubscriptionId: stripeInfo.stripeSubscriptionId,
          isSubscribed: true
        })
        .where(eq(users.id, userId))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Eroare la actualizarea informațiilor Stripe ale utilizatorului:", error);
      throw error;
    }
  }

  // Poem operations
  async getAllPoems(): Promise<Poem[]> {
    try {
      return await this.db.select().from(poems);
    } catch (error) {
      console.error("Eroare la obținerea tuturor poemelor:", error);
      return [];
    }
  }

  async getPremiumPoems(): Promise<Poem[]> {
    try {
      return await this.db.select().from(poems).where(eq(poems.isPremium, true));
    } catch (error) {
      console.error("Eroare la obținerea poemelor premium:", error);
      return [];
    }
  }

  async getFreePoems(): Promise<Poem[]> {
    try {
      return await this.db.select().from(poems).where(eq(poems.isPremium, false));
    } catch (error) {
      console.error("Eroare la obținerea poemelor gratuite:", error);
      return [];
    }
  }

  async getRecentlyAddedPoems(): Promise<Poem[]> {
    try {
      return await this.db.select().from(poems).orderBy(desc(poems.createdAt)).limit(5);
    } catch (error) {
      console.error("Eroare la obținerea poemelor recent adăugate:", error);
      return [];
    }
  }

  async getPoemById(id: number): Promise<Poem | undefined> {
    try {
      if (!id) return undefined;
      const result = await this.db.select().from(poems).where(eq(poems.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Eroare la obținerea poemului după ID:", error);
      return undefined;
    }
  }

  async getPoemByTitle(title: string): Promise<Poem | undefined> {
    try {
      const result = await this.db.select().from(poems)
        .where(ilike(poems.title, title))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error("Eroare la obținerea poemului după titlu:", error);
      return undefined;
    }
  }

  async createPoem(poem: Poem): Promise<Poem> {
    try {
      const result = await this.db.insert(poems).values({
        title: poem.title,
        content: poem.content,
        author: poem.author,
        imageUrl: poem.imageUrl,
        thumbnailUrl: poem.thumbnailUrl,
        description: poem.description,
        year: poem.year,
        category: poem.category,
        isPremium: poem.isPremium,
        createdAt: new Date()
      }).returning();
      return result[0];
    } catch (error) {
      console.error("Eroare la crearea poemului:", error);
      throw error;
    }
  }

  async getRelatedPoems(poemId: number, limit: number = 2): Promise<Poem[]> {
    try {
      // Obține poemul curent
      const poem = await this.getPoemById(poemId);
      if (!poem) return [];

      // Caută poeme cu același autor sau categorie
      const relatedPoems = await this.db.select().from(poems)
        .where(
          and(
            ne(poems.id, poemId),
            sql`(${poems.author} = ${poem.author} OR ${poems.category} = ${poem.category})`
          )
        )
        .limit(limit);
      
      return relatedPoems;
    } catch (error) {
      console.error("Eroare la obținerea poemelor conexe:", error);
      return [];
    }
  }

  // User-Poem interactions
  async bookmarkPoem(userId: number, poemId: number): Promise<UserPoem> {
    try {
      // Verifică dacă există deja un bookmark
      const existingBookmark = await this.db.select().from(userPoems)
        .where(
          and(
            eq(userPoems.userId, userId),
            eq(userPoems.poemId, poemId)
          )
        )
        .limit(1);

      if (existingBookmark.length > 0) {
        // Actualizează bookmark-ul existent
        const result = await this.db.update(userPoems)
          .set({ isBookmarked: true })
          .where(
            and(
              eq(userPoems.userId, userId),
              eq(userPoems.poemId, poemId)
            )
          )
          .returning();
        return result[0];
      } else {
        // Creează un nou bookmark
        const result = await this.db.insert(userPoems).values({
          userId,
          poemId,
          isBookmarked: true
        }).returning();
        return result[0];
      }
    } catch (error) {
      console.error("Eroare la adăugarea bookmarku-lui:", error);
      throw error;
    }
  }

  async getUserBookmarks(userId: number): Promise<Poem[]> {
    try {
      // Obține bookmarks-urile utilizatorului și join cu poemele
      const result = await this.db
        .select({
          poem: poems
        })
        .from(userPoems)
        .innerJoin(poems, eq(userPoems.poemId, poems.id))
        .where(
          and(
            eq(userPoems.userId, userId),
            eq(userPoems.isBookmarked, true)
          )
        );

      return result.map(r => r.poem);
    } catch (error) {
      console.error("Eroare la obținerea bookmark-urilor utilizatorului:", error);
      return [];
    }
  }

  async removeBookmark(userId: number, poemId: number): Promise<void> {
    try {
      await this.db.update(userPoems)
        .set({ isBookmarked: false })
        .where(
          and(
            eq(userPoems.userId, userId),
            eq(userPoems.poemId, poemId)
          )
        );
    } catch (error) {
      console.error("Eroare la eliminarea bookmark-ului:", error);
      throw error;
    }
  }
}

// Exportă instanța de storage
export const storage = new DatabaseStorage();
