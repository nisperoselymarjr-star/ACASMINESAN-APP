import { Injectable, inject } from '@angular/core';
import { AccountProfileStoreService } from './account-profile-store.service';

interface PasswordCredential {
  hash: string;
  iterations: number;
  salt: string;
}

@Injectable({ providedIn: 'root' })
export class AccountAuthenticationService {
  private readonly credentialsStorageKey = 'komyunity-password-credentials';
  private readonly iterations = 310_000;
  private readonly accountProfiles = inject(AccountProfileStoreService);

  async registerPassword(identifier: string, password: string): Promise<boolean> {
    const accountId = this.accountProfiles.normalizeAccountIdentifier(identifier);
    const credentials = this.readCredentials();
    if (!accountId || Object.hasOwn(credentials, accountId)) {
      return false;
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    credentials[accountId] = {
      hash: await this.hashPassword(password, salt, this.iterations),
      iterations: this.iterations,
      salt: this.toHex(salt),
    };
    localStorage.setItem(this.credentialsStorageKey, JSON.stringify(credentials));
    return true;
  }

  async verifyPassword(identifier: string, password: string): Promise<boolean> {
    const accountId = this.accountProfiles.normalizeAccountIdentifier(identifier);
    const credentials = this.readCredentials();
    const credential = Object.hasOwn(credentials, accountId) ? credentials[accountId] : undefined;
    if (!credential) {
      return false;
    }

    const hash = await this.hashPassword(
      password,
      this.fromHex(credential.salt),
      credential.iterations,
    );
    return this.hashesMatch(hash, credential.hash);
  }

  private readCredentials(): Record<string, PasswordCredential> {
    const stored = localStorage.getItem(this.credentialsStorageKey);
    if (!stored) {
      return {};
    }

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Stored account credentials are invalid.');
    }

    const credentials: Record<string, PasswordCredential> = Object.create(null);
    for (const [accountId, value] of Object.entries(parsed)) {
      if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        !('hash' in value) ||
        typeof value.hash !== 'string' ||
        !/^[0-9a-f]{64}$/i.test(value.hash) ||
        !('iterations' in value) ||
        value.iterations !== this.iterations ||
        !('salt' in value) ||
        typeof value.salt !== 'string' ||
        !/^[0-9a-f]{32}$/i.test(value.salt)
      ) {
        throw new Error('Stored account credentials are invalid.');
      }
      credentials[accountId] = {
        hash: value.hash,
        iterations: value.iterations,
        salt: value.salt,
      };
    }
    return credentials;
  }

  private async hashPassword(
    password: string,
    salt: Uint8Array<ArrayBuffer>,
    iterations: number,
  ): Promise<string> {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
      key,
      256,
    );
    return this.toHex(new Uint8Array(bits));
  }

  private hashesMatch(left: string, right: string): boolean {
    if (left.length !== right.length) {
      return false;
    }

    let difference = 0;
    for (let index = 0; index < left.length; index++) {
      difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
    }
    return difference === 0;
  }

  private toHex(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  private fromHex(value: string): Uint8Array<ArrayBuffer> {
    if (!/^(?:[0-9a-f]{2})+$/i.test(value)) {
      throw new Error('Stored account credentials are invalid.');
    }
    const bytes = new Uint8Array(value.length / 2);
    for (let index = 0; index < value.length; index += 2) {
      bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
    }
    return bytes;
  }
}
