import 'reflect-metadata'
import {
  Controller,
  ForbiddenException,
  Get,
  Module,
  Req,
} from '@nestjs/common'
import { APP_GUARD, NestFactory } from '@nestjs/core'
import type { ValidateDefinition } from 'permix'
import { createPermix } from 'permix/nest'

type PermissionsDefinition = ValidateDefinition<{
  user: ['read', 'write']
}>

const permix = createPermix<PermissionsDefinition>({
  onForbidden: () => {
    throw new ForbiddenException({
      error: 'You do not have permission to access this resource',
    })
  },
})

@Controller()
class AppController {
  @Get()
  @permix.Check('user.read')
  read() {
    return 'Hello World'
  }

  @Get('write')
  @permix.Check('user.write')
  write() {
    return 'Hello World'
  }

  @Get('permix')
  inspect(@Req() req: { [key: PropertyKey]: unknown }) {
    return { canRead: permix.getOrThrow(req).check('user.read') }
  }
}

@Module({
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useValue: permix.guard(() => ({
        user: {
          read: true,
          write: false,
        },
      })),
    },
  ],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await app.listen(3000)
  console.log('Server is running on port 3000')
}

bootstrap()
