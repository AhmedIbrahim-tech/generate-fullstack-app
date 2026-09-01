import { getFrontendFilePath } from '../../../utils/project-paths.js';

/**
 * Plan the shared Angular form controls and support models used by generated
 * features (relationship lookups, enum selects, and media uploads).
 *
 * Every entry uses `writeMode: 'ifMissing'` so re-running the feature generator
 * never clobbers a shared control the user may have customised.
 *
 * @param {object} [config]
 * @returns {{ relativePath: string, contents: string, writeMode: 'ifMissing' }[]}
 */
export function planSharedAngularControls(config = {}) {
  const formsDir = (...segments) =>
    getFrontendFilePath(config, 'src', 'app', 'shared', 'components', 'forms', ...segments);
  const modelsDir = (...segments) =>
    getFrontendFilePath(config, 'src', 'app', 'shared', 'models', ...segments);

  return [
    {
      relativePath: modelsDir('lookup.model.ts'),
      contents: renderLookupModel(),
      writeMode: 'ifMissing',
    },
    {
      relativePath: modelsDir('stored-file.model.ts'),
      contents: renderStoredFileModel(),
      writeMode: 'ifMissing',
    },
    {
      relativePath: formsDir('lookup-select.component.ts'),
      contents: renderLookupSelect(),
      writeMode: 'ifMissing',
    },
    {
      relativePath: formsDir('multi-lookup-select.component.ts'),
      contents: renderMultiLookupSelect(),
      writeMode: 'ifMissing',
    },
    {
      relativePath: formsDir('enum-select.component.ts'),
      contents: renderEnumSelect(),
      writeMode: 'ifMissing',
    },
    {
      relativePath: formsDir('file-upload-field.component.ts'),
      contents: renderFileUploadField(),
      writeMode: 'ifMissing',
    },
    {
      relativePath: formsDir('image-upload-field.component.ts'),
      contents: renderImageUploadField(),
      writeMode: 'ifMissing',
    },
  ];
}

function renderLookupModel() {
  return `export type LookupOption = {
  value: string;
  label: string;
};
`;
}

function renderStoredFileModel() {
  return `export type StoredFile = {
  id: string;
  fileName: string;
  url: string;
  contentType: string;
  size: number;
};
`;
}

function renderLookupSelect() {
  return `import { Component, forwardRef, input, signal } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import type { LookupOption } from "../../models/lookup.model";

@Component({
  selector: "app-lookup-select",
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LookupSelectComponent),
      multi: true,
    },
  ],
  template: \`
    <select
      class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 disabled:opacity-60"
      [value]="value() ?? ''"
      [disabled]="disabled()"
      (change)="handleChange($any($event.target).value)"
      (blur)="handleBlur()"
    >
      <option value="">{{ placeholder() }}</option>
      @for (option of options(); track option.value) {
        <option [value]="option.value">{{ option.label }}</option>
      }
    </select>
  \`,
})
export class LookupSelectComponent implements ControlValueAccessor {
  readonly options = input<LookupOption[]>([]);
  readonly placeholder = input<string>("Select...");

  protected readonly value = signal<string | null>(null);
  protected readonly disabled = signal(false);

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected handleChange(raw: string): void {
    const next = raw ? raw : null;
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
  }

  protected handleBlur(): void {
    this.onTouched();
  }
}
`;
}

function renderMultiLookupSelect() {
  return `import { Component, forwardRef, input, signal } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import type { LookupOption } from "../../models/lookup.model";

@Component({
  selector: "app-multi-lookup-select",
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiLookupSelectComponent),
      multi: true,
    },
  ],
  template: \`
    <div class="flex flex-col gap-2 rounded-md border border-zinc-300 bg-white p-3">
      @if (options().length === 0) {
        <p class="text-sm text-zinc-500">No options available.</p>
      }
      @for (option of options(); track option.value) {
        <label class="flex items-center gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-zinc-300"
            [checked]="isSelected(option.value)"
            [disabled]="disabled()"
            (change)="toggle(option.value, $any($event.target).checked)"
          />
          {{ option.label }}
        </label>
      }
    </div>
  \`,
})
export class MultiLookupSelectComponent implements ControlValueAccessor {
  readonly options = input<LookupOption[]>([]);

  protected readonly selected = signal<string[]>([]);
  protected readonly disabled = signal(false);

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string[] | null): void {
    this.selected.set(value ?? []);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected isSelected(value: string): boolean {
    return this.selected().includes(value);
  }

  protected toggle(value: string, checked: boolean): void {
    const set = new Set(this.selected());
    if (checked) {
      set.add(value);
    } else {
      set.delete(value);
    }
    const next = Array.from(set);
    this.selected.set(next);
    this.onChange(next);
    this.onTouched();
  }
}
`;
}

