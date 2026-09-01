import path from 'node:path';
import {
  finalizePlan,
  paths,
  isReact,
  isAngular,
  moduleRegistrationFile,
} from '../modules-orchestrator-helpers.js';

/**
 * @param {object} config
 */
export function planRichTextModule(config) {
  const ns = config.projectName;
  /** @type {{ relativePath: string, contents: string, writeMode?: string }[]} */
  const files = [];
  /** @type {{ method: string, namespace: string }[]} */
  const registrations = [];

  files.push({
    relativePath: paths.application('Abstractions', 'Content', 'IContentDocumentProcessor.cs'),
    writeMode: 'ifMissing',
    contents: `namespace ${ns}.Application.Abstractions.Content;

public interface IContentDocumentProcessor
{
    ContentValidationResult Validate(string jsonDocument);
    string ExtractPlainText(string jsonDocument);
}

public sealed record ContentValidationResult(bool IsValid, string? ErrorMessage);
`,
  });

  files.push({
    relativePath: paths.application('Content', 'ContentDocumentProcessor.cs'),
    contents: `using System.Text.Json;
using ${ns}.Application.Abstractions.Content;

namespace ${ns}.Application.Content;

public sealed class ContentDocumentProcessor : IContentDocumentProcessor
{
    public const int MaxDocumentChars = 200_000;
    public const int MaxDepth = 32;
    public const int MaxNodes = 5_000;
    public const int MaxPlainTextLength = 50_000;

    public ContentValidationResult Validate(string jsonDocument)
    {
        if (string.IsNullOrWhiteSpace(jsonDocument))
            return new(false, "Document is required.");
        if (jsonDocument.Length > MaxDocumentChars)
            return new(false, "Document exceeds maximum size.");

        try
        {
            using var doc = JsonDocument.Parse(jsonDocument);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
                return new(false, "Document must be a JSON object.");

            if (root.TryGetProperty("attrs", out var attrs) &&
                attrs.TryGetProperty("schemaVersion", out var version) &&
                version.GetString() is string ver &&
                ver != "1.0")
            {
                return new(false, "Unsupported schema version.");
            }

            var nodes = 0;
            if (!Walk(root, 0, ref nodes, out var error))
                return new(false, error);

            var plain = ExtractPlainText(jsonDocument);
            if (plain.Length > MaxPlainTextLength)
                return new(false, "Plain text exceeds maximum length.");

            return new(true, null);
        }
        catch (JsonException)
        {
            return new(false, "Document is not valid JSON.");
        }
    }

    public string ExtractPlainText(string jsonDocument)
    {
        try
        {
            using var doc = JsonDocument.Parse(jsonDocument);
            var parts = new List<string>();
            CollectText(doc.RootElement, parts);
            return string.Join(' ', parts);
        }
        catch
        {
            return string.Empty;
        }
    }

    private static bool Walk(JsonElement element, int depth, ref int nodes, out string? error)
    {
        error = null;
        if (depth > MaxDepth) { error = "Document exceeds maximum depth."; return false; }
        nodes += 1;
        if (nodes > MaxNodes) { error = "Document exceeds maximum node count."; return false; }

        if (element.ValueKind == JsonValueKind.Object)
        {
            if (element.TryGetProperty("marks", out var marks) && marks.ValueKind == JsonValueKind.Array)
            {
                foreach (var mark in marks.EnumerateArray())
                {
                    if (mark.TryGetProperty("type", out var type) && type.GetString() == "link")
                    {
                        if (mark.TryGetProperty("attrs", out var attrs) &&
                            attrs.TryGetProperty("href", out var href))
                        {
                            var url = href.GetString() ?? "";
                            if (url.StartsWith("javascript:", StringComparison.OrdinalIgnoreCase))
                            {
                                error = "Dangerous link scheme rejected.";
                                return false;
                            }
                        }
                    }
                }
            }

            if (element.TryGetProperty("content", out var content) && content.ValueKind == JsonValueKind.Array)
            {
                foreach (var child in content.EnumerateArray())
                {
                    if (!Walk(child, depth + 1, ref nodes, out error)) return false;
                }
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var child in element.EnumerateArray())
            {
                if (!Walk(child, depth + 1, ref nodes, out error)) return false;
            }
        }

        return true;
    }

    private static void CollectText(JsonElement element, List<string> parts)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            if (element.TryGetProperty("text", out var text) && text.ValueKind == JsonValueKind.String)
                parts.Add(text.GetString() ?? "");
            if (element.TryGetProperty("content", out var content) && content.ValueKind == JsonValueKind.Array)
            {
                foreach (var child in content.EnumerateArray())
                    CollectText(child, parts);
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var child in element.EnumerateArray())
                CollectText(child, parts);
        }
    }
}
`,
  });

  const { file: registrationFile, registration } = moduleRegistrationFile({
    projectName: ns,
    moduleName: 'RichText',
    usings: [
      `using ${ns}.Application.Abstractions.Content;`,
      `using ${ns}.Application.Content;`,
    ],
    body: [
      '        services.AddSingleton<IContentDocumentProcessor, ContentDocumentProcessor>();',
    ],
  });
  files.push(registrationFile);
  registrations.push(registration);

  if (isReact(config)) {
    files.push({
      relativePath: paths.client('shared', 'components', 'rich-text', 'RichTextRenderer.tsx'),
      writeMode: 'ifMissing',
      contents: `"use client";

type TipTapNode = {
  type?: string;
  text?: string;
  content?: TipTapNode[];
  marks?: { type: string; attrs?: { href?: string } }[];
};

function safeHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  if (/^javascript:/i.test(href)) return undefined;
  if (/^(https?:|mailto:|\\/)/i.test(href)) return href;
  return undefined;
}

function renderNode(node: TipTapNode, key: number): React.ReactNode {
  if (node.type === "text") {
    let el: React.ReactNode = node.text ?? "";
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") el = <strong key={\`b-\${key}\`}>{el}</strong>;
      if (mark.type === "italic") el = <em key={\`i-\${key}\`}>{el}</em>;
      if (mark.type === "link") {
        const href = safeHref(mark.attrs?.href);
        el = href ? (
          <a key={\`a-\${key}\`} href={href} className="underline text-zinc-900" rel="noopener noreferrer">
            {el}
          </a>
        ) : (
          el
        );
      }
    }
    return <span key={key}>{el}</span>;
  }

  const children = (node.content ?? []).map((child, index) => renderNode(child, index));
  switch (node.type) {
    case "paragraph":
      return <p key={key} className="mb-3 text-zinc-800">{children}</p>;
    case "heading":
      return <h2 key={key} className="mb-3 text-xl font-semibold text-zinc-900">{children}</h2>;
    case "bulletList":
      return <ul key={key} className="mb-3 list-disc pl-5">{children}</ul>;
    case "orderedList":
      return <ol key={key} className="mb-3 list-decimal pl-5">{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key} className="mb-3 border-l-2 border-zinc-300 pl-3 text-zinc-700">{children}</blockquote>;
    case "horizontalRule":
      return <hr key={key} className="my-4 border-zinc-200" />;
    case "doc":
      return <div key={key}>{children}</div>;
    default:
      return <div key={key}>{children}</div>;
  }
}

export function RichTextRenderer({ documentJson }: { documentJson: string }) {
  try {
    const doc = JSON.parse(documentJson) as TipTapNode;
    return <div className="prose-zinc max-w-none">{renderNode(doc, 0)}</div>;
  } catch {
    return <p className="text-sm text-zinc-500">Unable to render content.</p>;
  }
}
`,
    });

    files.push({
      relativePath: paths.client('shared', 'components', 'rich-text', 'RichTextEditor.tsx'),
      writeMode: 'ifMissing',
      contents: `"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

type RichTextEditorProps = {
  value: string;
  onChange: (json: string) => void;
};

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
    ],
    content: (() => {
      try {
        return value ? JSON.parse(value) : { type: "doc", attrs: { schemaVersion: "1.0" }, content: [] };
      } catch {
        return { type: "doc", attrs: { schemaVersion: "1.0" }, content: [] };
      }
    })(),
    onUpdate: ({ editor: current }) => {
      const json = current.getJSON() as { attrs?: { schemaVersion?: string } };
      if (!json.attrs) json.attrs = {};
      json.attrs.schemaVersion = "1.0";
      onChange(JSON.stringify(json));
    },
  });

  return (
    <div className="rounded-md border border-zinc-300 bg-white">
      <EditorContent editor={editor} className="min-h-[160px] px-3 py-2 text-sm text-zinc-900" />
    </div>
  );
}
`,
    });
  }

  if (isAngular(config)) {
    files.push({
      relativePath: paths.client(
        'app',
        'shared',
        'components',
        'rich-text',
        'rich-text-renderer.component.ts',
      ),
      writeMode: 'ifMissing',
      contents: `import { Component, Input } from "@angular/core";

@Component({
  selector: "app-rich-text-renderer",
  standalone: true,
  template: \`<pre class="whitespace-pre-wrap text-sm text-zinc-800">{{ plain }}</pre>\`,
})
export class RichTextRendererComponent {
  @Input() documentJson = "";

  get plain(): string {
    try {
      const walk = (node: any, parts: string[]) => {
        if (!node) return;
        if (typeof node.text === "string") parts.push(node.text);
        for (const child of node.content ?? []) walk(child, parts);
      };
      const parts: string[] = [];
      walk(JSON.parse(this.documentJson), parts);
      return parts.join(" ");
    } catch {
      return "";
    }
  }
}
`,
    });
  }

  return finalizePlan({
    id: 'rich-text',
    requires: [],
    files,
    registryUpdates: [],
    registrations,
    packages: {
      react: ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-link'],
    },
    notes: [
      'Structured JSON storage only — never raw HTML as primary document.',
      'Angular uses a safe plaintext renderer + JSON fallback editor.',
    ],
  });
}
