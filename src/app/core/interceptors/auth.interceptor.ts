import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Attaches the candidate Bearer token (stored in sessionStorage after login)
 * to every outgoing API request that doesn't already have an Authorization header.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = sessionStorage.getItem('authToken');

  if (token && !req.headers.has('Authorization')) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req);
};
