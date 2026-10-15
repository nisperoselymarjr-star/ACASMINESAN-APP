import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { HomePageRoutingModule } from './home-routing.module';
import { HomePage } from './home.page';

@NgModule({
  imports: [IonicModule, CommonModule, FormsModule, HomePageRoutingModule],
  declarations: [HomePage],
})
export class HomePageModule {}
