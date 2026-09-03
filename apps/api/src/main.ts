import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { PrismaExceptionFilter } from './prisma/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port = configService.get<number>('port', 8080);

  // CSP off / CORP relaxed: Swagger UI's inline script+style and the web
  // app's cross-origin <img>/<audio> requests against /files and
  // /track/stream would otherwise get blocked by helmet's secure defaults.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.setGlobalPrefix('api');
  const config = new DocumentBuilder()
    .setTitle('Music Room')
    .setDescription('API documentation for Music Room application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.use(cookieParser());

app.enableCors({
  credentials: true,
  origin: [configService.get<string>('WEB_URL'), process.env.MOBILE_URL, configService.get<string>('BACKEND_URL'), ],
});

  app.useGlobalFilters(new PrismaExceptionFilter())

  await app.listen(port);
  const backendUrl = configService.get<string>('BACKEND_URL');
  console.log(`API endpoints: ${backendUrl}/api`);
  console.log(`Swagger documentation: ${backendUrl}/api/docs`);
}
bootstrap();
