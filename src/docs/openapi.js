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
      field: ['shedName', 'shedNumber'],
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
        required: ['shedName', 'shedNumber'],
        properties: {
          _id: { type: 'string' },
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
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          name: { type: 'string' },
          username: { type: 'string' },
          emailId: { type: 'string', format: 'email' },
          gaushalaId: { type: 'string' },
          roleId: { type: 'string' },
          isActive: { type: 'boolean' },
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
    },
  },
};

module.exports = openApiSpec;