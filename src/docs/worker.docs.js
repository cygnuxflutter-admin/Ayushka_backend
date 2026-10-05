/**
 * OpenAPI documentation paths for Department and Worker Management Modules
 */

const workerAndDepartmentPaths = {
  // ==========================================
  // DEPARTMENT PATHS
  // ==========================================
  '/api/v1/departments': {
    get: {
      tags: ['Staff & Departments'],
      summary: 'List all departments (with worker statistics)',
      operationId: 'getDepartments',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by Gaushala ID' },
        { name: 'isActive', in: 'query', required: false, schema: { type: 'boolean' }, description: 'Filter by active status' },
        { name: 'search', in: 'query', required: false, schema: { type: 'string' }, description: 'Search department name' },
      ],
      responses: {
        '200': { description: 'Departments list fetched successfully' },
      },
    },
    post: {
      tags: ['Staff & Departments'],
      summary: 'Create a new department',
      operationId: 'createDepartment',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['gaushalaId', 'departmentName'],
              properties: {
                gaushalaId: { type: 'string', example: '65f1234567890abcdef12345' },
                departmentName: { type: 'string', example: 'Milking' },
                departmentCode: { type: 'string', example: 'MILK' },
                description: { type: 'string', example: 'Cow milking and dairy collection department' },
                isActive: { type: 'boolean', example: true },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Department created successfully' },
      },
    },
  },
  '/api/v1/departments/{id}': {
    get: {
      tags: ['Staff & Departments'],
      summary: 'Get department details by ID',
      operationId: 'getDepartmentById',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Department fetched successfully' },
        '404': { description: 'Department not found' },
      },
    },
  },
  '/api/v1/departments/{id}/update': {
    post: {
      tags: ['Staff & Departments'],
      summary: 'Update department details (Admin / Authorized)',
      operationId: 'updateDepartment',
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
                departmentName: { type: 'string', example: 'Milking & Dairy' },
                departmentCode: { type: 'string', example: 'MILK' },
                description: { type: 'string', example: 'Updated description' },
                isActive: { type: 'boolean', example: true },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Department updated successfully' },
        '404': { description: 'Department not found' },
      },
    },
  },
  '/api/v1/departments/{id}/delete': {
    post: {
      tags: ['Staff & Departments'],
      summary: 'Delete department (checks no workers are assigned)',
      operationId: 'deleteDepartment',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Department deleted successfully' },
        '409': { description: 'Cannot delete: workers assigned to department' },
      },
    },
  },
  '/api/v1/departments/{id}/workers': {
    get: {
      tags: ['Staff & Departments'],
      summary: 'Get all workers belonging to this department',
      operationId: 'getDepartmentWorkers',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Department ID' },
        { name: 'isActive', in: 'query', required: false, schema: { type: 'boolean' } },
        { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 50 } },
      ],
      responses: {
        '200': { description: 'Department workers fetched successfully' },
      },
    },
  },

  // ==========================================
  // WORKER PATHS
  // ==========================================
  '/api/v1/workers/department-summary': {
    get: {
      tags: ['Workers'],
      summary: 'Department-wise worker count breakdown & summary metrics',
      operationId: 'getDepartmentWiseSummary',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: true, schema: { type: 'string' }, description: 'Gaushala ID' },
      ],
      responses: {
        '200': { description: 'Department-wise worker breakdown fetched successfully' },
      },
    },
  },
  '/api/v1/workers': {
    get: {
      tags: ['Workers'],
      summary: 'List workers (filter by department, gaushala, active status, search)',
      operationId: 'getWorkers',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by Gaushala ID' },
        { name: 'departmentId', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by Department ID' },
        { name: 'isActive', in: 'query', required: false, schema: { type: 'boolean' }, description: 'Filter by active status' },
        { name: 'search', in: 'query', required: false, schema: { type: 'string' }, description: 'Search worker name' },
        { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 50 } },
      ],
      responses: {
        '200': { description: 'Workers list fetched successfully' },
      },
    },
    post: {
      tags: ['Workers'],
      summary: 'Create a new worker profile',
      operationId: 'createWorker',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['gaushalaId', 'departmentId', 'name'],
              properties: {
                gaushalaId: { type: 'string', example: '65f1234567890abcdef12345' },
                departmentId: { type: 'string', example: '65f9876543210abcdef54321' },
                name: { type: 'string', example: 'Ramesh Patel' },
                joiningDate: { type: 'string', format: 'date-time', example: '2024-01-15T00:00:00.000Z' },
                leavingDate: { type: 'string', format: 'date-time', nullable: true, example: null },
                isActive: { type: 'boolean', default: true, example: true },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Worker profile created successfully' },
      },
    },
  },
  '/api/v1/workers/{id}': {
    get: {
      tags: ['Workers'],
      summary: 'Get worker profile by ID',
      operationId: 'getWorkerById',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Worker profile fetched successfully' },
        '404': { description: 'Worker not found' },
      },
    },
  },
  '/api/v1/workers/{id}/update': {
    post: {
      tags: ['Workers'],
      summary: 'Update worker details (Admin can update name, department, status, dates)',
      operationId: 'updateWorker',
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
                name: { type: 'string', example: 'Ramesh Patel (Senior)' },
                departmentId: { type: 'string', example: '65f9876543210abcdef54321' },
                isActive: { type: 'boolean', example: true },
                joiningDate: { type: 'string', format: 'date-time' },
                leavingDate: { type: 'string', format: 'date-time', nullable: true },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Worker updated successfully' },
        '404': { description: 'Worker not found' },
      },
    },
  },
  '/api/v1/workers/{id}/status': {
    post: {
      tags: ['Workers'],
      summary: 'Toggle worker status (active / deactive)',
      operationId: 'toggleWorkerStatus',
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
              required: ['isActive'],
              properties: {
                isActive: { type: 'boolean', example: false, description: 'True for active, false for inactive (worker left)' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Worker status toggled successfully' },
      },
    },
  },
  '/api/v1/workers/{id}/leave': {
    post: {
      tags: ['Workers'],
      summary: 'Mark worker as left Gaushala (isActive = false, isDelete = false, records leavingDate)',
      operationId: 'markWorkerLeft',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                leavingDate: { type: 'string', format: 'date-time', example: '2024-06-30T00:00:00.000Z' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Worker marked as left Gaushala successfully' },
      },
    },
  },
  '/api/v1/workers/{id}/delete': {
    post: {
      tags: ['Workers'],
      summary: 'Soft delete worker record (isDelete = true, isActive = false)',
      operationId: 'deleteWorker',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Worker deleted successfully' },
      },
    },
  },
};

module.exports = workerAndDepartmentPaths;
