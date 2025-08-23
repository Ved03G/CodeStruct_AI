import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
    sub: number; // User ID
    username: string;
    email: string;
    iat?: number;
    exp?: number;
    iss?: string;
    aud?: string;
}

@Injectable()
export class JwtService {
    private readonly secret: string;

    constructor() {
        this.secret = process.env.JWT_SECRET || 'dev-secret';
    }

    /**
     * Generate a JWT token for a user
     */
    generateToken(userId: number, username: string, email: string): string {
        const payload: JwtPayload = {
            sub: userId,
            username,
            email
        };

        return jwt.sign(payload, this.secret, {
            expiresIn: '7d',
            issuer: 'codestruct-api',
            audience: 'codestruct-frontend'
        });
    }

    /**
     * Verify and decode a JWT token
     */
    verifyToken(token: string): JwtPayload {
        return jwt.verify(token, this.secret) as unknown as JwtPayload;
    }

    /**
     * Decode token without verification (for inspection)
     */
    decodeToken(token: string): JwtPayload | null {
        try {
            return jwt.decode(token) as unknown as JwtPayload;
        } catch {
            return null;
        }
    }
}
