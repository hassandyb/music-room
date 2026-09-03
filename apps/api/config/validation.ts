import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(8080),
  JWT_SECRET: Joi.string().required(),
  BACKEND_URL: Joi.string().default('http://localhost:8080'),
  WEB_BACKEND_URL: Joi.string().default('http://localhost:8080'),
  WEB_URL: Joi.string().default('http://localhost:3000'),
  EMAIL_HOST: Joi.string().default('smtp.gmail.com'),
  EMAIL_PORT: Joi.number().default(587),
  EMAIL_SECURE: Joi.boolean().default(true),
  EMAIL_USER: Joi.string().email().required(),
  EMAIL_PASS: Joi.string().required(),
  EMAIL_FROM_NAME: Joi.string().required(),
  JAMENDO_CLIENT_ID: Joi.string().required(),
  // Optional: Google/Facebook OAuth2 login is disabled (routes 400 at request
  // time, app still boots fine) until these are set — see google.strategy.ts
  // / facebook.strategy.ts. Not required() like the secrets above so existing
  // dev setups without OAuth apps configured yet don't break.
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  FACEBOOK_APP_ID: Joi.string().optional(),
  FACEBOOK_APP_SECRET: Joi.string().optional(),
});



