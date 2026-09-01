import { Component, input, output } from "@angular/core";

@Component({
  selector: "app-confirm-dialog",
  standalone: true,
  template: `
    @if (open()) {
      <div class="ui-dialog-backdrop" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId">
        <div class="ui-dialog">
          <h2 [id]="titleId">{{ title() }}</h2>
          <p>{{ message() }}</p>
          <div class="ui-dialog-actions">
            <button type="button" class="ui-btn ui-btn-ghost" (click)="cancel.emit()">
              {{ cancelLabel() }}
            </button>
            <button type="button" class="ui-btn ui-btn-danger" (click)="confirm.emit()">
              {{ confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly titleId = "confirm-dialog-title";
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input("Confirm");
  readonly cancelLabel = input("Cancel");
  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
