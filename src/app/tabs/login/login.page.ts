import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountAuthenticationService } from '../../account-authentication.service';
import { AccountProfileStoreService } from '../../account-profile-store.service';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: false,
})
export class LoginPage {
  identifier = '';
  password = '';
  errorMessage = '';
  isSubmitting = false;
  private readonly router = inject(Router);
  private readonly accountAuthentication = inject(AccountAuthenticationService);
  private readonly accountProfiles = inject(AccountProfileStoreService);
  @ViewChild('passwordInput') private passwordInput?: ElementRef<HTMLInputElement>;
  savedAccounts = this.accountProfiles.getSavedAccounts();

  async logIn(form: NgForm): Promise<void> {
    if (form.invalid || this.isSubmitting) {
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;
    try {
      const isValid = await this.accountAuthentication.verifyPassword(this.identifier, this.password);
      if (!isValid) {
        this.errorMessage = 'Email/phone number or password is incorrect.';
        return;
      }

      this.accountProfiles.rememberAccount(this.identifier);
      this.savedAccounts = this.accountProfiles.getSavedAccounts();
      this.accountProfiles.setActiveAccount(this.identifier);
      await this.router.navigateByUrl('/home');
    } catch {
      this.errorMessage = 'Unable to verify your password right now. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  selectSavedAccount(identifier: string): void {
    this.identifier = identifier;
    this.password = '';
    this.errorMessage = '';
    this.passwordInput?.nativeElement.focus();
  }

  forgetSavedAccount(identifier: string): void {
    this.accountProfiles.forgetAccount(identifier);
    this.savedAccounts = this.accountProfiles.getSavedAccounts();
    if (this.identifier === identifier) {
      this.identifier = '';
      this.password = '';
    }
  }
}
