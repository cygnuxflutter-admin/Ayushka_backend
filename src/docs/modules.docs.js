/**
 * OpenAPI documentation paths for Modules and User Permissions
 */

const moduleAndPermissionPaths = {
  '/api/v1/modules': {
    get: {
      tags: ['Modules'],
      summary: 'Get all system modules and sub-modules',
      operationId: 'getModules',
      security: [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'Modules retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Modules fetched successfully' },
                  data: { type: 'array' },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['Modules'],
      summary: 'Create a new module (Admin only)',
      operationId: 'createModule',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'code'],
              properties: {
                name: { type: 'string', example: 'Medical Stock' },
                code: { type: 'string', example: 'MEDICAL_STOCK' },
                description: { type: 'string', example: 'Veterinary medicine inventory' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Module created successfully' },
      },
    },
  },
  '/api/v1/modules/bulk': {
    post: {
      tags: ['Modules'],
      summary: 'Bulk create or update modules (Admin only)',
      operationId: 'bulkCreateModules',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'code'],
                properties: {
                  name: { type: 'string', example: 'Medical Stock' },
                  code: { type: 'string', example: 'MEDICAL_STOCK' },
                  description: { type: 'string', example: 'Veterinary medicine inventory' },
                  subModules: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        code: { type: 'string' },
                        description: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Modules created/updated successfully' },
      },
    },
  },
  '/api/v1/modules/{id}': {
    get: {
      tags: ['Modules'],
      summary: 'Get module by ID',
      operationId: 'getModuleById',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Module details retrieved' },
      },
    },
  },
  '/api/v1/modules/{id}/update': {
    post: {
      tags: ['Modules'],
      summary: 'Update module (Admin only)',
      operationId: 'updateModule',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                isActive: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Module updated successfully' },
      },
    },
  },
  '/api/v1/modules/{id}/delete': {
    post: {
      tags: ['Modules'],
      summary: 'Delete module (Admin only)',
      operationId: 'deleteModule',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Module deleted successfully' },
      },
    },
  },
  '/api/v1/modules/{id}/submodules': {
    post: {
      tags: ['Modules'],
      summary: 'Add sub-module to module (Admin only)',
      operationId: 'addSubModule',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'code'],
              properties: {
                name: { type: 'string', example: 'Medicine Items' },
                code: { type: 'string', example: 'MEDICAL_ITEMS' },
                description: { type: 'string', example: 'Manage medicine items' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Sub-module added successfully' },
      },
    },
  },
  '/api/v1/modules/{id}/submodules/{subModuleCode}/delete': {
    post: {
      tags: ['Modules'],
      summary: 'Delete sub-module (Admin only)',
      operationId: 'deleteSubModule',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'subModuleCode', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Sub-module deleted successfully' },
      },
    },
  },
  '/api/v1/permissions/my-permissions': {
    get: {
      tags: ['Permissions'],
      summary: 'Get current logged-in user permissions',
      operationId: 'getMyPermissions',
      security: [{ BearerAuth: [] }],
      responses: {
        '200': { description: 'User permissions retrieved' },
      },
    },
  },
  '/api/v1/permissions/users/{userId}': {
    get: {
      tags: ['Permissions'],
      summary: 'Get permissions of a specific user (Admin only)',
      operationId: 'getUserPermissions',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'User permissions retrieved' },
      },
    },
    post: {
      tags: ['Permissions'],
      summary: 'Update permissions of a user (Admin only)',
      operationId: 'setUserPermissions',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['permissions'],
              properties: {
                permissions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      moduleId: { type: 'string' },
                      moduleCode: { type: 'string' },
                      subModuleCode: { type: 'string' },
                      canView: { type: 'boolean' },
                      canAdd: { type: 'boolean' },
                      canEdit: { type: 'boolean' },
                      canDelete: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'User permissions updated' },
      },
    },
  },
  '/api/v1/permissions/users/{userId}/update': {
    post: {
      tags: ['Permissions'],
      summary: 'Update permissions of a user (POST alias, Admin only)',
      operationId: 'updateUserPermissions',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['permissions'],
              properties: {
                permissions: { type: 'array' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'User permissions updated successfully' },
      },
    },
  },
};

module.exports = moduleAndPermissionPaths;
