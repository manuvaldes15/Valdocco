import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { Rol } from '@valdocco/shared-types';
import { ITokenIssuer } from '../../application/ports';
import { env } from '../config/env';

export class JwtTokenIssuer implements ITokenIssuer {
  issueAccessToken(payload: { sub: string; role: Rol; personId: string }): string {
    return jwt.sign({ role: payload.role, personId: payload.personId }, env.JWT_SECRET, {
      subject: payload.sub,
      expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
      algorithm: 'HS256',
    });
  }

  issueRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(48).toString('base64url');
    return { token, hash: this.hashRefreshToken(token) };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
