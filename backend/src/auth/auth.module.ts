import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { JwtService } from './jwt.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AuthService, AuthGuard, JwtService],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard, JwtService],
})
export class AuthModule { }
