import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { AddFriendsPageRoutingModule } from './add-friends-routing.module';
import { AddFriendsPage } from './add-friends.page';

@NgModule({
  imports: [IonicModule, CommonModule, FormsModule, AddFriendsPageRoutingModule],
  declarations: [AddFriendsPage],
})
export class AddFriendsPageModule {}
