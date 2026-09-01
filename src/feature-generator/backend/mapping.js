import { isAutoMapper } from '../feature-profile.js';
import { groupFields } from '../fields/field-mappers.js';

/**
 * @param {object} config
 */
export function mappingUsing(config) {
  return isAutoMapper(config) ? 'using AutoMapper;\n' : '';
}

/**
 * @param {object} config
 */
export function mappingFields(config) {
  return isAutoMapper(config) ? '\n    private readonly IMapper _mapper;' : '';
}

/**
 * @param {object} config
 */
export function mappingCtorParam(config) {
  return isAutoMapper(config) ? ', IMapper mapper' : '';
}

/**
 * @param {object} config
 */
export function mappingCtorAssign(config) {
  return isAutoMapper(config) ? '\n        _mapper = mapper;' : '';
}

/**
 * @param {object} config
 * @param {string} entityExpr
 */
export function toDtoCall(config, entityExpr) {
  const singular = config.feature.singularName;
  return isAutoMapper(config)
    ? `_mapper.Map<${singular}Dto>(${entityExpr})`
    : `${singular}Mappings.ToDto(${entityExpr})`;
}

/**
 * @param {object} config
 * @param {string} listExpr
 */
export function toDtoListCall(config, listExpr) {
  const singular = config.feature.singularName;
  return isAutoMapper(config)
    ? `_mapper.Map<List<${singular}Dto>>(${listExpr})`
    : `${listExpr}.Select(${singular}Mappings.ToDto).ToList()`;
}

/**
 * @param {object} config
 */
export function renderAutoMapperProfile(config) {
  const { singularName, pluralName } = config.feature;
  const ns = config.projectName;
  const groups = groupFields(config.fields);

  /** @type {string[]} */
  const members = [];

  for (const field of groups.toOne) {
    const fallback = field.nullable ? 'null' : 'string.Empty';
    members.push(
      `            .ForMember(dto => dto.${field.displayName}, opt => opt.MapFrom(entity => entity.${field.name} != null ? entity.${field.name}.${field.display} : ${fallback}))`,
    );
  }

  for (const field of groups.toMany) {
    members.push(
      `            .ForMember(dto => dto.${field.commandIdsName}, opt => opt.MapFrom(entity => entity.${field.collectionName}.Select(item => item.Id).ToList()))`,
    );
    members.push(
      `            .ForMember(dto => dto.${field.collectionName}, opt => opt.MapFrom(entity => entity.${field.collectionName}.Select(item => new LookupItemDto { Id = item.Id, DisplayName = item.${field.display} }).ToList()))`,
    );
  }

  for (const field of groups.mediaMultiple) {
    members.push(
      `            .ForMember(dto => dto.${field.commandIdsName}, opt => opt.MapFrom(entity => entity.${field.collectionName}.Select(item => item.Id).ToList()))`,
    );
  }

  members.push(
    `            .ForMember(dto => dto.RowVersion, opt => opt.MapFrom(entity => Convert.ToBase64String(entity.RowVersion)))`,
  );

  const usings = [
    'using AutoMapper;',
    `using ${ns}.Domain.Entities;`,
  ];
  if (groups.toMany.length > 0) {
    usings.push(`using ${ns}.Application.Common.Models;`);
  }

  return `${usings.join('\n')}

namespace ${ns}.Application.Features.${pluralName}.Common;

public sealed class ${singularName}MappingProfile : Profile
{
    public ${singularName}MappingProfile()
    {
        CreateMap<${singularName}, ${singularName}Dto>()
${members.join('\n')};
    }
}
`;
}
