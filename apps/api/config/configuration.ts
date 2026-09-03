export default () => ({
  port: parseInt(process.env.PORT ?? '8080', 10),
  jwt_secret: process.env.JWT_SECRET,
  // The mobile OAuth callback (see strategies/*-mobile.strategy.ts) and the
  // email links in mail.service.ts both need a real publicly reachable
  // address — a phone or an email client elsewhere can't resolve localhost.
  backend_url: process.env.BACKEND_URL ?? 'http://localhost:8080',
  // The web OAuth callback (see strategies/*-web.strategy.ts) instead needs
  // to land on whatever host the web app itself runs on, so the session
  // cookie it sets is visible to the web app's own requests — always
  // localhost in dev, kept separate from backend_url on purpose.
  web_backend_url: process.env.WEB_BACKEND_URL ?? 'http://localhost:8080',
  web_url: process.env.WEB_URL ?? 'http://localhost:3000',
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT ?? '587', 10),
    secure: process.env.EMAIL_SECURE,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM_NAME,
  },
  jamendo_client_id: process.env.JAMENDO_CLIENT_ID,
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  facebook: {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
  },
});
