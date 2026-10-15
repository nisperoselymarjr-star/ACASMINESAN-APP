import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'create-server',
    loadChildren: () => import('./create-server/create-server.module').then(m => m.CreateServerPageModule)
  },
  {
    path: 'add-friends',
    loadChildren: () => import('./add-friends/add-friends.module').then(m => m.AddFriendsPageModule)
  },
  {
    path: 'profile-picture-editor',
    loadChildren: () => import('./profile-picture-editor/profile-picture-editor.module').then(m => m.ProfilePictureEditorPageModule)
  },
  {
    path: 'create-account',
    loadChildren: () => import('./tabs/signup/signup.module').then(m => m.SignupPageModule)
  },
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
