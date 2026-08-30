import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveFeatureNames, pluralizeWord, pluralizePascal } from '../src/feature-generator/utils/feature-naming.js';
import { parseFieldFlag } from '../src/feature-generator/fields/field-parser.js';
import { normalizeField, toCSharpType, toTypeScriptType } from '../src/feature-generator/fields/field-types.js';
import { validateDeleteBehavior, buildForeignKeyName, validateTargetExists } from '../src/feature-generator/fields/relationship.js';
import { resolveFrontendStrategy } from '../src/feature-generator/utils/manifest.js';
import { validateFeatureName } from '../src/feature-generator/utils/safe-generation.js';

test('pluralize ProductCategory → ProductCategories', () => {
  assert.equal(pluralizePascal('ProductCategory'), 'ProductCategories');
  const names = deriveFeatureNames('ProductCategory');
  assert.equal(names.pluralName, 'ProductCategories');
  assert.equal(names.camelName, 'productCategory');
  assert.equal(names.kebabPluralName, 'product-categories');
});

test('pluralize irregular and simple words', () => {
  assert.equal(pluralizeWord('Person'), 'People');
  assert.equal(pluralizeWord('Box'), 'Boxes');
  assert.equal(pluralizePascal('Tag'), 'Tags');
});

test('parse scalar field flag', () => {
  const field = parseFieldFlag('Name:string:required:max=200');
  assert.equal(field.kind, 'scalar');
  assert.equal(field.maxLength, 200);
});

test('parse relationship field flag', () => {
  const field = parseFieldFlag(
    'Category:relationship:target=Category:type=many-to-one:required:display=Name',
  );
  assert.equal(field.kind, 'relationship');
  assert.equal(field.target, 'Category');
  assert.equal(field.relationshipType, 'many-to-one');
  assert.equal(field.foreignKeyName, 'CategoryId');
});

test('parse enum field flag', () => {
  const field = parseFieldFlag(
    'Status:enum:name=ProductStatus:values=Draft|Active|Archived:required',
  );
  assert.equal(field.kind, 'enum');
  assert.equal(field.enumName, 'ProductStatus');
  assert.deepEqual(field.enumValues, ['Draft', 'Active', 'Archived']);
});

test('parse image fields', () => {
  const single = parseFieldFlag('CoverImage:image:single');
  assert.equal(single.cardinality, 'single');
  assert.equal(single.foreignKeyName, 'CoverImageId');

  const multi = parseFieldFlag('Gallery:image:multiple:max-files=8');
  assert.equal(multi.cardinality, 'multiple');
  assert.equal(multi.maxFiles, 8);
});

test('reject dangerous field tokens', () => {
  assert.throws(() => parseFieldFlag('Bad:string:eval'), /disallowed/i);
});

test('delete behavior validation', () => {
  assert.equal(validateDeleteBehavior('restrict'), 'Restrict');
  assert.throws(() => validateDeleteBehavior('explode'));
});

test('FK naming', () => {
  assert.equal(buildForeignKeyName('Category'), 'CategoryId');
});

test('target exists in manifest', () => {
  const manifest = {
    features: {
      categories: { entity: 'Category', plural: 'Categories' },
    },
  };
  assert.equal(validateTargetExists(manifest, 'Category').ok, true);
  assert.equal(validateTargetExists(manifest, 'Brand').ok, false);
});

test('type mapping', () => {
  const decimal = normalizeField({ name: 'Price', type: 'decimal', required: true, minimum: 0 });
  assert.equal(toCSharpType(decimal), 'decimal');
  assert.equal(toTypeScriptType(decimal), 'number');

  const guid = normalizeField({ name: 'ExternalId', type: 'Guid', required: true });
  assert.equal(toTypeScriptType(guid), 'string');
});

test('frontend strategy selection', () => {
  assert.deepEqual(
    resolveFrontendStrategy({ frontend: { library: 'react', framework: 'next' } }),
    { library: 'react', framework: 'next' },
  );
  assert.deepEqual(
    resolveFrontendStrategy({ frontend: { library: 'angular', framework: null } }),
    { library: 'angular', framework: null },
  );
});

test('reserved feature names', () => {
  assert.equal(validateFeatureName('Domain').ok, false);
  assert.equal(validateFeatureName('Product').ok, true);
});
