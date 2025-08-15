import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async exchangeCodeForToken(clientId: string, clientSecret: string, code: string, redirectUri: string) {
    const res = await axios.post(
      'https://github.com/login/oauth/access_token',
      { client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri },
      { headers: { Accept: 'application/json' } }
    );
    return res.data;
  }

  async upsertUserFromGithub(accessToken: string) {
    const me = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
    });
    const { id, login, email } = me.data;
    const user = await this.prisma.user.upsert({
      where: { githubId: String(id) },
      update: { githubUsername: login, email: email ?? `${login}@users.noreply.github.com`, githubAccessToken: accessToken },
      create: { githubId: String(id), githubUsername: login, email: email ?? `${login}@users.noreply.github.com`, githubAccessToken: accessToken },
    });
    return user;
  }

  async getUserById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async listGithubRepos(userId: number) {
    const user = await this.getUserById(userId);
    if (!user?.githubAccessToken) return [];
    const res = await axios.get('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: { Authorization: `Bearer ${user.githubAccessToken}`, Accept: 'application/vnd.github+json' },
    });
    // Map minimal fields
    return res.data.map((r: any) => ({ id: r.id, name: r.full_name, private: r.private, url: r.html_url, clone_url: r.clone_url }));
  }
}
