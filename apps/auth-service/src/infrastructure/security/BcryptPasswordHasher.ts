import * as bcrypt from 'bcryptjs';
import { IPasswordHasher } from '../../application/ports';

export class BcryptPasswordHasher implements IPasswordHasher {
  private readonly rounds = 12;

  hash(plano: string): Promise<string> {
    return bcrypt.hash(plano, this.rounds);
  }

  compare(plano: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plano, hash);
  }
}
