import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { UsersController } from '../src/modules/users/controllers/users.controller';
import { UsersService } from '../src/modules/users/services/users.service';

describe('User OpenAPI response contract', () => {
  it('documents wrapped user responses and the separate paginated response', async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: {} }],
    }).compile();
    const app = module.createNestApplication();
    try {
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().build(),
      );
      for (const [path, method, status] of [
        ['/users', 'post', '201'],
        ['/users/{id}', 'get', '200'],
        ['/users/{id}', 'patch', '200'],
      ]) {
        expect(
          document.paths[path][method].responses[status].content[
            'application/json'
          ].schema.$ref,
        ).toBe('#/components/schemas/UserEnvelopeDto');
      }
      expect(document.components.schemas.UserEnvelopeDto).toMatchObject({
        properties: { data: { $ref: '#/components/schemas/UserResponseDto' } },
      });
      expect(document.paths['/users'].get.responses['200']).toMatchObject({
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/PaginatedUsersResponseDto' },
          },
        },
      });
    } finally {
      await app.close();
    }
  });
});
