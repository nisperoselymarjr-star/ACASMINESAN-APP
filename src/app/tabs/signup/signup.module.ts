import { IonicModule } from '@ionic/angular/lazy';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountDetailsPage } from './account-details.page';
import { SignupPage } from './signup.page';

import { SignupPageRoutingModule } from './signup-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    SignupPageRoutingModule
  ],
  declarations: [SignupPage, AccountDetailsPage]
})
export class SignupPageModule {}
