import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthState } from '../../core/auth-state/auth-state';
import { CartDrawerState } from '../../core/cart-state/cart-drawer-state';
@Component({ selector:'app-login', standalone:true, imports:[RouterLink], templateUrl:'./login.html', styleUrl:'./login.scss' })
export class Login {
  private readonly auth=inject(AuthState);
  private readonly route=inject(ActivatedRoute);
  private readonly router=inject(Router);
  private readonly drawer=inject(CartDrawerState);
  protected signInDemo():void {
    this.auth.demoLogin();
    const url=this.route.snapshot.queryParamMap.get('returnUrl') || '/shop';
    void this.router.navigateByUrl(url.startsWith('/') && !url.startsWith('//') ? url : '/shop').then(ok=>{if(ok && url === '/cart') this.drawer.show();});
  }
}
