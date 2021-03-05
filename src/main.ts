import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  const config = new DocumentBuilder()
    .setTitle('Catan API')
    .setDescription('The Catan API description')
    .setVersion('1.0')
    .addTag('play', 'Controller for Game interaction')
    .addTag('creation', 'Controller for initialization / Lobby handling')
    .addTag('public', 'Controller for public access')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
