import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    // Protected routes require the standard "Authorization: Bearer <token>" header.
    if (!authorization) {
      throw new UnauthorizedException();
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException();
    }

    try {
      // verifyAsync checks the token signature and expiration before returning its payload.
      const payload = await this.jwtService.verifyAsync<{ sub?: string }>(
        token,
      );

      if (!payload.sub) {
        throw new UnauthorizedException();
      }

      // This verifies that the user ID carried in the JWT still exists in the database.
      const user = await this.userRepository.findOneBy({ id: payload.sub });

      if (!user) {
        throw new UnauthorizedException();
      }

      // Controllers can now use request.user.id without decoding the JWT again.
      request.user = { id: user.id };
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }
}
