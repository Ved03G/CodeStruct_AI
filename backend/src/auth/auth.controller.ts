import { Controller, Get, Query, Res, BadRequestException, Req, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private jwtService: JwtService
  ) { }

  @Get('login')
  login(@Res() res: Response) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      throw new BadRequestException('GitHub OAuth not configured');
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'repo user:email',
    });
    return res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response
  ) {
    const clientId = process.env.GITHUB_CLIENT_ID!;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET!;
    const redirectUri = process.env.GITHUB_REDIRECT_URI!;

    const tokenResp = await this.auth.exchangeCodeForToken(clientId, clientSecret, code, redirectUri);
    const user = await this.auth.upsertUserFromGithub(tokenResp.access_token);

    // Generate JWT token using JwtService
    const jwtToken = this.jwtService.generateToken(
      user.id,
      user.githubUsername,
      user.email
    );

    // Store JWT in secure HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('jwt_token', jwtToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction, // Only secure in production
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const fe = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    return res.redirect(`${fe}/login-success`);
  }

  @Get('me')
  async me(@Req() req: Request) {
    try {
      const token = req.cookies?.jwt_token;
      if (!token) return { authenticated: false };

      const decoded = this.jwtService.verifyToken(token);

      // Verify user still exists in database
      const user = await this.auth.getUserById(decoded.sub);
      if (!user) return { authenticated: false };

      return {
        authenticated: true,
        user: {
          id: user.id,
          username: user.githubUsername,
          email: user.email
        },
      };
    } catch (error) {
      // Token invalid or expired
      return { authenticated: false };
    }
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('jwt_token');
    return res.status(200).json({ ok: true });
  }

  @Get('repos')
  @UseGuards(AuthGuard)
  async listRepos(@Req() req: Request) {
    const user = (req as any).user;
    const repos = await this.auth.listGithubRepos(user.id);
    return repos;
  }

  @Get('token-info')
  @UseGuards(AuthGuard)
  async tokenInfo(@Req() req: Request) {
    const token = req.cookies?.jwt_token;
    const decoded = this.jwtService.decodeToken(token);
    const user = (req as any).user;

    return {
      token: {
        sub: decoded?.sub,
        username: decoded?.username,
        email: decoded?.email,
        iat: decoded?.iat ? new Date(decoded.iat * 1000) : null,
        exp: decoded?.exp ? new Date(decoded.exp * 1000) : null,
        iss: decoded?.iss,
        aud: decoded?.aud
      },
      user: {
        id: user.id,
        username: user.githubUsername,
        email: user.email
      }
    };
  }
}
