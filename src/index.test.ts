import { graphql } from 'graphql';

import {
  schemaType,
  objectType,
  interfaceType,
  unionType,
  enumType,
  inputType,
} from './index';

test('schemaType', async () => {
  const GMSchema = schemaType({
    typeDef: `
      type Query {
        list: [Int!]!
      }
    `,
    resolvers: {
      Query: {
        list: () => [1, 2, 3],
      },
    },
  });

  const { data } = await graphql(GMSchema, '{ list }');
  expect(data.list).toEqual([1, 2, 3]);
});

test('objectType', () => {
  const GMType: any = objectType({
    typeDef: `
      type GMObject {
        id: ID!
        name(test: Int!): String
      }
    `,
    resolvers: {
      name: () => 'GM TEST',
    },
  }).toConfig();

  expect(GMType.fields.name.resolve()).toBe('GM TEST');
});

test('interfaceType', () => {
  const GMType: any = interfaceType({
    typeDef: `
      interface GMInterface {
        id: ID!
        name: String
      }
    `,
    resolveType: () => 'GM TEST',
  }).toConfig();

  expect(GMType.fields.name.type.toString()).toBe('String');
  expect(GMType.resolveType()).toBe('GM TEST');
});

test('unionType', () => {
  const GMType: any = unionType({
    typeDef: `
      union GMUnion = TypeA | TypeB
    `,
    resolveType: () => 'GM TEST',
  }).toConfig();

  expect(GMType.resolveType()).toBe('GM TEST');
});

test('enumType', () => {
  const GMType: any = enumType(
    `
      enum GMENUM {
        VALUE1
        VALUE2
      }
    `,
    { VALUE1: 42 }
  ).toConfig();

  expect(GMType.values.VALUE1.value).toBe(42);
  expect(GMType.values.VALUE2.value).toBe('VALUE2');
});

test('inputType', () => {
  const GMType: any = inputType(
    `
      input GMInput {
        input1: String
        input2: Int
      }
    `
  ).toConfig();

  expect(GMType.fields.input1.type.toString()).toBe('String');
  expect(GMType.fields.input2.type.toString()).toBe('Int');
});
