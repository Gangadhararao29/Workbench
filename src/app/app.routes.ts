import { Routes } from '@angular/router';
import { Home } from './home/home';
import { ToolPage } from './tool-page/tool-page';
import { toolTypeGuard } from './core/tool-type.guard';

export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  {
    path: 'tools/:toolType',
    component: ToolPage,
    canActivate: [toolTypeGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
