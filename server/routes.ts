import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import Stripe from "stripe";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Missing STRIPE_SECRET_KEY environment variable. Stripe functionality will not work.');
}

// Initialize Stripe if secret key is available
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" })
  : null;

// Declare session properties on Request
declare module 'express-session' {
  interface SessionData {
    userId: number;
    isAuthenticated: boolean;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware for express
  app.use(session({
    store: new (connectPgSimple(session))({
      // We'll use in-memory storage instead of PostgreSQL for sessions in this example
      // In a production app, you would use the PostgreSQL connection options here
    }),
    secret: process.env.SESSION_SECRET || 'poetrysecret123',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
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
        // Check if user is authenticated and subscribed
        const { authorization } = req.headers;
        if (authorization && authorization.startsWith('Bearer ')) {
          const token = authorization.split('Bearer ')[1];
          const user = await storage.getUserByFirebaseUid(token);
          
          if (!user || !user.isSubscribed) {
            // Return poem with limited content for premium poems
            return res.status(200).json({
              ...poem,
              content: poem.content.split('\n').slice(0, 2).join('\n') + '...',
              isPremiumLocked: true
            });
          }
        } else {
          // Not authenticated, return limited content
          return res.status(200).json({
            ...poem,
            content: poem.content.split('\n').slice(0, 2).join('\n') + '...',
            isPremiumLocked: true
          });
        }
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
        const { authorization } = req.headers;
        if (authorization && authorization.startsWith('Bearer ')) {
          const token = authorization.split('Bearer ')[1];
          const user = await storage.getUserByFirebaseUid(token);
          
          if (!user || !user.isSubscribed) {
            return res.status(200).json({
              ...poem,
              content: poem.content.split('\n').slice(0, 2).join('\n') + '...',
              isPremiumLocked: true
            });
          }
        } else {
          return res.status(200).json({
            ...poem,
            content: poem.content.split('\n').slice(0, 2).join('\n') + '...',
            isPremiumLocked: true
          });
        }
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
      
      // Check password
      const validPassword = user.password && await bcrypt.compare(parsedData.data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Set session data
      req.session.userId = user.id;
      req.session.isAuthenticated = true;
      
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
  
  // Get user profile (requires authentication)
  app.get("/api/users/profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      return res.status(200).json(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({ message: 'Failed to fetch user profile' });
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
    if (!stripe) {
      return res.status(500).json({ message: 'Stripe is not configured' });
    }
    
    try {
      const user = (req as any).user;
      const { paymentMethodId, priceId } = req.body;
      
      if (!priceId || !paymentMethodId) {
        return res.status(400).json({ message: 'Price ID and Payment Method ID are required' });
      }
      
      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
          payment_method: paymentMethodId,
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
        
        customerId = customer.id;
      } else {
        // Attach payment method to existing customer
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });
        
        // Set as default payment method
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }
      
      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
      });
      
      // Update user with Stripe info
      await storage.updateUserStripeInfo(user.id, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id
      });
      
      // Return client secret for confirmation
      const invoice = subscription.latest_invoice as any;
      const clientSecret = invoice?.payment_intent?.client_secret;
      
      return res.status(200).json({
        subscriptionId: subscription.id,
        clientSecret,
      });
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      return res.status(400).json({ 
        message: 'Failed to create subscription', 
        error: error.message 
      });
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

  const httpServer = createServer(app);
  return httpServer;
}
