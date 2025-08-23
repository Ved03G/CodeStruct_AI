import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly authService: AuthService,
        private readonly jwtService: JwtService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();

        try {
            // Extract JWT token from cookie
            const token = request.cookies?.jwt_token;
            if (!token) {
                throw new UnauthorizedException('No authentication token provided');
            }

            // Verify and decode JWT token using JwtService
            const decoded = this.jwtService.verifyToken(token);

            // Validate token structure
            if (!decoded.sub) {
                throw new UnauthorizedException('Invalid token structure');
            }

            // Verify user still exists in database
            const user = await this.authService.getUserById(decoded.sub);
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            // Attach user to request for use in controllers
            (request as any).user = user;
            return true;

        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error; // Re-throw UnauthorizedException as-is
            }
            // Handle JWT-specific errors
            throw new UnauthorizedException('Authentication failed');
        }
    }
}
