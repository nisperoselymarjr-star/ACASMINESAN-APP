import { Injectable } from '@angular/core';

export interface AccountProfile {
  avatar: string | null;
  bio: string;
  connections: string[];
  displayName: string;
}

@Injectable({ providedIn: 'root' })
export class AccountProfileStoreService {
  private readonly activeAccountStorageKey = 'komyunity-active-account';
  private readonly savedAccountsStorageKey = 'komyunity-saved-accounts';
  private readonly defaultAccountId = 'default';

  setActiveAccount(identifier: string): void {
    const accountId = this.normalizeAccountId(identifier);
    if (accountId) {
      localStorage.setItem(this.activeAccountStorageKey, accountId);
    }
  }

  clearActiveAccount(): void {
    localStorage.removeItem(this.activeAccountStorageKey);
  }

  getActiveAccountIdentifier(): string {
    const accountId = this.getActiveAccountId();
    return accountId === this.defaultAccountId ? '' : accountId;
  }

  getSavedAccounts(): string[] {
    try {
      const saved = localStorage.getItem(this.savedAccountsStorageKey);
      const accounts: unknown = saved ? JSON.parse(saved) : [];
      return Array.isArray(accounts)
        ? [...new Set(accounts.filter((account): account is string => typeof account === 'string')
          .map((account) => this.normalizeAccountId(account))
          .filter(Boolean))]
        : [];
    } catch {
      return [];
    }
  }

  rememberAccount(identifier: string): void {
    const accountId = this.normalizeAccountId(identifier);
    if (!accountId) {
      return;
    }

    const accounts = this.getSavedAccounts().filter((account) => account !== accountId);
    localStorage.setItem(this.savedAccountsStorageKey, JSON.stringify([accountId, ...accounts]));
  }

  forgetAccount(identifier: string): void {
    const accountId = this.normalizeAccountId(identifier);
    const accounts = this.getSavedAccounts().filter((account) => account !== accountId);
    localStorage.setItem(this.savedAccountsStorageKey, JSON.stringify(accounts));
  }

  loadProfile(): AccountProfile | null {
    try {
      const accountId = this.getActiveAccountId();
      const saved = localStorage.getItem(this.getProfileStorageKey(accountId))
        ?? (accountId === this.defaultAccountId ? localStorage.getItem('komyunity-profile') : null);
      if (!saved) {
        return null;
      }

      const profile = JSON.parse(saved) as Partial<AccountProfile>;
      return {
        avatar: typeof profile.avatar === 'string' ? profile.avatar : null,
        bio: typeof profile.bio === 'string' ? profile.bio : '',
        connections: Array.isArray(profile.connections)
          ? profile.connections.filter((connection): connection is string => typeof connection === 'string')
          : [],
        displayName: typeof profile.displayName === 'string' ? profile.displayName : '',
      };
    } catch {
      return null;
    }
  }

  saveProfile(profile: AccountProfile): void {
    localStorage.setItem(this.getProfileStorageKey(this.getActiveAccountId()), JSON.stringify(profile));
  }

  normalizeAccountIdentifier(identifier: string): string {
    return this.normalizeAccountId(identifier);
  }

  private getActiveAccountId(): string {
    return localStorage.getItem(this.activeAccountStorageKey) ?? this.defaultAccountId;
  }

  private getProfileStorageKey(accountId: string): string {
    return `komyunity-profile:${encodeURIComponent(accountId)}`;
  }

  private normalizeAccountId(identifier: string): string {
    const normalized = identifier.trim().toLocaleLowerCase();
    return normalized.includes('@') ? normalized : normalized.replace(/[^0-9+]/g, '') || normalized;
  }
}