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
2. During installation, set a username and password.
3. Verify the installation:
   ```sh
   psql --version
   ```

### Option 2: Docker Installation (Alternative)

Run the following command to set up PostgreSQL in a Docker container:

```sh
docker run --name postgres -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=admin -e POSTGRES_DB=mydatabase -p 5432:5432 -d postgres
```

---

## 2. Configure Environment Variables

Create a `.env` file in your project's root directory and add the following:

```sh
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=your_database_name
```

If using Docker, replace `DATABASE_HOST` with:

```sh
DATABASE_HOST=host.docker.internal
```

---

## 3. Install Dependencies

Install the required Node.js dependencies:

```sh
npm install pg dotenv
```

---

## 4. Verify Database Connection

Run your application to verify the database connection:

```sh
npm run start
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

### 2. **Environment Variables Not Loading**
   - **Cause:** `dotenv` is not configured properly.
   - **Fix:** Ensure `dotenv` is installed and required in your entry file:
     ```sh
     npm install dotenv
     ```
     Add this line at the top of your entry file:
     ```js
     require('dotenv').config();
     ```

### 3. **Port Conflict**
   - **Cause:** Another service is using port `5432`.
   - **Fix:** Stop the conflicting service or change the `DATABASE_PORT` in `.env`.
     ```sh
     lsof -i :5432
     kill -9 <PID>
     ```

---

## Conclusion

Your PostgreSQL database is now set up and ready to use. If you encounter issues, revisit the configuration steps or refer to the troubleshooting guide above.

---

## Happy Coding! 🚀