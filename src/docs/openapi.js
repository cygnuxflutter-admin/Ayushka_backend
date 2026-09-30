const apiErrorResponse = (description) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ApiError' },
    },
  },
});

const successDataSchema = (data) => ({
  type: 'object',
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean', enum: [true] },
    data,
  },
});

const makeAdminCrudPaths = ({ basePath, tag, itemName, field, schemaName }) => {
  const fields = Array.isArray(field) ? field : [field];
  const recordRef = `#/components/schemas/${schemaName}`;
  const secured = {
    tags: [tag],
    security: [{ BearerAuth: [] }],
  };
  const requestBody = {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: fields,
          properties: Object.fromEntries(
            fields.map((fieldName) => [
              fieldName,
              { type: 'string', minLength: 1 },
            ]),
          ),
        },
      },
    },
  };
  const adminErrors = {
    '401': apiErrorResponse('A valid bearer token is required.'),
    '403': apiErrorResponse('The authenticated user is not an Admin.'),
    '503': apiErrorResponse('Authorization is not configured.'),
  };
  const itemPath = `${basePath}/{id}`;
  const updatePath = `${itemPath}/update`;
  const deletePath = `${itemPath}/delete`;

  return {
    [basePath]: {
      get: {
        ...secured,
        summary: `List ${tag.toLowerCase()}`,
        operationId: `list${tag}`,
        responses: {
          '200': {
            description: `${tag} records.`,
            content: {
              'application/json': {
                schema: successDataSchema({
                  type: 'array',
                  items: { $ref: recordRef },
                }),
              },
            },
          },
          ...adminErrors,
        },
      },
      post: {
        ...secured,
        summary: `Create a ${itemName}`,
        operationId: `create${itemName}`,
        requestBody,
        responses: {
          '201': {
            description: `${itemName} created.`,
            content: {
              'application/json': {
                schema: successDataSchema({ $ref: recordRef }),
              },
            },
          },
          '400': apiErrorResponse(`${fields.join(' and ')} are required.`),
          '409': apiErrorResponse(`${fields.join(' or ')} already exists.`),
          ...adminErrors,
        },
      },
    },
    [itemPath]: {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      get: {
        ...secured,
        summary: `Get a ${itemName}`,
        operationId: `get${itemName}`,
        responses: {
          '200': {
            description: `${itemName} details.`,
            content: {
              'application/json': {
                schema: successDataSchema({ $ref: recordRef }),
              },
            },
          },
          '404': apiErrorResponse(`${itemName} not found.`),
          ...adminErrors,
        },
      },
    },
    [updatePath]: {
      post: {
        ...secured,
        summary: `Update a ${itemName}`,
        operationId: `update${itemName}`,
        requestBody,
        responses: {
          '200': {
            description: `${itemName} updated.`,
            content: {
              'application/json': {
                schema: successDataSchema({ $ref: recordRef }),
              },
            },
          },
          '400': apiErrorResponse(`${fields.join(' and ')} are required.`),
          '404': apiErrorResponse(`${itemName} not found.`),
          '409': apiErrorResponse(`${fields.join(' or ')} already exists.`),
          ...adminErrors,
        },
      },
    },
    [deletePath]: {
      post: {
        ...secured,
        summary: `Delete a ${itemName}`,
        operationId: `delete${itemName}`,
        responses: {
          '200': {
            description: `${itemName} deleted.`,
            content: {
              'application/json': {
                schema: successDataSchema({ $ref: recordRef }),
              },
            },
          },
          '404': apiErrorResponse(`${itemName} not found.`),
          '409': apiErrorResponse(`${itemName} is referenced by a user.`),
          ...adminErrors,
        },
      },
    },
  };
};

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Ayushka Backend API',
    version: '1.0.0',
    description: 'OpenAPI documentation for the Ayushka backend.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Health' },
    { name: 'Authentication' },
    { name: 'Users' },
    { name: 'Roles' },
    { name: 'Gaushalas' },
    { name: 'Sheds' },
    { name: 'Breed Types' },
    { name: 'Types' },
    { name: 'Cows' },
    { name: 'Uploads' },
  ],
  paths: {
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API and database health',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'The API and database are available.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
          '503': {
            description: 'The database is unavailable.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthUnavailableResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Log in and receive a bearer access token',
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Credentials accepted.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          '400': {
            description: 'Login identifier or password is missing.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '401': {
            description: 'Credentials are invalid or the account is inactive.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '503': {
            description: 'JWT signing is not configured.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/refresh-token': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh access token using refresh token',
        operationId: 'refreshToken',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: {
                    type: 'string',
                    description: 'The refresh token received during login',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token refreshed successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'Token refreshed successfully' },
                    data: {
                      type: 'object',
                      required: ['accessToken', 'refreshToken', 'tokenType', 'expiresIn'],
                      properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        tokenType: { type: 'string', example: 'Bearer' },
                        expiresIn: { type: 'string', example: '1h' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Refresh token is required.'),
          '401': apiErrorResponse('Invalid or expired refresh token.'),
          '503': apiErrorResponse('Token verification is not configured.'),
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a user (not implemented)',
        operationId: 'register',
        responses: {
          '501': {
            description: 'Registration is not implemented.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/forget-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Forget / Change password (Admin can change with only newPassword; regular user requires oldPassword & newPassword)',
        operationId: 'forgetPassword',
        security: [{ BearerAuth: [] }, {}],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ForgotPasswordRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password changed successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'Password updated successfully' },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Validation error (e.g., Old password is required, Password must be at least 8 characters long).'),
          '401': apiErrorResponse('Invalid credentials or token.'),
          '403': apiErrorResponse('Forbidden action or user is inactive.'),
          '404': apiErrorResponse('User not found.'),
        },
      },
    },
    '/api/v1/users': {
      get: {
        tags: ['Users'],
        summary: 'List users with optional filters (Admin only)',
        operationId: 'listUsers',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'gaushalaId',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Filter by Gaushala ID',
          },
          {
            name: 'roleId',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Filter by Role ID',
          },
          {
            name: 'isActive',
            in: 'query',
            required: false,
            schema: { type: 'boolean' },
            description: 'Filter by active status',
          },
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Search by name, username, or email',
          },
        ],
        responses: {
          '200': {
            description: 'Users fetched successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'Users fetched successfully' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
          },
          '401': apiErrorResponse('A valid bearer token is required.'),
          '403': apiErrorResponse('The authenticated user is not an Admin.'),
          '503': apiErrorResponse('Authorization is not configured.'),
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Add a new user (Admin only)',
        operationId: 'addUser',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddUserRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User added successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'User added successfully' },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Validation error or Invalid ObjectId format.'),
          '401': apiErrorResponse('A valid bearer token is required.'),
          '403': apiErrorResponse('The authenticated user is not an Admin.'),
          '404': apiErrorResponse('Gaushala or Role not found.'),
          '409': apiErrorResponse('User with this email or username already exists.'),
          '503': apiErrorResponse('Authorization is not configured.'),
        },
      },
    },
    '/api/v1/users/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'User MongoDB ObjectId',
        },
      ],
      get: {
        tags: ['Users'],
        summary: 'Get user details by ID (Admin only)',
        operationId: 'getUserById',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User fetched successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'User fetched successfully' },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Invalid User ID format.'),
          '401': apiErrorResponse('A valid bearer token is required.'),
          '403': apiErrorResponse('The authenticated user is not an Admin.'),
          '404': apiErrorResponse('User not found.'),
          '503': apiErrorResponse('Authorization is not configured.'),
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update an existing user (Admin only)',
        operationId: 'updateUser',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateUserRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'User updated successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'User updated successfully' },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Validation error or Invalid ObjectId format.'),
          '401': apiErrorResponse('A valid bearer token is required.'),
          '403': apiErrorResponse('The authenticated user is not an Admin.'),
          '404': apiErrorResponse('User, Gaushala, or Role not found.'),
          '409': apiErrorResponse('User with this email or username already exists.'),
          '503': apiErrorResponse('Authorization is not configured.'),
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Soft-delete a user (Admin only)',
        operationId: 'deleteUser',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User deleted successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'User deleted successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        isDeleted: { type: 'boolean', example: true },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Invalid User ID format.'),
          '401': apiErrorResponse('A valid bearer token is required.'),
          '403': apiErrorResponse('The authenticated user is not an Admin.'),
          '404': apiErrorResponse('User not found.'),
          '503': apiErrorResponse('Authorization is not configured.'),
        },
      },
    },
    '/api/v1/users/{id}/update': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'User MongoDB ObjectId',
        },
      ],
      post: {
        tags: ['Users'],
        summary: 'Update an existing user (POST alias, Admin only)',
        operationId: 'updateUserAlias',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateUserRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'User updated successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'User updated successfully' },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Validation error or Invalid ObjectId format.'),
          '401': apiErrorResponse('A valid bearer token is required.'),
          '403': apiErrorResponse('The authenticated user is not an Admin.'),
          '404': apiErrorResponse('User, Gaushala, or Role not found.'),
          '409': apiErrorResponse('User with this email or username already exists.'),
          '503': apiErrorResponse('Authorization is not configured.'),
        },
      },
    },
    '/api/v1/users/{id}/status': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'User MongoDB ObjectId',
        },
      ],
      post: {
        tags: ['Users'],
        summary: 'Activate or deactivate a user (Admin only)',
        operationId: 'toggleUserStatus',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  isActive: {
                    type: 'boolean',
                    example: true,
                    description: 'Set explicit active status. If omitted, toggles current status.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'User status updated successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'User activated successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        isActive: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Invalid User ID format.'),
          '401': apiErrorResponse('A valid bearer token is required.'),
          '403': apiErrorResponse('The authenticated user is not an Admin.'),
          '404': apiErrorResponse('User not found.'),
          '503': apiErrorResponse('Authorization is not configured.'),
        },
      },
    },
    '/api/v1/users/{id}/delete': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'User MongoDB ObjectId',
        },
      ],
      post: {
        tags: ['Users'],
        summary: 'Soft-delete a user (POST alias, Admin only)',
        operationId: 'deleteUserAlias',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User deleted successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'User deleted successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        isDeleted: { type: 'boolean', example: true },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Invalid User ID format.'),
          '401': apiErrorResponse('A valid bearer token is required.'),
          '403': apiErrorResponse('The authenticated user is not an Admin.'),
          '404': apiErrorResponse('User not found.'),
          '503': apiErrorResponse('Authorization is not configured.'),
        },
      },
    },
    ...makeAdminCrudPaths({
      basePath: '/api/v1/roles',
      tag: 'Roles',
      itemName: 'Role',
      field: 'roleName',
      schemaName: 'Role',
    }),
    ...makeAdminCrudPaths({
      basePath: '/api/v1/gaushalas',
      tag: 'Gaushalas',
      itemName: 'Gaushala',
      field: 'gaushalaName',
      schemaName: 'Gaushala',
    }),
    ...makeAdminCrudPaths({
      basePath: '/api/v1/sheds',
      tag: 'Sheds',
      itemName: 'Shed',
      field: ['gaushalaId', 'shedName', 'shedNumber'],
      schemaName: 'Shed',
    }),
    ...makeAdminCrudPaths({
      basePath: '/api/v1/breed-types',
      tag: 'Breed Types',
      itemName: 'Breed Type',
      field: 'breedName',
      schemaName: 'BreedType',
    }),
    ...makeAdminCrudPaths({
      basePath: '/api/v1/types',
      tag: 'Types',
      itemName: 'Type',
      field: 'typeName',
      schemaName: 'Type',
    }),
    '/api/v1/cows': {
      get: {
        tags: ['Cows'],
        summary: 'Get cows grouped or filtered by gender',
        operationId: 'getCows',
        parameters: [
          {
            name: 'gaushalaId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Gaushala ID (Mandatory)',
          },
          {
            name: 'gender',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['male', 'female', 'all'] },
            description: 'Filter cows by gender (male, female, or all)',
          },
          {
            name: 'isDelete',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['true', 'false', 'all'] },
            description: 'Filter by deleted status (true, false, or all). Omit or set to all to include all cows.',
          },
          {
            name: 'isActive',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['true', 'false', 'all'] },
            description: 'Filter by active status (true, false, or all).',
          },
          {
            name: 'isDied',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['true', 'false', 'all'] },
            description: 'Filter by died status (true, false, or all).',
          },
          {
            name: 'shed_id',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Filter by Shed ID',
          },
          {
            name: 'breed',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Filter by Breed ID',
          },
          {
            name: 'type',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Filter by Type ID',
          },
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Search by tag_id or calf_name',
          },
        ],
        responses: {
          '200': {
            description: 'Cows fetched successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: {
                      type: 'string',
                      example: 'Cows fetched successfully',
                    },
                    data: {
                      type: 'object',
                      required: ['total', 'femaleCount', 'maleCount', 'counts', 'female', 'male'],
                      properties: {
                        total: { type: 'integer', example: 50 },
                        femaleCount: { type: 'integer', example: 35 },
                        maleCount: { type: 'integer', example: 15 },
                        counts: {
                          type: 'object',
                          properties: {
                            total: { type: 'integer', example: 50 },
                            female: { type: 'integer', example: 35 },
                            male: { type: 'integer', example: 15 },
                            cow: { type: 'integer', example: 35 },
                            bull: { type: 'integer', example: 15 },
                          },
                        },
                        female: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Cow' },
                        },
                        male: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Cow' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Cows'],
        summary: 'Add a new cow',
        operationId: 'addCow',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddCowRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Cow added successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: {
                      type: 'string',
                      example: 'Cow added successfully',
                    },
                    data: { $ref: '#/components/schemas/Cow' },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Validation error or Invalid ObjectId.'),
          '404': apiErrorResponse('Referenced document not found.'),
          '409': apiErrorResponse('Cow with this tag ID already exists.'),
        },
      },
    },
    '/api/v1/cows/{id}': {
      put: {
        tags: ['Cows'],
        summary: 'Update an existing cow (Admin only)',
        operationId: 'updateCow',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Cow MongoDB ObjectId',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCowRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cow updated successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: {
                      type: 'string',
                      example: 'Cow updated successfully',
                    },
                    data: { $ref: '#/components/schemas/Cow' },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Validation error, invalid shed, or invalid ObjectId.'),
          '401': apiErrorResponse('A bearer token is required or token expired.'),
          '403': apiErrorResponse('Admin access is required.'),
          '404': apiErrorResponse('Cow or referenced document not found.'),
          '409': apiErrorResponse('Cow with this tag ID already exists.'),
        },
      },
    },
    '/api/v1/cows/{id}/status': {
      post: {
        tags: ['Cows'],
        summary: 'Activate or deactivate a cow (Admin only)',
        operationId: 'toggleCowStatus',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Cow MongoDB ObjectId',
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  isActive: {
                    type: 'boolean',
                    example: false,
                    description: 'Set explicit active status (true to activate, false to deactivate). If omitted, toggles current status.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cow status updated successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'Cow deactivated successfully' },
                    data: {
                      type: 'object',
                      required: ['id', 'isActive'],
                      properties: {
                        id: { type: 'string', example: '68d000000000000000000001' },
                        isActive: { type: 'boolean', example: false },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Cannot change status of a deleted or died cow, or invalid Cow ID.'),
          '401': apiErrorResponse('A bearer token is required or token expired.'),
          '403': apiErrorResponse('Admin access is required.'),
          '404': apiErrorResponse('Cow not found.'),
        },
      },
    },
    '/api/v1/cows/{id}/delete': {
      post: {
        tags: ['Cows'],
        summary: 'Soft-delete a cow (Admin only)',
        operationId: 'deleteCow',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Cow MongoDB ObjectId',
          },
        ],
        responses: {
          '200': {
            description: 'Cow deleted successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'Cow deleted successfully' },
                    data: {
                      type: 'object',
                      required: ['id'],
                      properties: {
                        id: { type: 'string', example: '68d000000000000000000001' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Cow is already deleted or invalid Cow ID.'),
          '401': apiErrorResponse('A bearer token is required or token expired.'),
          '403': apiErrorResponse('Admin access is required.'),
          '404': apiErrorResponse('Cow not found.'),
        },
      },
    },
    '/api/v1/cows/{id}/died': {
      post: {
        tags: ['Cows'],
        summary: 'Mark a cow as died (Admin only)',
        operationId: 'markCowAsDied',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Cow MongoDB ObjectId',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['send_died_date'],
                properties: {
                  send_died_date: {
                    type: 'string',
                    example: '2026-09-30',
                    description: 'Death date of the cow (YYYY-MM-DD or valid date string)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cow marked as died successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'Cow marked as died successfully' },
                    data: {
                      type: 'object',
                      required: ['id', 'send_died_date'],
                      properties: {
                        id: { type: 'string', example: '68d000000000000000000001' },
                        send_died_date: { type: 'string', example: '2026-09-30' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Validation error, cow already died, or cow is deleted.'),
          '401': apiErrorResponse('A bearer token is required or token expired.'),
          '403': apiErrorResponse('Admin access is required.'),
          '404': apiErrorResponse('Cow not found.'),
        },
      },
    },
    '/api/v1/cows/import': {
      post: {
        tags: ['Cows'],
        summary: 'Import multiple cows from an Excel or CSV file',
        operationId: 'importCows',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Excel (.xlsx, .xls) or CSV (.csv) file to import',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Import completed with summary of imported and failed records.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'Import completed: 18 cows imported successfully, 2 rows failed' },
                    data: {
                      type: 'object',
                      properties: {
                        totalRows: { type: 'integer', example: 20 },
                        importedCount: { type: 'integer', example: 18 },
                        failedCount: { type: 'integer', example: 2 },
                        imported: { type: 'array' },
                        errors: { type: 'array' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('File is required or invalid Excel file.'),
        },
      },
    },
    '/api/v1/cows/import-template': {
      get: {
        tags: ['Cows'],
        summary: 'Download sample Excel template for importing cows',
        operationId: 'downloadImportTemplate',
        responses: {
          '200': {
            description: 'Sample Excel template file.',
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
    },
    '/api/v1/cows/shed-transfer': {
      post: {
        tags: ['Cows'],
        summary: 'Transfer one or multiple cows to a new shed (Admin only)',
        operationId: 'transferCowShed',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ShedTransferRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cow shed transfer completed successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'Cow shed transfer completed successfully' },
                    data: { type: 'object' },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Validation error or Invalid ObjectId format.'),
          '401': apiErrorResponse('A valid bearer token is required.'),
          '403': apiErrorResponse('The authenticated user is not an Admin.'),
          '404': apiErrorResponse('Cow, Shed, or User not found.'),
        },
      },
    },
    '/api/v1/cows/shed-transfer': {
      post: {
        tags: ['Cows'],
        summary: 'Transfer cow(s) to a new shed (Admin only)',
        operationId: 'transferCowShed',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ShedTransferRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cow shed transfer completed successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'Cow shed transfer completed successfully' },
                    data: { type: 'object' },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Validation error or Invalid ObjectId format.'),
          '401': apiErrorResponse('A valid bearer token is required.'),
          '403': apiErrorResponse('The authenticated user is not an Admin.'),
          '404': apiErrorResponse('Cow, Shed, or Gaushala not found.'),
        },
      },
    },
    '/api/v1/cows/shed-transfer-history': {
      get: {
        tags: ['Cows'],
        summary: 'Get shed transfer history (filtered by cowId or gaushalaId)',
        operationId: 'getShedTransferHistory',
        security: [{ BearerAuth: [] }, {}],
        parameters: [
          { name: 'cowId', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by Cow ID (e.g. ?cowId=...)' },
          { name: 'cow_id', in: 'query', required: false, schema: { type: 'string' }, description: 'Alias for cowId' },
          { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' }, description: 'Gaushala ID (required if cowId is not provided)' },
          { name: 'from_shed_id', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by Previous Shed ID' },
          { name: 'to_shed_id', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by Destination Shed ID' },
          { name: 'startDate', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Filter from date' },
          { name: 'endDate', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Filter to date' },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 }, description: 'Page number' },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 10 }, description: 'Items per page' },
        ],
        responses: {
          '200': {
            description: 'Shed transfer history list filtered by cowId or gaushalaId.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'Shed transfer history fetched successfully' },
                    data: {
                      type: 'object',
                      required: ['records', 'total', 'page', 'limit', 'totalPages'],
                      properties: {
                        cow: {
                          type: 'object',
                          properties: {
                            _id: { type: 'string' },
                            tag_id: { type: 'string' },
                            calf_name: { type: 'string' },
                          },
                        },
                        gaushala: {
                          type: 'object',
                          properties: {
                            _id: { type: 'string' },
                            gaushalaName: { type: 'string' },
                          },
                        },
                        records: { type: 'array', items: { $ref: '#/components/schemas/ShedTransferHistory' } },
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        totalPages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Gaushala Id is required or invalid.'),
          '404': apiErrorResponse('Gaushala not found.'),
        },
      },
    },
    '/api/v1/cows/{id}/shed-transfer': {
      post: {
        tags: ['Cows'],
        summary: 'Transfer a specific cow to a new shed (Admin only)',
        operationId: 'transferSpecificCowShed',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Cow ID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['gaushalaId', 'to_shed_id'],
                properties: {
                  gaushalaId: { type: 'string', example: '6abcaebfd7556202004414a8', description: 'Gaushala ID' },
                  to_shed_id: { type: 'string', example: '6abcaf13d7556202004414c8', description: 'Destination Shed ID (must belong to entered gaushalaId)' },
                  reason: { type: 'string', example: 'Moved to milking shed' },
                  transferDate: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cow transferred successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: { type: 'string', example: 'Cow shed transfer completed successfully' },
                    data: { type: 'object' },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Validation error.'),
          '404': apiErrorResponse('Cow or Shed not found.'),
        },
      },
    },
    '/api/v1/uploads': {
      post: {
        tags: ['Uploads'],
        summary: 'Upload a file (image or PDF)',
        operationId: 'uploadFile',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'File to upload (image or PDF, max 10MB)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'File uploaded successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['success', 'message', 'data'],
                  properties: {
                    success: { type: 'boolean', enum: [true] },
                    message: {
                      type: 'string',
                      example: 'File uploaded successfully',
                    },
                    data: {
                      type: 'object',
                      required: ['url', 'relativePath', 'filename'],
                      properties: {
                        url: {
                          type: 'string',
                          example:
                            'http://localhost:5000/uploads/1727615000000-abcd.jpg',
                        },
                        relativePath: {
                          type: 'string',
                          example: '/uploads/1727615000000-abcd.jpg',
                        },
                        filename: {
                          type: 'string',
                          example: '1727615000000-abcd.jpg',
                        },
                        originalName: { type: 'string', example: 'cow.jpg' },
                        mimetype: { type: 'string', example: 'image/jpeg' },
                        size: { type: 'integer', example: 102400 },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': apiErrorResponse('Invalid file type or no file provided.'),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Role: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          roleName: { type: 'string', example: 'Manager' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Gaushala: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          gaushalaName: { type: 'string', example: 'ayushka_navsari' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Shed: {
        type: 'object',
        required: ['gaushalaId', 'shedName', 'shedNumber'],
        properties: {
          _id: { type: 'string' },
          gaushalaId: { type: 'string', example: '68d000000000000000000002' },
          shedName: { type: 'string', example: 'Cow Shed A' },
          shedNumber: { type: 'string', example: 'SH-001' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      BreedType: {
        type: 'object',
        required: ['breedName'],
        properties: {
          _id: { type: 'string' },
          breedName: { type: 'string', example: 'Gir' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Type: {
        type: 'object',
        required: ['typeName'],
        properties: {
          _id: { type: 'string' },
          typeName: { type: 'string', example: 'Dairy' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['password'],
        anyOf: [
          { required: ['username'] },
          { required: ['emailId'] },
          { required: ['identifier'] },
        ],
        properties: {
          username: { type: 'string', example: 'admin_ayushka' },
          emailId: { type: 'string', format: 'email' },
          identifier: {
            type: 'string',
            description: 'Alternative field for a username or email address.',
          },
          password: { type: 'string', format: 'password' },
        },
      },
      LoginResponse: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            required: ['user', 'accessToken', 'tokenType', 'expiresIn'],
            properties: {
              user: { $ref: '#/components/schemas/User' },
              accessToken: { type: 'string' },
              tokenType: { type: 'string', example: 'Bearer' },
              expiresIn: { type: 'string', example: '1h' },
            },
          },
        },
      },
      ForgotPasswordRequest: {
        type: 'object',
        required: ['newPassword'],
        properties: {
          userId: { type: 'string', example: '68d000000000000000000001', description: 'Target user ID (optional for self/email lookup)' },
          emailId: { type: 'string', format: 'email', example: 'user@example.com', description: 'Target user email (optional)' },
          username: { type: 'string', example: 'johndoe', description: 'Target user username (optional)' },
          oldPassword: { type: 'string', format: 'password', example: 'OldPassword@123', description: 'Required for regular/unauthenticated users. Not required for Admin.' },
          newPassword: { type: 'string', format: 'password', example: 'NewSecret@123', description: 'New password (min 8 characters)' },
          confirmPassword: { type: 'string', format: 'password', example: 'NewSecret@123', description: 'Optional confirmation of new password' },
        },
      },
      AddUserRequest: {
        type: 'object',
        required: ['name', 'gaushalaId', 'roleId', 'emailId', 'username', 'password'],
        properties: {
          name: { type: 'string', example: 'Ravi Sharma' },
          gaushalaId: { type: 'string', example: '68d000000000000000000002' },
          roleId: { type: 'string', example: '68d000000000000000000001' },
          emailId: { type: 'string', format: 'email', example: 'ravi@example.com' },
          username: { type: 'string', example: 'ravi_sharma' },
          password: { type: 'string', format: 'password', example: 'Password@123' },
          isActive: { type: 'boolean', example: true },
          fcmToken: { type: 'string', nullable: true, example: null },
        },
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Ravi Sharma' },
          gaushalaId: { type: 'string', example: '68d000000000000000000002' },
          roleId: { type: 'string', example: '68d000000000000000000001' },
          emailId: { type: 'string', format: 'email', example: 'ravi_updated@example.com' },
          username: { type: 'string', example: 'ravi_sharma_updated' },
          password: { type: 'string', format: 'password', example: 'NewPassword@123' },
          isActive: { type: 'boolean', example: true },
          fcmToken: { type: 'string', nullable: true, example: null },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          name: { type: 'string' },
          username: { type: 'string' },
          emailId: { type: 'string', format: 'email' },
          gaushalaId: {
            oneOf: [
              { type: 'string' },
              { $ref: '#/components/schemas/Gaushala' },
            ],
          },
          roleId: {
            oneOf: [
              { type: 'string' },
              { $ref: '#/components/schemas/Role' },
            ],
          },
          isActive: { type: 'boolean' },
          isDeleted: { type: 'boolean' },
          fcmToken: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        additionalProperties: true,
      },
      HealthResponse: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok'] },
              database: { type: 'string', enum: ['connected'] },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      HealthUnavailableResponse: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', enum: [false] },
          data: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['unavailable'] },
              database: { type: 'string', enum: ['disconnected'] },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      ApiError: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', enum: [false] },
          message: { type: 'string' },
          data: { type: 'null', nullable: true },
          stack: { type: 'string' },
        },
      },
      AddCowRequest: {
        type: 'object',
        required: ['breed', 'gaushala_id', 'type', 'tag_id', 'isFemale', 'addedBy'],
        properties: {
          breed: { type: 'string', example: '68d000000000000000000001' },
          gaushala_id: { type: 'string', example: '68d000000000000000000002' },
          type: { type: 'string', example: '68d000000000000000000003' },
          shed_id: { type: 'string', nullable: true, example: '68d000000000000000000004' },
          tag_id: { type: 'string', example: 'GIR-001' },
          dob: { type: 'string', example: '2024-01-15' },
          calf_name: { type: 'string', example: 'Gauri' },
          isFemale: { type: 'boolean', example: true },
          addedBy: { type: 'string', example: '68d000000000000000000005' },
          calf_weight: { type: 'number', example: 250 },
          avatarUrl: { type: 'string', example: '' },
          dam_id: { type: 'string', nullable: true, example: '68d000000000000000000006' },
          sair_id: { type: 'string', nullable: true, example: '68d000000000000000000007' },
          delivery_time: { type: 'string', example: '08:30' },
          send_died_date: { type: 'string', example: '' },
          purchase_date: { type: 'string', example: '2024-01-20' },
          remark: { type: 'string', example: 'Healthy cow' },
        },
      },
      UpdateCowRequest: {
        type: 'object',
        properties: {
          breed: { type: 'string', example: '68d000000000000000000001' },
          gaushala_id: { type: 'string', example: '68d000000000000000000002' },
          type: { type: 'string', example: '68d000000000000000000003' },
          shed_id: { type: 'string', nullable: true, example: '68d000000000000000000004' },
          tag_id: { type: 'string', example: 'GIR-001' },
          dob: { type: 'string', example: '2024-01-15' },
          calf_name: { type: 'string', example: 'Gauri' },
          isFemale: { type: 'boolean', example: true },
          calf_weight: { type: 'number', example: 250 },
          avatarUrl: { type: 'string', example: '' },
          dam_id: { type: 'string', nullable: true, example: '68d000000000000000000006' },
          sair_id: { type: 'string', nullable: true, example: '68d000000000000000000007' },
          delivery_time: { type: 'string', example: '08:30' },
          send_died_date: { type: 'string', example: '' },
          purchase_date: { type: 'string', example: '2024-01-20' },
          remark: { type: 'string', example: 'Updated remark' },
        },
      },
      Cow: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          breed: { type: 'object' },
          gaushala_id: { type: 'object' },
          type: { type: 'object' },
          shed_id: { type: 'object', nullable: true },
          tag_id: { type: 'string', example: 'GIR-001' },
          dob: { type: 'string', example: '2024-01-15' },
          calf_name: { type: 'string', example: 'Gauri' },
          isFemale: { type: 'boolean', example: true },
          isDeleted: { type: 'boolean', example: false },
          addedBy: { type: 'object' },
          calf_weight: { type: 'number', example: 250 },
          avatarUrl: { type: 'string', example: '' },
          dam_id: { type: 'object', nullable: true },
          sair_id: { type: 'object', nullable: true },
          delivery_time: { type: 'string', example: '08:30' },
          send_died_date: { type: 'string', example: '' },
          purchase_date: { type: 'string', example: '2024-01-20' },
          remark: { type: 'string', example: 'Healthy cow' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ShedTransferRequest: {
        type: 'object',
        required: ['gaushalaId', 'to_shed_id'],
        properties: {
          gaushalaId: { type: 'string', example: '6abcaebfd7556202004414a8', description: 'Gaushala ID (all cows and destination shed must belong to this gaushala)' },
          cow_id: { type: 'string', example: '68d000000000000000000010', description: 'Single cow ID to transfer (or provide cow_ids)' },
          cow_ids: { type: 'array', items: { type: 'string' }, example: ['68d000000000000000000010', '68d000000000000000000011'], description: 'Multiple cow IDs for bulk transfer' },
          to_shed_id: { type: 'string', example: '6abcaf13d7556202004414c8', description: 'Destination Shed ID (must belong to entered gaushalaId)' },
          from_shed_id: { type: 'string', nullable: true, example: '68d000000000000000000003', description: 'Optional previous Shed ID (auto-detected if omitted)' },
          reason: { type: 'string', example: 'Moved to milking shed', description: 'Transfer reason/remark' },
          transferDate: { type: 'string', format: 'date-time', description: 'Optional transfer date (defaults to now)' },
        },
      },
      ShedTransferHistory: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          cow_id: {
            oneOf: [
              { type: 'string' },
              { $ref: '#/components/schemas/Cow' },
            ],
          },
          from_shed_id: {
            oneOf: [
              { type: 'string', nullable: true },
              { $ref: '#/components/schemas/Shed' },
            ],
          },
          to_shed_id: {
            oneOf: [
              { type: 'string' },
              { $ref: '#/components/schemas/Shed' },
            ],
          },
          gaushala_id: {
            oneOf: [
              { type: 'string' },
              { $ref: '#/components/schemas/Gaushala' },
            ],
          },
          transferredBy: {
            oneOf: [
              { type: 'string' },
              { $ref: '#/components/schemas/User' },
            ],
          },
          transferDate: { type: 'string', format: 'date-time' },
          reason: { type: 'string', example: 'Moved to milking shed' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

module.exports = openApiSpec;