import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseConnection } from "./db";

// Adăugăm o rută de health check pentru a verifica disponibilitatea serverului
function addHealthCheckRoute(app: express.Express) {
  app.get('/api/health', async (req, res) => {
    try {
      // Verifică conexiunea la baza de date
      const dbConnected = await checkDatabaseConnection();
      
      if (dbConnected) {
        res.status(200).json({ 
          status: 'ok',
          database: 'connected',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({ 
          status: 'error',
          database: 'disconnected',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      res.status(500).json({ 
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });
}

const app = express();
// Măresc limita pentru a permite încărcarea imaginilor mai mari
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Adăugăm middlewarul pentru logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Adăugăm ruta de health check
addHealthCheckRoute(app);

// Funcție pentru a gestiona erorile neașteptate la nivel de proces
function handleUncaughtErrors() {
  process.on('uncaughtException', (error) => {
    console.error('EROARE NECAPTATĂ:', error);
    // Nu permitem închiderea procesului, doar înregistrăm eroarea
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('PROMISIUNE NEREZOLVATĂ:', reason);
    // Nu permitem închiderea procesului, doar înregistrăm eroarea
  });
}

// Inițializăm handlerul de erori la nivel de proces
handleUncaughtErrors();

(async () => {
  try {
    const server = await registerRoutes(app);

    // Middleware pentru gestionarea erorilor
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Eroare middleware:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      // Nu mai aruncăm eroarea, doar o înregistrăm
      // throw err; <- această linie cauza probleme
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
    
    // Adăugăm handler pentru erorile serverului
    server.on('error', (err) => {
      console.error('Eroare server:', err);
    });
  } catch (error) {
    console.error('Eroare la pornirea aplicației:', error);
  }
})();
