import { Component, input } from "@angular/core";
import { Example } from "../models/example.model";

@Component({
  selector: "app-example-card",
  standalone: true,
  template: `
    <article class="ui-card">
      <h2 style="margin:0;font-size:1.05rem">{{ example().name }}</h2>
      <p class="ui-note" style="margin-top:0.45rem">{{ example().description }}</p>
    </article>
  `,
})
export class ExampleCardComponent {
  readonly example = input.required<Example>();
}
