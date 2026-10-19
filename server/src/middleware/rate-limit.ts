import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 300, // Limit each IP to 300 requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
  },
  message: {
    error: 'TooManyRequests',
    message: 'Too many requests from this IP, please try again after 5 minutes.',
  },
});

export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 login attempts per 5 mins
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
  },
  message: {
    error: 'TooManyRequests',
    message: 'Too many authentication attempts, please try again in 5 minutes.',
  },
});
