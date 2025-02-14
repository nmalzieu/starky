# Database Setup Guide

This guide provides step-by-step instructions on setting up the database using PostgreSQL and TypeORM, including environment variable configurations and troubleshooting common issues.

## Prerequisites
Ensure you have the following installed on your system:

- [PostgreSQL](https://www.postgresql.org/download/)
- [Node.js](https://nodejs.org/)
- [TypeORM](https://typeorm.io/)
- [Docker (optional)](https://www.docker.com/)

## 1. Install PostgreSQL

### Using Local Installation

1. Download and install PostgreSQL from the official site.
2. During installation, set up a username and password.
3. Verify installation:
   ```sh
   psql --version
   ```

### Using Docker (Alternative)

```sh
docker run --name postgres -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=admin -e POSTGRES_DB=mydatabase -p 5432:5432 -d postgres
```

## 2. Configure Environment Variables
Create a `.env` file in the root directory and add:

```sh
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=your_database_name
```

For Docker, use:

```sh
DATABASE_HOST=host.docker.internal
DATABASE_PORT=5432
DATABASE_USER=admin
DATABASE_PASSWORD=admin
DATABASE_NAME=mydatabase
```

## 3. Install Dependencies
Run the following command:

```sh
npm install pg typeorm dotenv
```

## 4. Set Up TypeORM Configuration
Create a `ormconfig.js` file:

```js
require('dotenv').config();
module.exports = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: true,
  logging: false,
  entities: ['src/entity/**/*.ts'],
  migrations: ['src/migration/**/*.ts'],
  subscribers: ['src/subscriber/**/*.ts'],
  cli: {
    entitiesDir: 'src/entity',
    migrationsDir: 'src/migration',
    subscribersDir: 'src/subscriber'
  }
};
```

## 5. Apply Migrations
To apply database migrations, run:

```sh
npm run typeorm migration:run
```

To generate new migrations:

```sh
npm run typeorm migration:generate -- -n MigrationName
```

## 6. Verify Connection
Run the following command:

```sh
npm run start
```

If successful, you should see a message indicating a connection to the database.

## Common Issues & Fixes

### 1. Connection Refused
**Fix:** Ensure PostgreSQL is running:
```sh
pg_ctl -D /usr/local/var/postgres start
```
Or for Docker:
```sh
docker start postgres
```

### 2. Environment Variables Not Loading
**Fix:** Ensure you have installed `dotenv` and required it in your app.
```sh
npm install dotenv
```
Add this line at the top of your entry file:
```js
require('dotenv').config();
```

### 3. Port Conflict
**Fix:** Change `DATABASE_PORT` in `.env` or stop other services using port 5432:
```sh
lsof -i :5432
kill -9 <PID>
```

## Conclusion
Your PostgreSQL database should now be properly set up with TypeORM. If you encounter issues, recheck the configurations and follow the troubleshooting steps above.

## Happy Coding!
