import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, DatabaseStorage } from "./storage";
import { z } from "zod";
import Stripe from "stripe";
import bcrypt from "bcryptjs";
import session from "express-session";
import createMemoryStore from "memorystore";
import nodemailer from "nodemailer";
import { User } from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Missing STRIPE_SECRET_KEY environment variable. Stripe functionality will not work.');
}

// Initialize Stripe if secret key is available
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
  
// Configurare nodemailer pentru trimiterea de email-uri
console.log("Configurare email cu:", { 
  emailUser: process.env.EMAIL_USER ? "disponibil" : "lipsește", 
  emailPass: process.env.EMAIL_PASSWORD ? "disponibil" : "lipsește" 
});

const transporter = nodemailer.createTransport({
  service: 'gmail',  // Folosim Gmail pentru simplitate
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true pentru SSL
  auth: {
    user: process.env.EMAIL_USER, // email-ul app-ului
    pass: process.env.EMAIL_PASSWORD // parola de aplicație (pentru Gmail)
  },
  debug: true, // Activăm debugging pentru a vedea erori detaliate
  logger: true // Activăm logging
});

// Funcție pentru trimiterea de email-uri de confirmare a abonamentului
// Funcție pentru email de bun venit la înregistrare
async function sendWelcomeEmail(user: User): Promise<void> {
  console.log("Trimitere email de bun venit pentru utilizator:", { 
    email: user.email, 
    username: user.username 
  });
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Bine ai venit pe PoesisVerse!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4b5563;">PoesisVerse</h1>
          <p style="color: #6b7280; font-size: 18px;">Lumea poeziei la un click distanță</p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Bine ai venit, ${user.username}!</h2>
          <p style="color: #4b5563; font-size: 16px;">Îți mulțumim că te-ai alăturat comunității PoesisVerse.</p>
          <p style="color: #4b5563; font-size: 16px;">Ești acum pregătit să explorezi o lume a poeziei cu opere clasice și contemporane.</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #1f2937;">Ce poți face pe PoesisVerse:</h3>
          <ul style="color: #4b5563; font-size: 16px;">
            <li>Citește poezii clasice și contemporane</li>
            <li>Marchează poeziile tale favorite</li>
            <li>Adaugă poezii noi în colecție</li>
            <li>Abonează-te pentru acces la conținut premium</li>
          </ul>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.APP_URL || 'https://poeziiverse.com'}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Explorează poezii acum</a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #6b7280; font-size: 14px; text-align: center;">
          <p>Dacă ai întrebări sau probleme, te rugăm să ne contactezi la adresa <a href="mailto:support@poeziiverse.com" style="color: #4f46e5;">support@poeziiverse.com</a>.</p>
          <p>&copy; ${new Date().getFullYear()} PoesisVerse. Toate drepturile rezervate.</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email de bun venit trimis: %s', info.messageId);
    return Promise.resolve();
  } catch (error) {
    console.error('Eroare la trimiterea email-ului de bun venit:', error);
    return Promise.reject(error);
  }
}

