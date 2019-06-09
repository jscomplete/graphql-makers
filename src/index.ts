import {
  parse,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLEnumType,
  GraphQLUnionType,
  GraphQLInterfaceType,
  GraphQLScalarType,
  GraphQLFieldConfigMap,
  TypeDefinitionNode,
  GraphQLSchemaConfig,
} from 'graphql';

import { ASTDefinitionBuilder } from 'graphql/utilities/buildASTSchema';

// ******************
// Internal Methods
// ******************

// Temp Types are used to "delay" the requiring
// of custom modules until we're within the thunks
const TempType = typeName =>
  new GraphQLScalarType({
    name: '_TMP__' + typeName,
    serialize: () => {},
  });
const tempTypesCache = Object.create(null);
const buildType = source => {
  const astBuilder = new ASTDefinitionBuilder({}, typeName => {
    if (!tempTypesCache[typeName]) {
      const tempType = TempType(typeName);
      tempTypesCache[typeName] = tempType;
    }
    return tempTypesCache[typeName];
  });

  const typeDef =
    source.kind === 'ObjectTypeDefinition'
      ? source
      : parse(source).definitions[0];
  return astBuilder.buildType(typeDef);
};

const resolveTypeDependencies = (type, dependencies) => {
  if (type.name && dependencies[type.name.slice(6)]) {
    const typeStringOrModule = dependencies[type.name.slice(6)];
    const Type =
      typeof typeStringOrModule === 'string'
        ? require(typeStringOrModule)
        : typeStringOrModule;
    return Type.default || Type;
  } else if (type.ofType) {
    type.ofType = resolveTypeDependencies(type.ofType, dependencies);
  }
  return type;
};

const extendObjectType = (
  origType: GraphQLObjectType,
  resolvers,
  dependencies
): GraphQLObjectType => {
  const config = origType.toConfig();
  return new GraphQLObjectType({
    ...config,
    fields: () => {
      const fields: GraphQLFieldConfigMap<any, any> = Object.create(null);
      for (const [fieldId, field] of Object.entries(config.fields)) {
        field.type = resolveTypeDependencies(field.type, dependencies);
        if (resolvers[fieldId]) {
          field.resolve = resolvers[fieldId];
        }
        const args = Object.create(null);
        for (const [arg, argObj] of Object.entries(field.args)) {
          argObj.type = resolveTypeDependencies(argObj.type, dependencies);
          args[arg] = argObj;
        }
        field.args = args;
        fields[fieldId] = field;
      }
      return fields;
    },
  });
};

const extendUnionType = (
  origType: GraphQLUnionType,
  resolveType,
  dependencies
): GraphQLUnionType => {
  const config = origType.toConfig();
  return new GraphQLUnionType({
    ...config,
    types: () => {
      const types = [];
      for (const type of config.types) {
        types.push(resolveTypeDependencies(type, dependencies));
      }
      return types;
    },
    resolveType,
  });
};

const extendInterfaceType = (
  origType: GraphQLInterfaceType,
  resolveType,
  dependencies
): GraphQLInterfaceType => {
  const config = origType.toConfig();
  return new GraphQLInterfaceType({
    ...config,
    fields: () => {
      const fields = Object.create(null);
      for (const [fieldId, field] of Object.entries(config.fields)) {
        field.type = resolveTypeDependencies(field.type, dependencies);
        const args = Object.create(null);
        for (const [arg, argObj] of Object.entries(field.args)) {
          argObj.type = resolveTypeDependencies(argObj.type, dependencies);
          args[arg] = argObj;
        }
        field.args = args;
        fields[fieldId] = field;
      }
      return fields;
    },
    resolveType,
  });
};

const extendEnumType = (
  origType: GraphQLEnumType,
  enumValues
): GraphQLEnumType => {
  const config = origType.toConfig();
  const values = Object.create(null);
  for (const [valueId, valueObj] of Object.entries(config.values)) {
    if (enumValues[valueId]) {
      valueObj.value = enumValues[valueId];
    }
    values[valueId] = valueObj;
  }
  return new GraphQLEnumType({ ...config, values });
};

// ******************
// Public API Methods
// ******************

type GMSchemaArgs = {
  typeDef: string;
  resolvers?: {
    [schemaTypeName: string]: { [resolverName: string]: Function };
  };
  dependencies?: { [depName: string]: string };
};

export const schemaType = ({
  typeDef,
  resolvers,
  dependencies = {},
}: GMSchemaArgs) => {
  const typeDefs = parse(typeDef).definitions;
  const schemaConfig = {};

  typeDefs.forEach((typeDef: TypeDefinitionNode) => {
    schemaConfig[typeDef.name.value.toLowerCase()] = objectType({
      typeDef,
      dependencies,
      resolvers: resolvers[typeDef.name.value],
    });
  });

  return new GraphQLSchema(schemaConfig as GraphQLSchemaConfig);
};

type GMObjectArgs = {
  typeDef: string | TypeDefinitionNode;
  resolvers?: { [resolverName: string]: Function };
  dependencies?: { [depName: string]: string };
};

export const objectType = ({
  typeDef,
  resolvers,
  dependencies = {},
}: GMObjectArgs) => {
  const _objectType = buildType(typeDef);
  return resolvers
    ? extendObjectType(
        _objectType as GraphQLObjectType,
        resolvers,
        dependencies
      )
    : _objectType;
};

type GMCompositeArgs = {
  typeDef: string | TypeDefinitionNode;
  resolveType?: { [resolverName: string]: Function };
  dependencies?: { [depName: string]: string };
};

export const interfaceType = ({
  typeDef,
  resolveType,
  dependencies = {},
}: GMCompositeArgs): GraphQLInterfaceType => {
  const _interfaceType = buildType(typeDef);
  return extendInterfaceType(
    _interfaceType as GraphQLInterfaceType,
    resolveType,
    dependencies
  );
};

export const unionType = ({
  typeDef,
  resolveType,
  dependencies = {},
}: GMCompositeArgs): GraphQLUnionType => {
  const _unionType = buildType(typeDef);
  return extendUnionType(
    _unionType as GraphQLUnionType,
    resolveType,
    dependencies
  );
};

export const enumType = (
  typeDef: string,
  enumValues: {} = {}
): GraphQLEnumType => {
  const _enumType = buildType(typeDef);
  return enumValues
    ? extendEnumType(_enumType as GraphQLEnumType, enumValues)
    : (_enumType as GraphQLEnumType);
};

export const inputType = (typeDef: string) => {
  const _inputType = buildType(typeDef);
  return _inputType;
};

export default {
  schemaType,
  objectType,
  interfaceType,
  unionType,
  enumType,
  inputType,
};
