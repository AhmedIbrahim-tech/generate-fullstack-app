import path from 'node:path';
import { describeField } from './field-view.js';
import { getFrontendFilePath } from '../../../utils/project-paths.js';

/**
 * Plan the Next.js App Router files that wrap a React feature module.
 * @param {object} config
 * @returns {{ relativePath: string, contents: string }[]}
 */
export function planNextFeatureFiles(config) {
  const {
    singularName: Singular,
    pluralName: Plural,
    camelName: camel,
    kebabPluralName: kebabPlural,
  } = config.feature;
  const ops = config.operations;
  const surface = config.surface ?? { dashboard: true, public: false };

  /** @type {{ relativePath: string, contents: string }[]} */
  const files = [];

  if (surface.dashboard) {
    const dashBase = (...segments) =>
      getFrontendFilePath(config, 'src', 'app', '(dashboard)', 'dashboard', kebabPlural, ...segments);

    files.push({
      relativePath: dashBase('page.tsx'),
      contents: `export { default } from "@/modules/${kebabPlural}/pages/${Plural}Page";
`,
    });

    if (ops.create) {
      files.push({
        relativePath: dashBase('create', 'page.tsx'),
        contents: `export { default } from "@/modules/${kebabPlural}/pages/Create${Singular}Page";
`,
      });
    }

    if (ops.update) {
      files.push({
        relativePath: dashBase('[id]', 'edit', 'page.tsx'),
        contents: `export { default } from "@/modules/${kebabPlural}/pages/Edit${Singular}Page";
`,
      });
    }
  }

  if (surface.public) {
    const publicBase = (...segments) =>
      getFrontendFilePath(config, 'src', 'app', '(website)', kebabPlural, ...segments);
    const moduleBase = (...segments) =>
      getFrontendFilePath(config, 'src', 'modules', kebabPlural, ...segments);

    files.push({
      relativePath: moduleBase('services', `${camel}.server.service.ts`),
      contents: renderServerService(config),
    });

    files.push({
      relativePath: publicBase('page.tsx'),
      contents: renderPublicListPage(config),
    });

    if (ops.getById) {
      files.push({
        relativePath: publicBase('[id]', 'page.tsx'),
        contents: renderPublicDetailPage(config),
      });
    }
  }

  return files;
}

/**
 * @param {object} config
 */
function renderServerService(config) {
  const {
    singularName: Singular,
    camelName: camel,
  } = config.feature;
  const ops = config.operations;

  /** @type {string[]} */
  const typeImports = [Singular];
  if (ops.search || ops.list) {
    typeImports.push(`${Singular}SearchRequest`);
  }

  /** @type {string[]} */
  const methods = [];

  if (ops.search || ops.list) {
    methods.push(`  async search(
    request: ${Singular}SearchRequest,
  ): Promise<PaginationResult<${Singular}>> {
    const result = await serverApi<PaginationResult<${Singular}>>(
      ${camel}ApiRoutes.search,
      {
        method: "POST",
        body: JSON.stringify(request),
      },
    );
    return normalizePagination(result);
  },`);
  }

  if (ops.getById) {
    methods.push(`  async getById(id: string): Promise<${Singular}> {
    return serverApi<${Singular}>(${camel}ApiRoutes.byId(id), {
      method: "GET",
    });
  },`);
  }

  const paginationImport =
    ops.search || ops.list
      ? `import {
  normalizePagination,
  type PaginationResult,
} from "@/shared/state/pagination/pagination.types";
`
      : '';

  return `import { serverApi } from "@/lib/api/server-api";
${paginationImport}import { ${camel}ApiRoutes } from "./${camel}.routes";
import type {
  ${typeImports.join(',\n  ')},
} from "../types/${camel}.types";

export const ${camel}ServerService = {
${methods.join('\n\n')}
};
`;
}

/**
 * @param {object} config
 */
