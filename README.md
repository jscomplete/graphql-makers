## GraphQL Makers

Functions to make GraphQL types based on schema-language definitions.

[![npm version](https://badge.fury.io/js/graphql-makers.svg)](https://badge.fury.io/js/graphql-makers)

_**WARNING**: This is a work-in-progress. It has been briefly tested but only on a recent version of Node/GraphQL.js and for limited use cases._

### Examples

#### Create a `GraphQLObjectType` object

```js
const { objectType } = require('graphql-makers');

const dependencies = {
  Comment: require.resolve('./comment'),
};

const typeDef = `
  type Post {
    id: ID
    title: String
    content: String
    user: User
    comments: [Comment]
  }
`;

const resolvers = {
  user(parent, args, contex) {
    // ...
  },
  comments(parent, args, context) {
    // ...
  },
};

module.exports = objectType({ typeDef, resolvers, dependencies });
```

#### Create a `GraphQLSchema` object

```js
const typeDef = `
  type Query {
    list: [Int!]!
  }
`;

const resolvers = {
  Query: {
    list: () => [1, 2, 3],
  },
};

module.exports = schemaType({ typeDef, resolvers, dependencies });
```

### License

GraphQL Makers is [MIT licensed](./LICENSE).
