# NoticeRadar Project Structure

This document explains the purpose of the top-level directories added during the production hardening phase.

## 📁 `scripts/`
Contains administrative and utility scripts.
- **`seed.js`**: Populates the database with initial dummy data (tenants, users, clients, notices). Use `npm run seed` or `node scripts/seed.js` to run.

## 📁 `postman/`
Contains API test collections.
- **`NoticeRadar.postman_collection.json`**: Import this into Postman to test Auth and Notice management APIs without the frontend.

## 📁 `infra/`
Contains infrastructure configuration for both development and production.
- **`docker-compose.yml`**: A "one-click" setup for all required services (MongoDB, Redis, MinIO, Keycloak). Run `docker-compose up -d` in this folder to start everything.

## 📁 `docs/`
Contains technical documentation, architecture diagrams, and API specifications.
- Use this to store developer guides, deployment checklists, and security policies.
