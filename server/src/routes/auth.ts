import { Router } from 'express';
import { z } from 'zod';
import { db } from '../database/db.js';
import * as schema from '../database/schema.js';
import { comparePassword, signToken, hashPassword } from '../utils/security.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rate-limit.js';
import { config } from '../config/index.js';
import { eq } from 'drizzle-orm';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Middleware that completely bypasses rate limiting for admin login attempts
 */
const adminExemptAuthLimiter = async (req: any, res: any, next: any) => {
  try {
    const rawEmail = req.body?.email;
    if (rawEmail) {
      const email = String(rawEmail).toLowerCase().trim();
      const user = await db.query.users.findFirst({
        where: eq(schema.users.email, email)
      });
      // If this account has the admin role, don't apply any rate limit!
      if (user && user.role === 'admin') {
        return next();
      }
    }
  } catch (err) {
    // Fallback if check encounters an error
  }
  return authLimiter(req, res, next);
};

// POST /api/auth/login
router.post('/login', adminExemptAuthLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const normalizedEmail = email.toLowerCase().trim();
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, normalizedEmail)
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // Set HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Successfully logged out.' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.user!.userId)
    });

    if (!user) {
      return res.status(404).json({ error: 'NotFound', message: 'User not found.' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long.'),
  confirmPassword: z.string().min(1, 'Please confirm your new password.'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New password and confirmation password do not match.',
  path: ['confirmPassword'],
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.user!.userId),
    });

    if (!user) {
      return res.status(404).json({ error: 'NotFound', message: 'User not found.' });
    }

    // Verify current password against database hash or environment fallback
    const isDbPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    const isEnvPasswordValid = currentPassword === config.admin.password;

    if (!isDbPasswordValid && !isEnvPasswordValid) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Current password is incorrect.',
      });
    }

    const newHash = await hashPassword(newPassword);

    await db.update(schema.users)
      .set({
        passwordHash: newHash,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    // Audit log entry
    try {
      await db.insert(schema.auditLogs).values({
        userId: user.id,
        userEmail: user.email,
        action: 'ADMIN_PASSWORD_UPDATED',
        entityType: 'users',
        entityId: user.id,
        detailsJson: {
          email: user.email,
          updatedVia: 'admin_panel',
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      // Non-blocking
    }

    res.json({
      success: true,
      message: 'Admin password successfully updated. This new password is saved in the database and overrides any hardcoded or .env passwords.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
