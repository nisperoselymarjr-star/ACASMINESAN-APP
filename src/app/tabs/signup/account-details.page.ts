import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountAuthenticationService } from '../../account-authentication.service';
import { AccountProfileStoreService } from '../../account-profile-store.service';

@Component({
  selector: 'app-account-details',
  templateUrl: 'account-details.page.html',
  styleUrls: ['account-details.page.scss'],
  standalone: false,
})
export class AccountDetailsPage {
  username = '';
  password = '';
  contact = '';
  errorMessage = '';
  isSubmitting = false;
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly accountAuthentication = inject(AccountAuthenticationService);
  private readonly accountProfiles = inject(AccountProfileStoreService);

  constructor() {
    const state = this.location.getState() as { contact?: unknown };
    this.contact = typeof state.contact === 'string' ? state.contact : '';
  }

  goBack(): void {
    this.router.navigateByUrl('/create-account');
  }

  async createAccount(form: NgForm): Promise<void> {
    if (form.invalid || this.isSubmitting) {
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;
    const accountIdentifier = this.contact || this.username;
    try {
      const registered = await this.accountAuthentication.registerPassword(accountIdentifier, this.password);
      if (!registered) {
        this.errorMessage = 'An account with this email or phone number already exists on this device.';
        return;
      }

      this.accountProfiles.rememberAccount(accountIdentifier);
      this.accountProfiles.setActiveAccount(accountIdentifier);
      const profile = this.accountProfiles.loadProfile();
      this.accountProfiles.saveProfile({
        avatar: profile?.avatar ?? null,
        bio: profile?.bio ?? '',
        connections: profile?.connections ?? [],
        displayName: this.username.trim() || profile?.displayName || accountIdentifier,
      });
      await this.router.navigateByUrl('/home');
    } catch {
      this.errorMessage = 'Unable to create your account right now. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }
}