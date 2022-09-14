FROM node:16-alpine AS build
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i; \
    else echo "Lockfile not found." && exit 1; \
    fi

COPY . .
# This is a boolean displaying the "official" Starky
# website (with a direct link to the Discord app
# and our Social Links). This is disabled by default!
ARG NEXT_PUBLIC_STARKY_OFFICIAL
ENV NEXT_PUBLIC_STARKY_OFFICIAL=$NEXT_PUBLIC_STARKY_OFFICIAL
# Next also needs the discord client id at build time to
# display a direct link to the application installation. Same,
# not needed by default.
ARG NEXT_PUBLIC_DISCORD_CLIENT_ID
ENV NEXT_PUBLIC_DISCORD_CLIENT_ID=$NEXT_PUBLIC_DISCORD_CLIENT_ID
ENV NODE_ENV production
RUN yarn build


# Production image, copy all the files and run next
FROM node:16-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

EXPOSE 8080

CMD [ "node", "dist-server/server.js" ]
