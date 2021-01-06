import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AuthenticationMiddleware } from './authentication.middleware';
import { CreationController } from './creation/creation.controller';
import { PlayController } from './play/play.controller';
import { GameService } from './game/game.service';
import { LobbyService } from './lobby/lobby.service';

@Module({
  imports: [],
  controllers: [CreationController, PlayController],
  providers: [GameService, LobbyService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthenticationMiddleware).forRoutes(CreationController,PlayController);
  }
}
