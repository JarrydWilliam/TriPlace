import { Request, Response, NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Production security middleware
export function setupProductionMiddleware(app: any) {
  if (process.env.NODE_ENV === 'production') {
    // Enable trust proxy for production deployments
    app.set('trust proxy', 1);

    // Security headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https:", "wss:"],
          fontSrc: ["'self'", "https:"],
          manifestSrc: ["'self'"],
          workerSrc: ["'self'", "blob:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // Compression
    app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req: Request, res: Response) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        error: "Too many requests from this IP, please try again later.",
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);

    // API rate limiting (more restrictive)
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      message: {
        error: "API rate limit exceeded, please try again later.",
      },
    });
    app.use('/api/', apiLimiter);
  }

  // CORS configuration
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      process.env.REPLIT_DEV_DOMAIN && `https://${process.env.REPLIT_DEV_DOMAIN}`,
      process.env.REPL_SLUG && `https://${process.env.REPL_SLUG}.${process.env.REPLIT_CLUSTER || 'replit'}.dev`,
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }

    next();
  });

  // Cache control for static assets
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    } else if (req.url === '/manifest.webmanifest' || req.url === '/sw.js') {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  });

  // Request logging for production monitoring
  if (process.env.NODE_ENV === 'production') {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString(),
        };
        
        // Log slow requests
        if (duration > 1000) {
          console.warn('Slow request:', logData);
        }
        
        // Log errors
        if (res.statusCode >= 400) {
          console.error('Request error:', logData);
        }
      });
      
      next();
    });
  }
}

// Production error handler
export function productionErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Production error:', err);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const errorResponse = {
    error: isDevelopment ? err.message : 'Internal server error',
    status: err.status || 500,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: err.stack }),
  };

  res.status(err.status || 500).json(errorResponse);
}