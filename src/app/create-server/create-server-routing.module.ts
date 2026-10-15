import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddServerFriendsPage, CreateServerPage, ServerInvitePage } from './create-server.page';

const routes: Routes = [
  {
    path: 'share',
    component: ServerInvitePage,
  },
  {
    path: 'invite',
    component: AddServerFriendsPage,
  },
  {
    path: '',
    component: CreateServerPage,
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CreateServerPageRoutingModule {}
