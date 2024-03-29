const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

prisma.$connect()
  .then(() => {
    console.log('Prisma Client connected successfully.');
  })
  .catch((error) => {
    console.error('Error connecting to Prisma Client:', error);
    process.exit(1); // Exit the process with a non-zero status code to indicate failure
  });

// Define GraphQL schema
const typeDefs = gql`
  type Customer {
    id: ID!
    name: String!
    email: String!
    orders: [Order]
  }

  type Order {
    id: ID!
    product: String!
    quantity: Int!
    customerId: ID!
    customer: Customer
  }

  type Query {
    customers: [Customer]
    orders: [Order]
  }

  type Mutation {
    createCustomer(name: String!, email: String!): Customer
    createOrder(product: String!, quantity: Int!, customerId: ID!): Order
  }
`;

// Define resolvers
const resolvers = {
  Query: {
    customers: async () => await prisma.customer.findMany(),
    orders: async () => await prisma.order.findMany(),
  },
  Mutation: {
    createCustomer: async (_, { name, email }) => {
      return await prisma.customer.create({
        data: {
          name,
          email,
        },
      });
    },
    createOrder: async (_, { product, quantity, customerId }) => {
      return await prisma.order.create({
        data: {
          product,
          quantity,
          customerId: parseInt(customerId),
        },
      });
    },
  },
  Customer: {
    orders: async (parent) => await prisma.customer.findUnique({ where: { id: parent.id } }).orders(),
  },
  Order: {
    customer: async (parent) => await prisma.order.findUnique({ where: { id: parent.id } }).customer(),
  },
};

async function startApolloServer() {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  const app = express();
  server.applyMiddleware({ app });
  app.listen({ port: 4000 }, () =>
    console.log(`Server ready at http://localhost:4000${server.graphqlPath}`)
  );
}

startApolloServer();
