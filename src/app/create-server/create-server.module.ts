import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { CreateServerPageRoutingModule } from './create-server-routing.module';
import { AddServerFriendsPage, CreateServerPage, ServerInvitePage } from './create-server.page';

@NgModule({
  imports: [IonicModule, CommonModule, FormsModule, CreateServerPageRoutingModule],
  declarations: [CreateServerPage, AddServerFriendsPage, ServerInvitePage],
})
export class CreateServerPageModule {}
