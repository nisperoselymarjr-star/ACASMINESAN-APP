import { TestBed } from '@angular/core/testing';
import { AccountAuthenticationService } from './account-authentication.service';
import { AccountProfileStoreService } from './account-profile-store.service';

describe('AccountAuthenticationService', () => {
  let service: AccountAuthenticationService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [AccountAuthenticationService, AccountProfileStoreService] });
    service = TestBed.inject(AccountAuthenticationService);
  });

  it('accepts the registered password and rejects a different password', async () => {
    const registered = await service.registerPassword('person@example.com', 'correct-password');

    expect(registered).toBe(true);
    await expect(service.verifyPassword('PERSON@example.com', 'correct-password')).resolves.toBe(true);
    await expect(service.verifyPassword('person@example.com', 'wrong-password')).resolves.toBe(false);
    expect(localStorage.getItem('komyunity-password-credentials')).not.toContain('correct-password');
  });
});
