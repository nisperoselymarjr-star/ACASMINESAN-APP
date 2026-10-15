import { Component, inject } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  templateUrl: 'signup.page.html',
  styleUrls: ['signup.page.scss'],
  standalone: false,
})
export class SignupPage {
  verificationMethod: 'phone' | 'email' = 'phone';
  contactValue = '';
  private readonly router = inject(Router);

  goBack(): void {
    this.router.navigateByUrl('/tabs/splash');
  }

  continueToDetails(form: NgForm): void {
    if (form.invalid) {
      return;
    }

    this.router.navigateByUrl('/create-account/details', { state: { contact: this.contactValue.trim() } });
  }
}
