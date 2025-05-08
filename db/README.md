# Database Setup Guide

This guide provides step-by-step instructions for setting up a PostgreSQL database, including environment variable configuration and troubleshooting common issues.

---

## Prerequisites

Ensure the following are installed on your system:

- [PostgreSQL](https://www.postgresql.org/download/)
- [Node.js](https://nodejs.org/)
- [Docker](https://www.docker.com/) (optional, for containerized setup)

---

## 1. Install PostgreSQL

### Option 1: Local Installation

1. Download and install PostgreSQL from the [official website](https://www.postgresql.org/download/).
2. During installation, set a username and password. Use "mysecretpassword" as the password.
3. Verify the installation:
   ```sh
   psql --version
   ```

### Option 2: Docker Installation (Alternative)

Run the following command to set up PostgreSQL in a Docker container:

```sh
docker run --name starky-postgres -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d postgres
```
(Please checkout the port if it matches yours.)

---

## 2. Configure Environment Variables

Create a `.env` file in your project's root directory and add the following:

```sh
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_application_id
DISCORD_BOT_TOKEN=your_bot_token
DATABASE_URL=postgresql://postgres:mysecretpassword@localhost:5432/postgres
DOMAIN=http://localhost:8080
PORT=8080
NODE_ENV=development
BASE_URL=http://localhost:8080/
UPDATE_STATUS_EVERY_SECONDS=5
APIBARA_AUTH_TOKEN_MAINNET=xxx
APIBARA_AUTH_TOKEN_SEPOLIA=xxx
APIBARA_DEFAULT_BLOCK_NUMBER_MAINNET=644802
APIBARA_DEFAULT_BLOCK_NUMBER_SEPOLIA=70133
STARKSCAN_API_KEY=xxx
RPC_URL_MAINNET=https://rpc.starknet.id/
RPC_URL_SEPOLIA=https://sepolia.rpc.starknet.id/
WATCHTOWER_ENABLED=false
APP_ID=xxx
WATCHTOWER_URL=https://api.watchtower.starknet.id/service/add_message
WATCHTOWER_TOKEN=xxx
LOG_EVERY_X_BLOCK=1
```

## 3. Install Dependencies

Install the required Node.js dependencies:

```sh
yarn install
```

---

## 4. Verify Database Connection

Run your application to verify the database connection:

```sh
yarn run dev or yarn start
```

If successful, you should see a message confirming the connection to the database.

---

## Common Issues & Fixes

### 1. **Connection Refused**
   - **Cause:** PostgreSQL is not running.
   - **Fix:** Start PostgreSQL:
     ```sh
     pg_ctl -D /usr/local/var/postgres start
     ```
     For Docker:
     ```sh
     docker start postgres
     ```

### 2. **Port Conflict**
   - **Cause:** Another service is using port `5433`.
   - **Fix:** Stop the conflicting service or change the `DATABASE_PORT` in `.env`.
     ```sh
     lsof -i :5433
     kill -9 <PID>
     ```

---

## Conclusion

Your PostgreSQL database is now set up and ready to use. If you encounter issues, revisit the configuration steps or refer to the troubleshooting guide above.

---

## Happy Coding! 🚀

