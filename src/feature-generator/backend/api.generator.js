import path from 'node:path';
import { canBeLookupTarget } from './lookup.generator.js';

/**
 * @param {object} config
 * @returns {{ relativePath: string, contents: string }[]}
 */
export function planApiFiles(config) {
  const { pluralName } = config.feature;

  return [
    {
      relativePath: path.join('API', 'Routing', `Router.${pluralName}.g.cs`),
      contents: renderRouter(config),
    },
    {
      relativePath: path.join('API', 'Controllers', `${pluralName}Controller.cs`),
      contents: renderController(config),
    },
  ];
}

/**
 * @param {object} config
 */
function renderRouter(config) {
  const { pluralName } = config.feature;
  const ns = config.projectName;
  const ops = config.operations;

  /** @type {string[]} */
  const constants = [
    `        public const string Root = Rule + "/${pluralName}";`,
  ];

  if (ops.search) {
    constants.push(`        public const string Search = Root + "/Search";`);
  }

  if (canBeLookupTarget(config)) {
    constants.push(`        public const string Lookup = Root + "/Lookup";`);
  }

  if (ops.getById) {
    constants.push(`        public const string ById = Root + "/{id:guid}";`);
  }

  if (ops.create) {
    constants.push(`        public const string Create = Root;`);
  }

  if (ops.update) {
    constants.push(`        public const string Update = Root + "/{id:guid}";`);
  }

  if (ops.delete) {
    constants.push(`        public const string Delete = Root + "/{id:guid}";`);
  }

  if (ops.restore) {
    constants.push(
      `        public const string Restore = Root + "/{id:guid}/Restore";`,
    );
  }

  return `namespace ${ns}.API.Routing;

public static partial class Router
{
    public static class ${pluralName}
    {
${constants.join('\n')}
    }
}
`;
}

/**
 * @param {object} config
 */
function renderController(config) {
  const { singularName, pluralName } = config.feature;
  const ns = config.projectName;
  const ops = config.operations;

  /** @type {string[]} */
  const usings = [
    'using MediatR;',
    'using Microsoft.AspNetCore.Mvc;',
    `using ${ns}.API.Routing;`,
  ];

  if (ops.search) {
    usings.push(`using ${ns}.Application.Features.${pluralName}.Search;`);
  }

  if (canBeLookupTarget(config)) {
    usings.push(`using ${ns}.Application.Features.${pluralName}.Lookup;`);
  }

  if (ops.getById) {
    usings.push(`using ${ns}.Application.Features.${pluralName}.GetById;`);
  }

  if (ops.create) {
    usings.push(`using ${ns}.Application.Features.${pluralName}.Create;`);
  }

  if (ops.update) {
    usings.push(`using ${ns}.Application.Features.${pluralName}.Update;`);
  }

  if (ops.delete) {
    usings.push(`using ${ns}.Application.Features.${pluralName}.Delete;`);
  }

  if (ops.restore) {
    usings.push(`using ${ns}.Application.Features.${pluralName}.Restore;`);
  }

  /** @type {string[]} */
  const actions = [];

  if (ops.search) {
    actions.push(`    [HttpPost(Router.${pluralName}.Search)]
    public async Task<IActionResult> Search(
        [FromBody] Search${pluralName}Query query,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(query, cancellationToken);
        return ToActionResult(result);
    }`);
  }

  if (canBeLookupTarget(config)) {
    actions.push(`    [HttpGet(Router.${pluralName}.Lookup)]
    public async Task<IActionResult> Lookup(
        [FromQuery] string? search,
        [FromQuery] int take,
        CancellationToken cancellationToken)
    {
        var query = new Lookup${pluralName}Query(search, take <= 0 ? 50 : take);
        var result = await _sender.Send(query, cancellationToken);
        return ToActionResult(result);
    }`);
  }

  if (ops.getById) {
    actions.push(`    [HttpGet(Router.${pluralName}.ById)]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new Get${singularName}ByIdQuery(id), cancellationToken);
        return ToActionResult(result);
    }`);
  }

  if (ops.create) {
    actions.push(`    [HttpPost(Router.${pluralName}.Create)]
    public async Task<IActionResult> Create(
        [FromBody] Create${singularName}Command command,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(command, cancellationToken);
        return ToCreatedResult(result);
    }`);
  }

  if (ops.update) {
    actions.push(`    [HttpPut(Router.${pluralName}.Update)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] Update${singularName}Command command,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(command with { Id = id }, cancellationToken);
        return ToActionResult(result);
    }`);
  }

  if (ops.delete) {
    actions.push(`    [HttpDelete(Router.${pluralName}.Delete)]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new Delete${singularName}Command(id), cancellationToken);
        return ToActionResult(result);
    }`);
  }

  if (ops.restore) {
    actions.push(`    [HttpPost(Router.${pluralName}.Restore)]
    public async Task<IActionResult> Restore(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new Restore${singularName}Command(id), cancellationToken);
        return ToActionResult(result);
    }`);
  }

  return `${usings.join('\n')}

namespace ${ns}.API.Controllers;

public sealed class ${pluralName}Controller : ApiControllerBase
{
    private readonly ISender _sender;

    public ${pluralName}Controller(ISender sender)
    {
        _sender = sender;
    }

${actions.join('\n\n')}
}
`;
}
