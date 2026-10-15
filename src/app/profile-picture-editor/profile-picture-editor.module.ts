import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { ProfilePictureEditorPageRoutingModule } from './profile-picture-editor-routing.module';
import { ProfilePictureEditorPage } from './profile-picture-editor.page';

@NgModule({
  imports: [IonicModule, CommonModule, FormsModule, ProfilePictureEditorPageRoutingModule],
  declarations: [ProfilePictureEditorPage],
})
export class ProfilePictureEditorPageModule {}