import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AuthenticationMiddleware } from './authentication.middleware';
import { CreationController } from './creation/creation.controller';
import { PlayController } from './play/play.controller';
import { GameService } from './game/game.service';
import { LobbyService } from './lobby/lobby.service';
import { PublicController } from './public/public.controller';

@Module({
  imports: [],
  controllers: [CreationController, PlayController, PublicController],
  providers: [GameService, LobbyService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthenticationMiddleware).forRoutes(CreationController,PlayController);
  }
}
