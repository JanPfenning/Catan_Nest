import { Test, TestingModule } from '@nestjs/testing';
import { CreationController } from './creation.controller';

describe('CreationController', () => {
  let controller: CreationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreationController],
    }).compile();

    controller = module.get<CreationController>(CreationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
