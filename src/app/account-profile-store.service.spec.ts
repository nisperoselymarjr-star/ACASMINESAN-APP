import { AccountProfileStoreService } from './account-profile-store.service';

describe('AccountProfileStoreService', () => {
  let service: AccountProfileStoreService;

  beforeEach(() => {
    localStorage.clear();
    service = new AccountProfileStoreService();
  });

  it('keeps recently used accounts first and avoids duplicates', () => {
    service.rememberAccount('first@example.com');
    service.rememberAccount('second@example.com');
    service.rememberAccount('FIRST@example.com');

    expect(service.getSavedAccounts()).toEqual(['first@example.com', 'second@example.com']);
  });
});
