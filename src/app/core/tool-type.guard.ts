import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isValidToolType } from './tool/tool-registry';

export const toolTypeGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const toolType = route.paramMap.get('toolType');

  if (toolType && isValidToolType(toolType)) {
    return true;
  }

  return router.parseUrl('/');
};
