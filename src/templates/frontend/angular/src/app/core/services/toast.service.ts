import { Injectable, signal } from "@angular/core";

export type ToastType = "success" | "error" | "info";

export type ToastMessage = {
  id: string;
  type: ToastType;
  text: string;
};

@Injectable({ providedIn: "root" })
export class ToastService {
  readonly messages = signal<ToastMessage[]>([]);

  success(text: string) {
    this.push("success", text);
  }

  error(text: string) {
    this.push("error", text);
  }

  info(text: string) {
    this.push("info", text);
  }

  dismiss(id: string) {
    this.messages.update((items) => items.filter((item) => item.id !== id));
  }

  private push(type: ToastType, text: string) {
    const id = crypto.randomUUID();
    this.messages.update((items) => [...items, { id, type, text }]);
    window.setTimeout(() => this.dismiss(id), 4000);
  }
}