// Funcție pentru email de confirmare a abonamentului
async function sendSubscriptionEmail(
  user: User, 
  planType: 'monthly' | 'annual' = 'monthly',
  invoiceDetails?: {
    invoiceId: string;
    paymentDate: string;
    paymentMethod?: string;
    cardLast4?: string;
  }
): Promise<void> {
  console.log(`Trimitere email de confirmare abonament ${planType} pentru:`, user.email);
  
  // Informații specifice tipului de abonament
  let planInfo = {
    title: 'Abonament Lunar Premium',
    price: '$5.99/lună',
    renewalInfo: 'Abonamentul tău se va reînnoi automat la fiecare lună.',
    duration: 'o lună',
    amount: 5.99,
    currency: 'USD'
  };
  
  if (planType === 'annual') {
    planInfo = {
      title: 'Abonament Anual Premium',
      price: '$49.99/an',
      renewalInfo: 'Abonamentul tău se va reînnoi automat în fiecare an.',
      duration: 'un an',
      amount: 49.99,
      currency: 'USD'
    };
  }
  
  // Data pentru factură
  const paymentDate = invoiceDetails?.paymentDate || new Date().toLocaleDateString();
  const invoiceId = invoiceDetails?.invoiceId || `INV-${Date.now().toString().slice(-8)}`;
  const paymentMethod = invoiceDetails?.paymentMethod || 'Card';
  const cardDetails = invoiceDetails?.cardLast4 ? `**** **** **** ${invoiceDetails.cardLast4}` : 'Card procesat prin Stripe';
  
  // Template email pentru utilizator nou abonat
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: `Confirmare ${planInfo.title} - PoesisVerse`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4b5563;">PoesisVerse</h1>
          <p style="color: #6b7280; font-size: 18px;">Lumea poeziei la un click distanță</p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Felicitări, ${user.username}!</h2>
          <p style="color: #4b5563; font-size: 16px;">Ai achiziționat cu succes <strong>${planInfo.title}</strong> la prețul de <strong>${planInfo.price}</strong>.</p>
          <p style="color: #4b5563; font-size: 16px;">Începând de acum, ai acces la toate funcționalitățile premium pentru următoarea ${planInfo.duration}.</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #1f2937;">Ce include abonamentul tău:</h3>
          <ul style="color: #4b5563; font-size: 16px;">
            <li>Acces la toate poeziile premium</li>
            <li>Posibilitatea de a marca poezii favorite</li>
            <li>Conținut exclusiv actualizat regulat</li>
            <li>Suport prioritar</li>
          </ul>
        </div>
        
        <!-- Adăugăm secțiunea de factură -->
        <div style="border: 1px solid #e0e0e0; border-radius: 5px; margin-bottom: 20px; overflow: hidden;">
          <div style="background-color: #1f2937; color: white; padding: 15px; text-align: center;">
            <h3 style="margin: 0; font-size: 18px;">FACTURĂ</h3>
          </div>
          
          <div style="padding: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <div>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">Către:</p>
                <p style="color: #1f2937; margin: 5px 0 0; font-size: 16px;"><strong>${user.username}</strong></p>
                <p style="color: #4b5563; margin: 2px 0 0; font-size: 14px;">${user.email}</p>
              </div>
              <div style="text-align: right;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">Factură #:</p>
                <p style="color: #1f2937; margin: 5px 0 0; font-size: 16px;"><strong>${invoiceId}</strong></p>
                <p style="color: #4b5563; margin: 2px 0 0; font-size: 14px;">Data: ${paymentDate}</p>
              </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0;">Descriere</th>
                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e0e0e0;">Preț</th>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${planInfo.title}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e0e0e0;">${planInfo.price}</td>
              </tr>
              <tr style="background-color: #f8fafc;">
                <td style="padding: 10px; text-align: right;"><strong>Total</strong></td>
                <td style="padding: 10px; text-align: right;"><strong>${planInfo.price}</strong></td>
              </tr>
            </table>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
              <p style="margin: 0; color: #4b5563; font-size: 14px;"><strong>Metodă de plată:</strong> ${paymentMethod}</p>
              <p style="margin: 5px 0 0; color: #4b5563; font-size: 14px;"><strong>Detalii card:</strong> ${cardDetails}</p>
            </div>
          </div>
        </div>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="color: #1f2937; margin-top: 0;">Detalii abonament</h3>
          <p style="color: #4b5563; font-size: 16px;">
            <strong>Tip abonament:</strong> ${planInfo.title}<br>
            <strong>Preț:</strong> ${planInfo.price}<br>
            <strong>Dată activare:</strong> ${paymentDate}<br>
            <strong>Status:</strong> Activ
          </p>
          <p style="color: #4b5563; font-size: 16px;">${planInfo.renewalInfo}</p>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.APP_URL || 'https://poeziiverse.com'}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accesează contul tău</a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #6b7280; font-size: 14px; text-align: center;">
          <p>Dacă ai întrebări sau probleme, te rugăm să ne contactezi la adresa <a href="mailto:support@poeziiverse.com" style="color: #4f46e5;">support@poeziiverse.com</a>.</p>
          <p>&copy; ${new Date().getFullYear()} PoesisVerse. Toate drepturile rezervate.</p>
        </div>
      </div>
    `
  };

  try {
    // Trimite email-ul
    const info = await transporter.sendMail(mailOptions);
    console.log('Email trimis: %s', info.messageId);
    return Promise.resolve();
  } catch (error) {
    console.error('Eroare la trimiterea email-ului:', error);
    return Promise.reject(error);
  }
}

// Create a persistent memory store for sessions
const MemoryStore = createMemoryStore(session);

// Declare session properties on Request
declare module 'express-session' {
  interface SessionData {
    userId: number;
    isAuthenticated: boolean;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware for express with PostgreSQL session store
  app.use(session({
    store: storage instanceof DatabaseStorage 
      ? (storage as DatabaseStorage).sessionStore 
      : new MemoryStore({ checkPeriod: 86400000 }) as any,
    secret: process.env.SESSION_SECRET || 'poetrysecret123',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Adăugat pentru a permite CORS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Middleware to check if user is authenticated using session
  const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.isAuthenticated || !req.session.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Add user to request
      (req as any).user = user;
      next();
    } catch (error) {
      console.error('Error verifying session:', error);
      return res.status(401).json({ message: 'Invalid session' });
    }
  };
  
  // Endpoint de debugging pentru a verifica utilizatorii din sistem
  app.get("/api/debug/users", async (_req, res) => {
    try {
      const usersMap = await storage.getAllUsers();
      const users = Array.from(usersMap.values()).map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        passwordHash: user.password ? user.password.substring(0, 10) + "..." : null
      }));
      return res.status(200).json(users);
    } catch (error) {
      console.error('Error fetching debug users:', error);
      return res.status(500).json({ message: 'Failed to fetch debug users' });
    }
  });

  // Get all poems
  app.get("/api/poems", async (_req, res) => {
    try {
      const poems = await storage.getAllPoems();
      return res.status(200).json(poems);
    } catch (error) {
      console.error('Error fetching poems:', error);
      return res.status(500).json({ message: 'Failed to fetch poems' });
    }
  });
  
  // Get recently added poems
  app.get("/api/recent-poems", async (_req, res) => {
    try {
      const recentPoems = await storage.getRecentlyAddedPoems();
      return res.status(200).json(recentPoems);
    } catch (error) {
      console.error('Error fetching recent poems:', error);
      return res.status(500).json({ message: 'Failed to fetch recent poems' });
    }
  });
  
  
  // Add a new poem (requires authentication)
  app.post("/api/poems", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const poemSchema = z.object({
        title: z.string().min(3),
        content: z.string().min(10),
        author: z.string().min(2),
        description: z.string().optional(),
        year: z.string().optional(),
        category: z.string().min(1),
        isPremium: z.boolean().default(false),
        imageUrl: z.string(),
        audioUrl: z.string().optional(),
      });
      
      const parsedData = poemSchema.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: 'Invalid poem data', 
          errors: parsedData.error.format() 
        });
      }
      
      // Check if poem with the same title already exists
      const existingPoem = await storage.getPoemByTitle(parsedData.data.title);
      if (existingPoem) {
        return res.status(400).json({ message: 'Poem with this title already exists' });
      }
      
      // Create new poem with null pentru campurile opționale și adăugăm createdAt
      const newPoem = await storage.createPoem({
        ...parsedData.data,
        id: 0, // Will be set by storage
        description: parsedData.data.description || null,
        year: parsedData.data.year || null,
        category: parsedData.data.category || null,
        audioUrl: parsedData.data.audioUrl || null,
        createdAt: new Date()
      });
      
      return res.status(201).json(newPoem);
    } catch (error) {
      console.error('Error creating poem:', error);
      return res.status(500).json({ message: 'Failed to create poem' });
    }
  });
  
  // Update a poem (requires authentication, admin only)
  app.put("/api/poems/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user;
      
      // Verifică dacă utilizatorul este Administrator
      if (currentUser.username !== "Administrator") {
        return res.status(403).json({ message: "Acces interzis. Numai administratorii pot actualiza poeme." });
      }
      
      const poemId = parseInt(req.params.id);
      if (isNaN(poemId)) {
        return res.status(400).json({ message: "ID-ul poemului trebuie să fie un număr." });
      }
      
      // Verifică dacă poemul există
      const existingPoem = await storage.getPoemById(poemId);
      if (!existingPoem) {
        return res.status(404).json({ message: `Poemul cu ID-ul ${poemId} nu a fost găsit.` });
      }
      
      const poemSchema = z.object({
        title: z.string().min(3),
        content: z.string().min(10),
        author: z.string().min(2),
        description: z.string().optional(),
        year: z.string().optional(),
        category: z.string().optional(),
        isPremium: z.boolean(),
        imageUrl: z.string().optional(),
        audioUrl: z.string().optional(),
      });
      
      const parsedData = poemSchema.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: 'Invalid poem data', 
          errors: parsedData.error.format() 
        });
      }
      
      // Check if another poem with the same title already exists (except this one)
      const poemWithSameTitle = await storage.getPoemByTitle(parsedData.data.title);
      if (poemWithSameTitle && poemWithSameTitle.id !== poemId) {
        return res.status(400).json({ message: 'Another poem with this title already exists' });
      }
      
      // Update poem
      const updatedPoem = await storage.updatePoem(poemId, {
        ...parsedData.data,
        id: poemId,
        description: parsedData.data.description || null,
        year: parsedData.data.year || null,
        category: parsedData.data.category || null,
        imageUrl: parsedData.data.imageUrl || null,
        audioUrl: parsedData.data.audioUrl || null,
        createdAt: existingPoem.createdAt,
      });
      
      return res.status(200).json(updatedPoem);
    } catch (error) {
      console.error('Error updating poem:', error);
      return res.status(500).json({ message: 'Failed to update poem' });
    }
  });
  
  // Delete a poem (requires authentication, admin only)
  app.delete("/api/poems/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user;
      
      // Verifică dacă utilizatorul este Administrator
      if (currentUser.username !== "Administrator") {
        return res.status(403).json({ message: "Acces interzis. Numai administratorii pot șterge poeme." });
      }
      
      const poemId = parseInt(req.params.id);
      if (isNaN(poemId)) {
        return res.status(400).json({ message: "ID-ul poemului trebuie să fie un număr." });
      }
      
      // Verifică dacă poemul există
      const existingPoem = await storage.getPoemById(poemId);
      if (!existingPoem) {
        return res.status(404).json({ message: `Poemul cu ID-ul ${poemId} nu a fost găsit.` });
      }
      
      // Șterge poemul
      await storage.deletePoem(poemId);
      
      return res.status(200).json({ 
        success: true, 
        message: `Poemul "${existingPoem.title}" a fost șters cu succes.` 
      });
    } catch (error) {
      console.error('Error deleting poem:', error);
      return res.status(500).json({ message: 'Failed to delete poem' });
    }
  });
  
  // Get a specific poem by ID
  app.get("/api/poems/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid poem ID' });
      }
      
      const poem = await storage.getPoemById(id);
      if (!poem) {
        return res.status(404).json({ message: 'Poem not found' });
      }
      
      // Check if premium content
      if (poem.isPremium) {
        // Check if user is authenticated and subscribed through session
        if (req.session.isAuthenticated && req.session.userId) {
          const user = await storage.getUser(req.session.userId);
          if (user && user.isSubscribed) {
            // User is authenticated and subscribed, return full poem
            return res.status(200).json(poem);
          }
        }
        
        // User either not authenticated or not subscribed
        // Return poem with limited content for premium poems
        return res.status(200).json({
          ...poem,
          content: poem.content.split('\n').slice(0, 2).join('\n') + '...',
          isPremiumLocked: true
        });
      }
      
      return res.status(200).json(poem);
    } catch (error) {
      console.error('Error fetching poem:', error);
      return res.status(500).json({ message: 'Failed to fetch poem' });
    }
  });
  
  // Get a specific poem by title
  app.get("/api/poems/title/:title", async (req, res) => {
    try {
      const title = req.params.title;
      const poem = await storage.getPoemByTitle(title);
      
      if (!poem) {
        return res.status(404).json({ message: 'Poem not found' });
      }
      
      // Check if premium content (same logic as above)
      if (poem.isPremium) {
        // Check if user is authenticated and subscribed through session
        if (req.session.isAuthenticated && req.session.userId) {
          const user = await storage.getUser(req.session.userId);
          if (user && user.isSubscribed) {
            // User is authenticated and subscribed, return full poem
            return res.status(200).json(poem);
          }
        }
        
        // User either not authenticated or not subscribed
        // Return poem with limited content for premium poems
        return res.status(200).json({
          ...poem,
          content: poem.content.split('\n').slice(0, 2).join('\n') + '...',
          isPremiumLocked: true
        });
      }
      
      return res.status(200).json(poem);
    } catch (error) {
      console.error('Error fetching poem by title:', error);
      return res.status(500).json({ message: 'Failed to fetch poem' });
    }
  });
  
  // Get related poems
  app.get("/api/poems/:id/related", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid poem ID' });
      }
      
      const relatedPoems = await storage.getRelatedPoems(id);
      return res.status(200).json(relatedPoems);
    } catch (error) {
      console.error('Error fetching related poems:', error);
      return res.status(500).json({ message: 'Failed to fetch related poems' });
    }
  });
  
  // User registration endpoint with session-based auth
  app.post("/api/register", async (req, res) => {
    try {
      const userSchema = z.object({
        username: z.string().min(3),
        email: z.string().email(),
        password: z.string().min(6)
      });
      
      const parsedData = userSchema.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({ message: 'Invalid user data', errors: parsedData.error.format() });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(parsedData.data.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(parsedData.data.password, salt);
      
      // Create new user with hashed password
      const newUser = await storage.createUser({
        ...parsedData.data,
        password: hashedPassword
      });
      
      // Set session data
      req.session.userId = newUser.id;
      req.session.isAuthenticated = true;
      
      // Trimitere email de bun venit
      try {
        await sendWelcomeEmail(newUser);
        console.log('Email de bun venit trimis cu succes pentru:', newUser.email);
      } catch (emailError: any) {
        console.error('Eroare la trimiterea email-ului de bun venit:', emailError);
        // Nu returnăm eroare, continuăm cu înregistrarea chiar dacă emailul eșuează
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = newUser;
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ message: 'Failed to create user' });
    }
  });
  
  // User login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const loginSchema = z.object({
        email: z.string().email(),
        password: z.string()
      });
      
      const parsedData = loginSchema.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({ message: 'Invalid login data', errors: parsedData.error.format() });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(parsedData.data.email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Debug info pentru a vedea ce se întâmplă cu parolele
      console.log('Login attempt:', {
        email: parsedData.data.email,
        providedPassword: parsedData.data.password,
        storedPasswordHash: user.password ? user.password.substring(0, 20) + '...' : null
      });
      
      // Check password
      const validPassword = user.password && await bcrypt.compare(parsedData.data.password, user.password);
      if (!validPassword) {
        console.log('Password validation failed for user:', user.email);
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Set session data
      req.session.userId = user.id;
      req.session.isAuthenticated = true;
      console.log('User authenticated successfully, session set:', req.session.userId);
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error('Error logging in:', error);
      return res.status(500).json({ message: 'Failed to login' });
    }
  });
  
  // User logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ message: 'Failed to logout' });
      }
      
      res.clearCookie('connect.sid');
      return res.status(200).json({ message: 'Logged out successfully' });
    });
  });
  
  // Simple auth check endpoint
  app.get("/api/auth/check", async (req, res) => {
    if (req.session.isAuthenticated && req.session.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          const { password, ...userWithoutPassword } = user;
          return res.status(200).json({ 
            isAuthenticated: true, 
            user: userWithoutPassword 
          });
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    }
    
    return res.status(200).json({ isAuthenticated: false, user: null });
  });
  
  // Get user profile (requires authentication)
  app.get("/api/users/profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      // Calculate subscription info if the user is subscribed
      let subscriptionInfo = null;
      if (user.isSubscribed && user.subscribedAt && user.subscriptionEndDate) {
        const now = new Date();
        const endDate = new Date(user.subscriptionEndDate);
        
        // Calculate days remaining
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const startDate = new Date(user.subscribedAt);
        
        subscriptionInfo = {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          daysRemaining: daysRemaining,
          isActive: daysRemaining > 0
        };
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      
      return res.status(200).json({
        ...userWithoutPassword,
        subscriptionInfo
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  });
  
  // Get subscribers list (admin only)
  app.get("/api/admin/subscribers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user;
      
      // Verifică dacă utilizatorul este Administrator
      if (currentUser.username !== "Administrator") {
        return res.status(403).json({ message: "Acces interzis. Numai administratorii pot accesa această resursă." });
      }
      
      // Obține toți utilizatorii
      const allUsers = await storage.getAllUsers();
      // Conversia Map în Array - includem toți utilizatorii, nu doar cei abonați
      const subscribers = Array.from(allUsers.values())
        .map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          isSubscribed: user.isSubscribed,
          subscriptionType: user.subscriptionEndDate && user.subscribedAt ? 
            (new Date(user.subscriptionEndDate).getTime() - new Date(user.subscribedAt).getTime() > 31 * 24 * 60 * 60 * 1000 ? 
              'anual' : 'lunar') : 'nedeterminat',
          subscribedAt: user.subscribedAt,
          subscriptionEndDate: user.subscriptionEndDate
        }));
      
      return res.status(200).json(subscribers);
    } catch (error) {
      console.error("Error retrieving subscribers:", error);
      return res.status(500).json({ message: "Failed to retrieve subscribers" });
    }
  });
  
  // Admin routes for user management
  
  // Create new user (admin only)
  app.post("/api/admin/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user;
      
      // Verifică dacă utilizatorul este Administrator
      if (currentUser.username !== "Administrator") {
        return res.status(403).json({ 
          message: "Acces interzis. Numai administratorii pot adăuga utilizatori." 
        });
      }
      
      const { username, email, password, isSubscribed = false } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ 
          message: "Numele de utilizator, email-ul și parola sunt obligatorii." 
        });
      }
      
      // Verifică dacă email-ul este deja folosit
      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({ 
          message: `Email-ul ${email} este deja folosit.` 
        });
      }
      
      // Criptează parola
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Creează utilizatorul
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword
      });
      
      // Dacă utilizatorul trebuie să fie abonat, actualizează statusul
      if (isSubscribed) {
        await storage.updateUserSubscription(newUser.id, true);
      }
      
      return res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        isSubscribed: newUser.isSubscribed
      });
      
    } catch (error) {
      console.error("Error creating user:", error);
      return res.status(500).json({ 
        message: "A apărut o eroare la crearea utilizatorului." 
      });
    }
  });
  
  // Update user (admin only)
  app.put("/api/admin/users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user;
      const userId = parseInt(req.params.id);
      
      // Verifică dacă utilizatorul este Administrator
      if (currentUser.username !== "Administrator") {
        return res.status(403).json({ 
          message: "Acces interzis. Numai administratorii pot actualiza utilizatori." 
        });
      }
      
      if (isNaN(userId)) {
        return res.status(400).json({ 
          message: "ID-ul utilizatorului trebuie să fie un număr." 
        });
      }
      
      const { username, email, isSubscribed } = req.body;
      
      if (!username || !email) {
        return res.status(400).json({ 
          message: "Numele de utilizator și email-ul sunt obligatorii." 
        });
      }
      
      // Verifică dacă utilizatorul există
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ 
          message: `Utilizatorul cu ID-ul ${userId} nu a fost găsit.` 
        });
      }
      
      // Verifică dacă email-ul este deja folosit de alt utilizator
      if (email !== existingUser.email) {
        const userWithSameEmail = await storage.getUserByEmail(email);
        if (userWithSameEmail && userWithSameEmail.id !== userId) {
          return res.status(400).json({ 
            message: `Email-ul ${email} este deja folosit de alt utilizator.` 
          });
        }
      }
      
      // Actualizează datele utilizatorului
      let updatedUser = existingUser;
      
      // Actualizează numele de utilizator și email-ul (dacă s-au schimbat)
      if (username !== existingUser.username || email !== existingUser.email) {
        // Folosim noua metodă updateUserDetails
        updatedUser = await storage.updateUserDetails(userId, { username, email });
      }
      
      // Actualizează statusul de abonare dacă s-a schimbat
      if (isSubscribed !== undefined && isSubscribed !== existingUser.isSubscribed) {
        updatedUser = await storage.updateUserSubscription(userId, isSubscribed);
      }
      
      return res.status(200).json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        isSubscribed: updatedUser.isSubscribed
      });
      
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({ 
        message: "A apărut o eroare la actualizarea utilizatorului." 
      });
    }
  });
  
  // Delete user by email (admin only)
  app.delete("/api/admin/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user;
      const { email } = req.body;
      
      // Verifică dacă utilizatorul este Administrator
      if (currentUser.username !== "Administrator") {
        return res.status(403).json({ message: "Acces interzis. Numai administratorii pot șterge utilizatori." });
      }
      
      if (!email) {
        return res.status(400).json({ message: "Email-ul utilizatorului este obligatoriu." });
      }
      
      // Obține utilizatorul după email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: `Utilizatorul cu email-ul ${email} nu a fost găsit.` });
      }
      
      // Șterge utilizatorul
      await storage.deleteUser(user.id);
      
      return res.status(200).json({ 
        success: true, 
        message: `Utilizatorul cu email-ul ${email} a fost șters cu succes.` 
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ 
        success: false, 
        message: "A apărut o eroare la ștergerea utilizatorului." 
      });
    }
  });
  
  // Test email endpoint (requires authentication)
  app.post("/api/test-email", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      console.log("Test email pentru:", user.email);
      
      try {
        await sendSubscriptionEmail(user);
        return res.status(200).json({ 
          success: true, 
          message: 'Email test trimis cu succes'
        });
      } catch (emailError: any) {
        console.error('Error sending test email:', emailError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to send test email', 
          error: emailError.message || 'Unknown error' 
        });
      }
    } catch (error: any) {
      console.error('Error in test email endpoint:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to process test email request',
        error: error.message || 'Unknown error'
      });
    }
  });
  
  // Bookmark a poem (requires authentication)
  app.post("/api/bookmarks", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { poemId } = req.body;
      
      if (!poemId) {
        return res.status(400).json({ message: 'Poem ID is required' });
      }
      
      const bookmark = await storage.bookmarkPoem(user.id, poemId);
      return res.status(201).json(bookmark);
    } catch (error) {
      console.error('Error bookmarking poem:', error);
      return res.status(500).json({ message: 'Failed to bookmark poem' });
    }
  });
  
  // Get user bookmarks (requires authentication)
  app.get("/api/bookmarks", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const bookmarks = await storage.getUserBookmarks(user.id);
      return res.status(200).json(bookmarks);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      return res.status(500).json({ message: 'Failed to fetch bookmarks' });
    }
  });
  
  // Remove a bookmark (requires authentication)
  app.delete("/api/bookmarks/:poemId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const poemId = parseInt(req.params.poemId);
      
      if (isNaN(poemId)) {
        return res.status(400).json({ message: 'Invalid poem ID' });
      }
      
      await storage.removeBookmark(user.id, poemId);
      return res.status(204).send();
    } catch (error) {
      console.error('Error removing bookmark:', error);
      return res.status(500).json({ message: 'Failed to remove bookmark' });
    }
  });
  
  // Stripe payment routes
  
  // Create subscription with Stripe
  app.post("/api/create-subscription", isAuthenticated, async (req: Request, res: Response) => {
    // Check if Stripe is properly configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Missing Stripe secret key configuration');
      return res.status(500).json({ 
        message: 'Stripe is not configured properly',
        details: 'Missing Stripe API keys. Please contact the administrator.'
      });
    }
    
    if (!stripe) {
      console.error('Stripe client not initialized');
      return res.status(500).json({ 
        message: 'Stripe service unavailable',
        details: 'Payment processing is currently unavailable. Please try again later.'
      });
    }
    
    try {
      const user = (req as any).user;
      const { planType = 'monthly' } = req.body;
      
      // Use fixed pricing based on plan type
      const amount = planType === 'monthly' ? 599 : 4999; // $5.99 or $49.99
      
      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
          metadata: {
            userId: user.id.toString()
          }
        });
        
        customerId = customer.id;
        
        // Update user with customer ID
        await storage.updateUserStripeInfo(user.id, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: null as unknown as string
        });
      }
      
      // Create a payment intent directly
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        customer: customerId,
        capture_method: 'automatic',
        payment_method_types: ['card'],
        metadata: {
          userId: user.id.toString(),
          planType: planType,
          isSubscription: 'true',
          productName: planType === 'monthly' ? 'Monthly Subscription' : 'Annual Subscription'
        }
      });
      
      return res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amount / 100, // Return the amount in dollars for display
        planType: planType
      });
    } catch (error: any) {
      console.error('Error creating payment:', error);
      
      // Provide more specific error messages based on the error type
      if (error.type === 'StripeAuthenticationError') {
        return res.status(500).json({ 
          message: 'Failed to create payment', 
          error: 'Authentication with payment provider failed. Please contact support.'
        });
      } else if (error.type === 'StripeInvalidRequestError') {
        return res.status(400).json({ 
          message: 'Failed to create payment', 
          error: 'Invalid request to payment provider. Please try again.'
        });
      } else {
        return res.status(500).json({ 
          message: 'Failed to create payment', 
          error: error.message || 'An unexpected error occurred'
        });
      }
    }
  });
  
  // Verify subscription status
  app.get("/api/subscription", isAuthenticated, async (req: Request, res: Response) => {
    if (!stripe) {
      return res.status(500).json({ message: 'Stripe is not configured' });
    }
    
    try {
      const user = (req as any).user;
      
      if (!user.stripeSubscriptionId) {
        return res.status(200).json({ isActive: false });
      }
      
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';
      
      // Update user subscription status if needed
      if (isActive !== user.isSubscribed) {
        await storage.updateUserSubscription(user.id, isActive);
      }
      
      return res.status(200).json({
        isActive,
        subscription
      });
    } catch (error) {
      console.error('Error verifying subscription:', error);
      return res.status(500).json({ message: 'Failed to verify subscription' });
    }
  });
  
  // Mark subscription as successful and send confirmation email
  app.post("/api/mark-subscription-success", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { 
        planType = 'monthly',
        paymentIntentId,
        card = {} 
      } = req.body; // Get data from request body
      
      // Validate and normalize planType
      let normalizedPlanType: 'monthly' | 'annual' = 'monthly';
      
      // Verificăm și normalizăm tipul de plan
      const planTypeLower = String(planType).toLowerCase().trim();
      if (planTypeLower === 'annual' || planTypeLower === 'yearly') {
        normalizedPlanType = 'annual';
      } else if (planTypeLower === 'monthly' || planTypeLower === 'month') {
        normalizedPlanType = 'monthly';
      } else {
        console.log(`Plan type invalid: "${planType}", folosim implicit "monthly"`);
        // Default la monthly în loc să dăm eroare
      }
      
      console.log(`Plan normalizat: "${normalizedPlanType}" (original "${planType}")`);
      
      
      // Update user subscription status with dates
      // Calculăm data de expirare a abonamentului
      const currentDate = new Date();
      const subscriptionEndDate = new Date(currentDate);
      
      // Adăugăm perioada corectă în funcție de tipul de abonament
      if (normalizedPlanType === 'annual') {
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1); // 1 an
      } else {
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1); // 1 lună
      }
      
      console.log(`Abonament activat pentru utilizatorul ${user.username}`);
      console.log(`Data începerii: ${currentDate.toISOString()}`);
      console.log(`Data expirării: ${subscriptionEndDate.toISOString()}`);
      
      const updatedUser = await storage.updateUserSubscription(user.id, true);
      
      // Pregătim detaliile facturii
      const invoiceDetails: {
        invoiceId: string;
        paymentDate: string;
        paymentMethod: string;
        cardLast4?: string;
      } = {
        invoiceId: `INV-${Date.now().toString().slice(-8)}`,
        paymentDate: new Date().toLocaleDateString(),
        paymentMethod: 'Card'
      };
      
      // Adăugăm detaliile cardului dacă sunt disponibile
      if (card && card.last4) {
        invoiceDetails.cardLast4 = card.last4;
      }
      
      // Dacă avem un paymentIntentId, încercăm să obținem mai multe detalii de la Stripe
      if (paymentIntentId && stripe) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          
          if (paymentIntent.latest_charge) {
            const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
            
            // Actualizăm detaliile facturii cu informații de la Stripe
            if (charge.payment_method_details?.card) {
              const last4 = charge.payment_method_details.card.last4;
              if (typeof last4 === 'string') {
                invoiceDetails.cardLast4 = last4;
              }
            }
            
            if (charge.receipt_number) {
              invoiceDetails.invoiceId = charge.receipt_number;
            }
            
            if (charge.created) {
              invoiceDetails.paymentDate = new Date(charge.created * 1000).toLocaleDateString();
            }
          }
        } catch (stripeError) {
          console.error('Error retrieving payment details from Stripe:', stripeError);
          // Continuăm cu datele pe care le avem disponibile
        }
      }
      
      // Send email confirmation with plan type and invoice details
      try {
        await sendSubscriptionEmail(updatedUser, normalizedPlanType, invoiceDetails);
        console.log(`${normalizedPlanType} subscription confirmation email with invoice sent successfully for:`, updatedUser.email);
      } catch (emailError: any) {
        console.error('Error sending subscription confirmation email:', emailError);
        console.error('Email error details:', emailError.message);
        // Don't return an error, continue with subscription success
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Subscription activated successfully', 
        planType: planType,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          isSubscribed: updatedUser.isSubscribed
        } 
      });
    } catch (error: any) {
      console.error('Error marking subscription as successful:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to activate subscription',
        error: error.message || 'Unknown error'
      });
    }
  });
  
  // Create a payment intent for one-time payments
  app.post("/api/create-payment-intent", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: 'Stripe is not configured' });
    }
    
    try {
      const { amount } = req.body;
      
      if (!amount) {
        return res.status(400).json({ message: 'Amount is required' });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
      });
      
      return res.status(200).json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return res.status(500).json({ message: 'Failed to create payment intent' });
    }
  });
  
  // Stripe webhook for handling events
  app.post('/api/stripe-webhook', async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: 'Stripe is not configured' });
    }
    
    let event;
    
    try {
      // Verify the event came from Stripe
      const signature = req.headers['stripe-signature'] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        // For development, we'll process the event without verification
        event = req.body;
        console.log('⚠️ Webhook secret not configured, skipping signature verification');
      } else {
        // In production, verify the signature
        event = stripe.webhooks.constructEvent(
          (req as any).rawBody || JSON.stringify(req.body),
          signature,
          webhookSecret
        );
      }
      
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);
          
          // If this payment was for a subscription plan
          if (paymentIntent.metadata && paymentIntent.metadata.userId && paymentIntent.metadata.isSubscription === 'true') {
            const { userId, planType = 'monthly' } = paymentIntent.metadata;
            
            // Validate planType - default to monthly if invalid
            const subscriptionType = planType === 'annual' ? 'annual' : 'monthly';
            
            // Get the user
            const user = await storage.getUser(parseInt(userId));
            
            if (!user) {
              console.error(`User ${userId} not found for subscription creation`);
              break;
            }
            
            // Update user subscription status directly
            // Calculăm data de expirare pentru abonamentul webhook
            const currentDateWebhook = new Date();
            const subscriptionEndDateWebhook = new Date(currentDateWebhook);
            
            if (subscriptionType === 'annual') {
              subscriptionEndDateWebhook.setFullYear(subscriptionEndDateWebhook.getFullYear() + 1);
            } else {
              subscriptionEndDateWebhook.setMonth(subscriptionEndDateWebhook.getMonth() + 1);
            }
            
            console.log(`Webhook: Abonament activat pentru utilizatorul ${user.username}`);
            console.log(`Webhook: Data începerii: ${currentDateWebhook.toISOString()}`);
            console.log(`Webhook: Data expirării: ${subscriptionEndDateWebhook.toISOString()}`);
            
            await storage.updateUserSubscription(user.id, true);
            
            console.log(`User ${userId} ${subscriptionType} subscription activated through direct payment`);
            
            // Pregătim detaliile facturii
            const invoiceDetails: {
              invoiceId: string;
              paymentDate: string;
              paymentMethod: string;
              cardLast4?: string;
            } = {
              invoiceId: `INV-${Date.now().toString().slice(-8)}`,
              paymentDate: new Date().toLocaleDateString(),
              paymentMethod: 'Card'
            };
            
            // Încercăm să obținem detalii despre tranzacție
            if (paymentIntent.latest_charge) {
              try {
                const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
                
                // Actualizăm detaliile facturii cu informații de la Stripe
                if (charge.payment_method_details?.card) {
                  const last4 = charge.payment_method_details.card.last4;
                  if (typeof last4 === 'string') {
                    invoiceDetails.cardLast4 = last4;
                  }
                }
                
                if (charge.receipt_number) {
                  invoiceDetails.invoiceId = charge.receipt_number;
                }
                
                if (charge.created) {
                  invoiceDetails.paymentDate = new Date(charge.created * 1000).toLocaleDateString();
                }
              } catch (stripeError) {
                console.error('Error retrieving payment details from Stripe:', stripeError);
              }
            }
            
            // Trimite email de confirmare a abonamentului cu tipul corect și factura
            try {
              await sendSubscriptionEmail(user, subscriptionType, invoiceDetails);
              console.log(`${subscriptionType} subscription confirmation email with invoice sent via webhook for:`, user.email);
            } catch (emailError: any) {
              console.error(`Failed to send ${subscriptionType} subscription confirmation email:`, emailError);
            }
          }
          break;
          
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object;
          console.log(`Subscription ${event.type}: ${subscription.id}`);
          
          // Get user by stripeCustomerId
          const users = await storage.getAllUsers();
          const user = Array.from(users.values()).find(u => u.stripeCustomerId === subscription.customer);
          
          if (user) {
            // Update subscription status
            const isActive = subscription.status === 'active' || subscription.status === 'trialing';
            await storage.updateUserSubscription(user.id, isActive);
            console.log(`Updated subscription status for user ${user.id}: ${isActive}`);
          }
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      // Return a response to acknowledge receipt of the event
      res.json({ received: true });
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
