import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface UserPayload {
  id: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.jwt.secret) as UserPayload;
    
    // Validate payload has required fields
    if (!decoded.id || !decoded.email) {
      res.status(403).json({ 
        success: false, 
        message: 'Invalid token payload.' 
      });
      return;
    }
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        success: false, 
        message: 'Token has expired. Please login again.' 
      });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
      return;
    }
    
    res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token.' 
    });
    return;
  }
}

// Optional authentication - doesn't throw error if no token
export function optionalAuthenticateToken(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, env.jwt.secret) as UserPayload;
      if (decoded.id && decoded.email) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
        };
      }
    } catch (error) {
      // Token invalid - proceed without user
    }
  }
  
  next();
}