import { Router, Request, Response } from 'express';
import { db, DBUser } from '../db.ts';
import {
  hashPassword,
  generateSalt,
  generateToken,
  sanitizeUser,
  requireAuth,
  validatePassword,
  AuthenticatedRequest,
} from '../auth.ts';

const router = Router();

// POST /api/auth/register
router.post('/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, companyName, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    const existingUser = db.findUserByEmail(emailTrimmed);
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      res.status(400).json({ error: passCheck.message });
      return;
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    const newUser: DBUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: emailTrimmed,
      role: role || 'sdr_agent',
      companyId: `comp-${Date.now()}`,
      companyName: (companyName || 'My Organization').trim(),
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    db.createUser(newUser);
    const token = generateToken(newUser);

    res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      message: 'Account created successfully with secure credentials.',
    });
  } catch (err: any) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    const user = db.findUserByEmail(emailTrimmed);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const computedHash = hashPassword(password, user.salt);
    if (computedHash !== user.passwordHash) {
      db.logAction('FAILED_LOGIN', user.id, `Failed login attempt for ${user.email}`);
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = generateToken(user);
    db.logAction('USER_LOGIN', user.id, `User ${user.email} logged in successfully`);

    res.json({
      token,
      user: sanitizeUser(user),
      message: 'Authenticated successfully.',
    });
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    user: req.user,
  });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    db.logAction('USER_LOGOUT', req.user.id, `User ${req.user.email} logged out`);
  }
  res.json({ message: 'Logged out successfully.' });
});

export default router;
