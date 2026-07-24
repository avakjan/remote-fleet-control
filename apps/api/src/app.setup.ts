import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/http-exception.filter';

interface AppSetupOptions {
  enableShutdownHooks?: boolean;
}

export function configureApp(
  app: INestApplication,
  options: AppSetupOptions = {},
): void {
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  if (options.enableShutdownHooks ?? true) {
    app.enableShutdownHooks();
  }
}
