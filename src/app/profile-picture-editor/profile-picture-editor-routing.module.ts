import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfilePictureEditorPage } from './profile-picture-editor.page';

const routes: Routes = [
  {
    path: '',
    component: ProfilePictureEditorPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProfilePictureEditorPageRoutingModule {}