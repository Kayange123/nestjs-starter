# NestJS API Starter Kit

A comprehensive, production-ready NestJS API starter kit with authentication, role-based access control, database integration, and many more enterprise-ready features.

## Features

- 🔒 **Authentication & Authorization**

  - JWT Authentication with refresh tokens
  - Role-based access control (RBAC)
  - Permission-based access control
  - CSRF protection
  - Rate limiting and throttling

- 🛠️ **Core Infrastructure**

  - Modular architecture following NestJS best practices
  - PostgreSQL integration with TypeORM
  - In-memory caching support
  - Comprehensive logging with Winston
  - Health check endpoints with detailed system monitoring
  - Request/response validation with class-validator
  - API versioning with proper routing structure

- 📊 **Developer Experience**

  - Swagger/OpenAPI documentation
  - Environment configuration with validation
  - Automated testing infrastructure (unit, integration, e2e)
  - Docker & Docker Compose for local development
  - GitHub Actions CI/CD workflows
  - Linting and code formatting (ESLint, Prettier)
  - Git hooks with Husky and lint-staged
  - Conventional commits enforcement

- 🔄 **Database Tools**

  - Database migrations
  - Data seeding (development, testing, production)
  - Query pagination support

- 🔧 **Production Ready**
  - Optimized Docker images with multi-stage builds
  - API error handling and standardized responses
  - CORS configuration
  - Helmet security headers
  - Health monitoring and metrics

## Getting Started

### Prerequisites

- Node.js (v20+)
- PNPM (v8+)
- PostgreSQL (v16+)
- Docker & Docker Compose (optional)

### Local Installation

1. Clone this repository
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create a `.env` file from the example:

   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration

5. Start the application:

   ```bash
   pnpm start:dev
   ```

### Docker Setup

Run the application with Docker:

```bash
# Development mode with hot reload
docker compose build
docker compose up -d

# Production mode
NODE_ENV=production docker compose up -d
```

## Health Monitoring

The application includes comprehensive health checks at `/v1/health` that monitor:

- API status
- Database connectivity
- Disk storage usage
- Memory usage

## Caching Strategy

The application uses NestJS's built-in in-memory caching system for performance optimization.

Configure cache TTL in your .env file:

```ruby
CACHE_TTL=300  # Time-to-live in seconds (default is 5 minutes)
```

## Security Features

### CSRF Protection

CSRF protection is enabled by default for all non-GET endpoints. The CSRF token is provided in the response header `csrf-token` for any GET request and must be included in subsequent non-GET requests either as:

- `csrf-token` or `x-csrf-token` header
- `_csrf` property in the request body

### Rate Limiting

API rate limiting is configured at 100 requests per minute by default. Customize in `.env`:

```ruby
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

## API Versioning

API versioning is enabled through URI paths. Endpoints are accessible at `/v1/resource`.

When introducing breaking changes, create new controllers under a new version namespace.

## Testing

```bash
# Run unit tests
pnpm test

# Run e2e tests
pnpm test:e2e

# Generate test coverage
pnpm test:cov
```

## CI/CD

Continuous Integration and Deployment is set up using GitHub Actions:

- **CI Pipeline**: Runs on all pushes to `main` and `develop` branches and all PRs

  - Linting and type checking
  - Unit and integration tests
  - Test coverage reporting

- **CD Pipeline**:
  - Triggered by pushes to `main` (deploys to staging)
  - Triggered by version tags (deploys to production)
  - Builds and pushes Docker images to GitHub Container Registry
  - Supports seamless deployment to multiple environments

## API Documentation

Swagger documentation is available at `/docs` when the application is running.

## Available Scripts

- `pnpm start:dev` - Start the application in development mode
- `pnpm build` - Build the application
- `pnpm start:prod` - Start the application in production mode
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:cov` - Run tests with coverage
- `pnpm test:e2e` - Run end-to-end tests
- `pnpm lint` - Run linting
- `pnpm format` - Run code formatting
- `pnpm typecheck` - Run type checking
- `pnpm migration:generate -- src/database/migrations/MigrationName` - Generate a new migration
- `pnpm migration:run` - Run migrations
- `pnpm migration:revert` - Revert the last migration
- `pnpm seed:init` - Seed the database with initial data

## Project Structure

```ruby
src/
├── app.controller.ts        # App controller
├── app.module.ts            # Main application module
├── app.service.ts           # App service
├── main.ts                  # Application entry point
├── config/                  # Configuration management
├── database/                # Database setup and migrations
├── filters/                 # Global exception filters
├── guards/                  # Authentication guards
├── interceptors/            # HTTP interceptors
├── lib/                     # Shared libraries
│   ├── cache/               # Caching implementation
│   └── logger/              # Logging implementation
├── modules/                 # Feature modules
│   ├── auth/                # Authentication module
│   ├── health/              # Health check module
│   ├── shared/              # Shared module
│   └── users/               # Users module
├── pipes/                   # Validation pipes
├── security/                # Security features
│   └── csrf/                # CSRF protection
└── seeders/                 # Database seeders
```

## Git Workflow and Conventions

### Husky Git Hooks

This project uses [Husky](https://typicode.github.io/husky) to enforce code quality and consistency through Git hooks:

- **pre-commit**: Runs linting and formatting on staged files using lint-staged
- **pre-push**: Runs tests and type checking before pushing to remote
- **commit-msg**: Validates commit messages against conventional commit format

Husky ensures that all code meets the project's quality standards before being committed or pushed.

### Conventional Commits

We enforce the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages. Each commit message must follow this format:

```bash
type(scope): message [#issue-number]
```

**Types allowed** (from commitlint.config.js):

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Changes to the build process, tools, etc.
- `revert`: Reverting a previous commit

**Rules**:

- Header length must not exceed 72 characters
- A reference to an issue is required
- Type must be one of the allowed types listed above

**Examples**:

```bash
feat(auth): implement refresh token rotation #123
fix(api): resolve race condition in request handler #456
docs(readme): update deployment instructions #789
```

## Contributing

1. Fork the repository
2. Create a new feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes using conventional commits
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

MIT
