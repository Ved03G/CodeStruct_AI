import { Controller, Get, Query, Res, BadRequestException, Req, Post, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

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

    // Simple demo cookie session
    res.cookie('uid', String(user.id), { httpOnly: true, sameSite: 'lax' });
    // In your callback function
    return res.redirect(`${process.env.FRONTEND_ORIGIN}`);
  }

  @Get('me')
  async me(@Req() req: Request) {
    const uid = req.cookies?.uid ? Number(req.cookies.uid) : NaN;
    if (!uid) return { authenticated: false };
    const user = await this.auth.getUserById(uid);
    if (!user) return { authenticated: false };
    return {
      authenticated: true,
      user: { id: user.id, username: user.githubUsername, email: user.email },
    };
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('uid');
    return res.status(200).json({ ok: true });
  }

  @Get('repos')
  async listRepos(@Req() req: Request) {
    const uid = req.cookies?.uid ? Number(req.cookies.uid) : NaN;
    if (!uid) throw new UnauthorizedException('Not authenticated');
    const repos = await this.auth.listGithubRepos(uid);
    return repos;
  }
}
