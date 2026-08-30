import { Component, input } from "@angular/core";
import { Example } from "../models/example.model";

@Component({
  selector: "app-example-card",
  standalone: true,
  template: `
    <article class="rounded-lg border border-zinc-200 p-4">
      <h2 class="text-lg font-medium">{{ example().name }}</h2>
      <p class="mt-2 text-sm text-zinc-600">{{ example().description }}</p>
    </article>
  `,
})
export class ExampleCardComponent {
  readonly example = input.required<Example>();
}
