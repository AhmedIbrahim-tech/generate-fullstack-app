import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ToastHostComponent } from "./shared/components/toast-host.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, ToastHostComponent],
  template: `
    <app-toast-host />
    <router-outlet />
  `,
})
export class AppComponent {}
