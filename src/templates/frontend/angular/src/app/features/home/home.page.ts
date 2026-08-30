import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { I18nService } from "../../core/services/i18n.service";

@Component({
  selector: "app-home-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <h1 class="text-3xl font-semibold">{{ i18n.translate("home.title") }}</h1>
      <p class="text-lg text-zinc-600">{{ i18n.translate("home.description") }}</p>
      <a routerLink="/examples" class="underline">Example module</a>
    </main>
  `,
})
export class HomePageComponent {
  readonly i18n = inject(I18nService);
}