function renderEnumSelect() {
  return `import { Component, forwardRef, input, signal } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import type { LookupOption } from "../../models/lookup.model";

@Component({
  selector: "app-enum-select",
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EnumSelectComponent),
      multi: true,
    },
  ],
  template: \`
    <select
      class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 disabled:opacity-60"
      [value]="value() ?? ''"
      [disabled]="disabled()"
      (change)="handleChange($any($event.target).value)"
      (blur)="handleBlur()"
    >
      <option value="">{{ placeholder() }}</option>
      @for (option of options(); track option.value) {
        <option [value]="option.value">{{ option.label }}</option>
      }
    </select>
  \`,
})
export class EnumSelectComponent implements ControlValueAccessor {
  readonly options = input<LookupOption[]>([]);
  readonly placeholder = input<string>("Select...");

  protected readonly value = signal<string | null>(null);
  protected readonly disabled = signal(false);

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected handleChange(raw: string): void {
    const next = raw ? raw : null;
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
  }

  protected handleBlur(): void {
    this.onTouched();
  }
}
`;
}

function renderFileUploadField() {
  return `import { HttpClient } from "@angular/common/http";
import { Component, forwardRef, inject, input, signal } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import type { StoredFile } from "../../models/stored-file.model";

const FILES_ENDPOINT = "/api/v1/Files";

@Component({
  selector: "app-file-upload-field",
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileUploadFieldComponent),
      multi: true,
    },
  ],
  template: \`
    <div class="flex flex-col gap-2">
      <input
        type="file"
        class="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:text-white"
        [accept]="accept()"
        [disabled]="disabled() || uploading()"
        (change)="onFileSelected($event)"
        (blur)="handleBlur()"
      />
      @if (uploading()) {
        <p class="text-sm text-zinc-500">Uploading...</p>
      } @else if (fileName(); as name) {
        <p class="text-sm text-zinc-600">Uploaded: {{ name }}</p>
      }
    </div>
  \`,
})
export class FileUploadFieldComponent implements ControlValueAccessor {
  readonly accept = input<string>("*/*");

  private readonly http = inject(HttpClient);

  protected readonly value = signal<string | null>(null);
  protected readonly fileName = signal<string | null>(null);
  protected readonly uploading = signal(false);
  protected readonly disabled = signal(false);

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected handleBlur(): void {
    this.onTouched();
  }

  protected onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    this.uploading.set(true);

    this.http.post<StoredFile>(FILES_ENDPOINT, formData).subscribe({
      next: (stored) => {
        this.value.set(stored.id);
        this.fileName.set(stored.fileName);
        this.uploading.set(false);
        this.onChange(stored.id);
        this.onTouched();
      },
      error: () => {
        this.uploading.set(false);
      },
    });
  }
}
`;
}

function renderImageUploadField() {
  return `import { HttpClient } from "@angular/common/http";
import { Component, forwardRef, inject, input, signal } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import type { StoredFile } from "../../models/stored-file.model";

const FILES_ENDPOINT = "/api/v1/Files";

@Component({
  selector: "app-image-upload-field",
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImageUploadFieldComponent),
      multi: true,
    },
  ],
  template: \`
    <div class="flex flex-col gap-3">
      @if (previewUrl(); as url) {
        <img
          [src]="url"
          alt="Preview"
          class="h-32 w-32 rounded-md border border-zinc-200 object-cover"
        />
      }
      <input
        type="file"
        accept="image/*"
        class="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:text-white"
        [disabled]="disabled() || uploading()"
        (change)="onFileSelected($event)"
        (blur)="handleBlur()"
      />
      @if (uploading()) {
        <p class="text-sm text-zinc-500">Uploading...</p>
      }
    </div>
  \`,
})
export class ImageUploadFieldComponent implements ControlValueAccessor {
  private readonly http = inject(HttpClient);

  protected readonly value = signal<string | null>(null);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly uploading = signal(false);
  protected readonly disabled = signal(false);

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected handleBlur(): void {
    this.onTouched();
  }

  protected onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    this.uploading.set(true);

    this.http.post<StoredFile>(FILES_ENDPOINT, formData).subscribe({
      next: (stored) => {
        this.value.set(stored.id);
        this.previewUrl.set(stored.url);
        this.uploading.set(false);
        this.onChange(stored.id);
        this.onTouched();
      },
      error: () => {
        this.uploading.set(false);
      },
    });
  }
}
`;
}
