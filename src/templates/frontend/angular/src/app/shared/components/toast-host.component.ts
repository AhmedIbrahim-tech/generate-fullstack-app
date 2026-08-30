import { Component } from "@angular/core";
import { ToastService } from "../../core/services/toast.service";

@Component({
  selector: "app-toast-host",
  standalone: true,
  template: `
    <div class="fixed top-4 right-4 z-50 flex w-80 flex-col gap-2">
      @for (toast of toasts.messages(); track toast.id) {
        <div
          class="rounded-md border px-3 py-2 text-sm shadow"
          [class.border-red-300]="toast.type === 'error'"
          [class.border-emerald-300]="toast.type === 'success'"
          [class.border-zinc-300]="toast.type === 'info'"
        >
          {{ toast.text }}
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  constructor(readonly toasts: ToastService) {}
}