function renderPublicListPage(config) {
  const {
    singularName: Singular,
    pluralName: Plural,
    camelName: camel,
    kebabPluralName: kebabPlural,
  } = config.feature;
  const enPlural = config.labels?.enPlural ?? Plural;
  const fields = (config.fields ?? []).slice(0, 3).map((field) => describeField(field));
  const ops = config.operations;

  const cells = fields
    .map(
      (field) =>
        `            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">${field.publicLabel}</dt>
              <dd className="mt-1 text-sm text-zinc-900">
                ${field.publicValue}
              </dd>
            </div>`,
    )
    .join('\n');

  const detailLink = ops.getById
    ? `          <a
            href={\`/${kebabPlural}/\${item.id}\`}
            className="mt-4 inline-block text-sm text-zinc-900 underline"
          >
            View details
          </a>`
    : '';

  const loadCall =
    ops.search || ops.list
      ? `  const result = await ${camel}ServerService.search({
    page: 1,
    pageSize: 20,
  });
  const items = result.data;`
      : `  const items: ${Singular}[] = [];`;

  const enumOptionConsts = Array.from(
    new Set(fields.map((field) => field.publicNeedsOptions).filter(Boolean)),
  );
  const enumOptionImport =
    enumOptionConsts.length > 0
      ? `import { ${enumOptionConsts.join(', ')} } from "@/modules/${kebabPlural}/types/${camel}.types";\n`
      : '';

  const typeImport = !(ops.search || ops.list)
    ? `import type { ${Singular} } from "@/modules/${kebabPlural}/types/${camel}.types";\n`
    : '';

  return `import Link from "next/link";
import { ${camel}ServerService } from "@/modules/${kebabPlural}/services/${camel}.server.service";
${enumOptionImport}${typeImport}
export default async function ${Plural}PublicPage() {
${loadCall}

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-16">
      <header>
        <p className="text-sm text-zinc-500">
          <Link href="/" className="underline">
            Home
          </Link>
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-zinc-900">${enPlural}</h1>
        <p className="mt-2 text-zinc-600">
          Browse published ${enPlural.toLowerCase()}.
        </p>
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-600">No ${enPlural.toLowerCase()} available.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-b border-zinc-200 pb-4 last:border-b-0"
            >
              <dl className="grid gap-3 sm:grid-cols-3">
${cells}
              </dl>
${detailLink}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
`;
}

/**
 * @param {object} config
 */
function renderPublicDetailPage(config) {
  const {
    singularName: Singular,
    camelName: camel,
    kebabPluralName: kebabPlural,
  } = config.feature;
  const enSingular = config.labels?.enSingular ?? Singular;
  const enPlural = config.labels?.enPlural ?? config.feature.pluralName;
  const fields = (config.fields ?? []).map((field) => describeField(field));

  const rows = fields
    .map(
      (field) =>
        `        <div>
          <dt className="text-sm text-zinc-500">${field.publicLabel}</dt>
          <dd className="mt-1 text-base text-zinc-900">
            ${field.publicValue}
          </dd>
        </div>`,
    )
    .join('\n');

  const enumOptionConsts = Array.from(
    new Set(fields.map((field) => field.publicNeedsOptions).filter(Boolean)),
  );
  const enumOptionImport =
    enumOptionConsts.length > 0
      ? `import { ${enumOptionConsts.join(', ')} } from "@/modules/${kebabPlural}/types/${camel}.types";\n`
      : '';

  return `import Link from "next/link";
import { notFound } from "next/navigation";
import { ${camel}ServerService } from "@/modules/${kebabPlural}/services/${camel}.server.service";
${enumOptionImport}
type ${Singular}DetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ${Singular}PublicDetailPage({
  params,
}: ${Singular}DetailPageProps) {
  const { id } = await params;

  const item = await ${camel}ServerService.getById(id).catch(() => null);

  if (!item) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header>
        <p className="text-sm text-zinc-500">
          <Link href="/${kebabPlural}" className="underline">
            ${enPlural}
          </Link>
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-zinc-900">${enSingular}</h1>
      </header>

      <dl className="flex flex-col gap-4">
${rows}
        <div>
          <dt className="text-sm text-zinc-500">Created</dt>
          <dd className="mt-1 text-base text-zinc-900">{item.createdAtUtc}</dd>
        </div>
      </dl>
    </main>
  );
}
`;
}
