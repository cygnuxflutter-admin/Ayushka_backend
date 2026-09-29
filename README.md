# Ayushka Backend

Scalable REST API starter using Node.js, Express, and MongoDB (Mongoose).

## Requirements

- Node.js 20 or newer
- MongoDB running locally, or a MongoDB Atlas connection string

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

3. Set `MONGODB_URI` in `.env`.
4. Start the development server:

   ```bash
   npm run dev
   ```

The server runs at `http://localhost:5000` by default. Open `http://localhost:5000/api-docs` for Swagger UI or `http://localhost:5000/api-docs.json` for the OpenAPI document. Check `GET /api/v1/health` to verify the API and database connection.

Login cURL example:

```sh
curl --request POST 'http://localhost:5000/api/v1/auth/login' \
  --header 'Content-Type: application/json' \
  --data '{"username":"admin_ayushka","password":"<DEFAULT_ADMIN_PASSWORD>"}'
```

## Project structure

```text
src/
  app.js                    Express app and middleware
  server.js                 Database connection and server lifecycle
  config/
    database.js             MongoDB connection
    env.js                  Environment loading and validation
  controllers/              Request handlers
  middlewares/              Error handling and not-found handling
  models/                   Mongoose models
  routes/
    v1/                     Versioned API routes
  services/                 Reusable business logic
  utils/                    Shared helpers and application errors
```

Keep each business feature in its own controller, model, service (when business logic warrants it), and route file. Register feature routes in `src/routes/v1/index.js`; keep request handling out of route definitions.

## Adding an API feature

1. Add a controller in `src/controllers/`.
2. Add a Mongoose model in `src/models/` when the feature needs persistence.
3. Add a route file in `src/routes/v1/`.
4. Mount that route from `src/routes/v1/index.js`.
5. Use `asyncHandler` for async controllers and forward failures to the centralized error middleware.

All feature endpoints should live under `/api/v1`. Add `/api/v2` when introducing a new, incompatible API version.

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | Runtime environment |
| `PORT` | No | `5000` | HTTP server port |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `CORS_ORIGIN` | No | `*` | Allowed origin(s), comma-separated |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate-limit window in milliseconds |
| `RATE_LIMIT_MAX` | No | `100` | Maximum requests per IP per window |

## User management models

The Mongoose models are in `src/models/User.js`, `src/models/Gaushala.js`, and `src/models/Role.js`.

On startup, the application creates missing collections for the registered models and creates indexes declared in their schemas. Register any new model in `src/config/database.js` so its collection and indexes are initialized before the server starts.

Startup also creates the `Admin` role and `ayushka_navsari` gaushala if they do not exist. To seed the `admin_ayushka` user, set `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` in `.env`; the password is hashed by the User model. These defaults are only inserted once and do not overwrite existing records.

## Login API

`POST /api/v1/auth/login` accepts `username` or `emailId` with `password`. A successful response includes the user and a signed bearer access token. Set `JWT_SECRET` in `.env` to a random value of at least 32 bytes; generate one with `openssl rand -hex 32`. `JWT_EXPIRES_IN` controls token lifetime and defaults to `1h`.

## Admin CRUD APIs

All Role and Gaushala endpoints below require `Authorization: Bearer <accessToken>` from an active Admin account.

| Resource | List | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- | --- |
| Roles | `GET /api/v1/roles` | `POST /api/v1/roles` | `GET /api/v1/roles/:id` | `POST /api/v1/roles/:id/update` | `POST /api/v1/roles/:id/delete` |
| Gaushalas | `GET /api/v1/gaushalas` | `POST /api/v1/gaushalas` | `GET /api/v1/gaushalas/:id` | `POST /api/v1/gaushalas/:id/update` | `POST /api/v1/gaushalas/:id/delete` |
| Sheds | `GET /api/v1/sheds` | `POST /api/v1/sheds` | `GET /api/v1/sheds/:id` | `POST /api/v1/sheds/:id/update` | `POST /api/v1/sheds/:id/delete` |
| Breed types | `GET /api/v1/breed-types` | `POST /api/v1/breed-types` | `GET /api/v1/breed-types/:id` | `POST /api/v1/breed-types/:id/update` | `POST /api/v1/breed-types/:id/delete` |
| Types | `GET /api/v1/types` | `POST /api/v1/types` | `GET /api/v1/types/:id` | `POST /api/v1/types/:id/update` | `POST /api/v1/types/:id/delete` |

Create/update bodies use `{ "roleName": "Manager" }` for roles, `{ "gaushalaName": "north_farm" }` for gaushalas, `{ "shedName": "Cow Shed A", "shedNumber": "SH-001" }` for sheds, `{ "breedName": "Gir" }` for breed types, and `{ "typeName": "Dairy" }` for types. Deleting a Role or Gaushala referenced by any user returns `409`.

MongoDB does not enforce a fixed set of document fields. Changing a Mongoose schema affects validation and casting for application operations, but it does not add fields to or remove fields from existing documents. Use an explicit data migration when existing documents need to be updated.

Example documents (MongoDB generates `_id`, `createdAt`, and `updatedAt`):

```js
// Gaushala
{ _id: ObjectId("..."), gaushalaName: "ABC Gaushala" }

// Role
{ _id: ObjectId("..."), roleName: "ADMIN" }

// User (password is stored as a bcrypt hash)
{
  _id: ObjectId("..."),
  name: "Ravi",
  gaushalaId: ObjectId("..."),
  roleId: ObjectId("..."),
  emailId: "ravi@example.com",
  username: "ravi",
  password: "$2b$12$...",
  fcmToken: null,
  isDeleted: false,
  isActive: true,
  deletedBy: null,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

User email and username have unique partial indexes for records where `isDeleted` is `false`. This prevents duplicate non-deleted accounts while allowing a soft-deleted account's identifiers to be reused. The `gaushalaId` and `roleId` fields are indexed ObjectId references. `deletedBy` is a self-reference to the user who performed the soft delete. Gaushala names and role names are unique.

To fetch the populated relationship fields in an API response:

```js
const user = await User.findById(userId)
  .populate({ path: 'gaushala', select: 'gaushalaName' })
  .populate({ path: 'role', select: 'roleName' })
  .populate({ path: 'deletedBy', select: 'name username' });

if (!user) {
  throw new AppError('User not found', 404);
}

const data = user.toJSON();
delete data.gaushalaId;
delete data.roleId;
res.json({ success: true, data });
```

The `gaushala` and `role` populated virtuals resolve through `gaushalaId` and `roleId`; `deletedBy` directly populates another User document. The password is excluded from queries by default and removed by JSON/object serialization. Select it explicitly only for password verification (`User.findById(id).select('+password')`), then call `user.comparePassword(candidate)`.

Install the model packages with:

```bash
npm install mongoose bcrypt
```
