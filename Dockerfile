FROM node:20-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build:prod
RUN yarn prisma:generate

FROM node:20-alpine AS server
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/yarn.lock ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/.env ./
EXPOSE 3001
CMD ["sh", "-c", "yarn prisma:migrate:prod && yarn run start:prod"]

FROM node:20-alpine AS client
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/yarn.lock ./
COPY --from=build /app/node_modules ./node_modules
RUN yarn global add serve
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
