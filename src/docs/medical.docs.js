/**
 * OpenAPI documentation paths for Veterinary / Medical Stock Management (FEFO)
 */

const medicalStockPaths = {
  '/api/v1/medical-stock/items/low-stock': {
    get: {
      tags: ['Medical Stock'],
      summary: 'Get low stock medicines where totalStock <= minStockAlert',
      operationId: 'getLowStockMedicalItems',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Low stock medicines list' },
      },
    },
  },
  '/api/v1/medical-stock/batches/expiring': {
    get: {
      tags: ['Medical Stock'],
      summary: 'Get batches expiring within specified days (default: 30 days)',
      operationId: 'getExpiringBatches',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', schema: { type: 'string' } },
        { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
      ],
      responses: {
        '200': { description: 'Expiring batches list' },
      },
    },
  },
  '/api/v1/medical-stock/batches': {
    get: {
      tags: ['Medical Stock'],
      summary: 'List medicine batches with filters',
      operationId: 'getMedicalBatches',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', schema: { type: 'string' } },
        { name: 'itemId', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'EXHAUSTED', 'EXPIRED'] } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Batches list' },
      },
    },
  },
  '/api/v1/medical-stock/items': {
    get: {
      tags: ['Medical Stock'],
      summary: 'List medical items with filters and pagination',
      operationId: 'getMedicalItems',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', schema: { type: 'string' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'unit', in: 'query', schema: { type: 'string' } },
        { name: 'lowStockOnly', in: 'query', schema: { type: 'boolean', default: false } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Medical items list' },
      },
    },
    post: {
      tags: ['Medical Stock'],
      summary: 'Create new medical item master',
      operationId: 'createMedicalItem',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['gaushalaId', 'itemName', 'unit'],
              properties: {
                gaushalaId: { type: 'string' },
                itemName: { type: 'string', example: 'Product A' },
                itemCode: { type: 'string', example: 'MED-PROD-A' },
                category: { type: 'string', enum: ['TABLET', 'INJECTION', 'SYRUP', 'VACCINE', 'OINTMENT', 'POWDER', 'DROPS', 'BOLUS', 'ANTIBIOTIC', 'OTHER'] },
                unit: { type: 'string', enum: ['VIAL', 'AMPOULE', 'BOTTLE', 'STRIP', 'TABLET', 'BOLUS', 'TUBE', 'SACHET', 'ML', 'LITER', 'KG', 'GM', 'BOX', 'PCS', 'OTHER'] },
                minStockAlert: { type: 'number', example: 50 },
                manufacturer: { type: 'string', example: 'Pharma Co' },
                description: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Medical item created successfully' },
      },
    },
  },
  '/api/v1/medical-stock/items/{id}': {
    get: {
      tags: ['Medical Stock'],
      summary: 'Get medical item details with active batches',
      operationId: 'getMedicalItemById',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Item details with active batches' },
      },
    },
  },
  '/api/v1/medical-stock/items/{id}/update': {
    post: {
      tags: ['Medical Stock'],
      summary: 'Update medical item (POST alias)',
      operationId: 'updateMedicalItem',
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
                itemName: { type: 'string' },
                category: { type: 'string' },
                unit: { type: 'string' },
                minStockAlert: { type: 'number' },
                manufacturer: { type: 'string' },
                description: { type: 'string' },
                isActive: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Medical item updated' },
      },
    },
  },
  '/api/v1/medical-stock/items/{id}/delete': {
    post: {
      tags: ['Medical Stock'],
      summary: 'Delete medical item (POST alias)',
      operationId: 'deleteMedicalItem',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Medical item deleted' },
      },
    },
  },
  '/api/v1/medical-stock/summary': {
    get: {
      tags: ['Medical Stock'],
      summary: 'Dashboard summary for medical stock',
      operationId: 'getMedicalSummary',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Medical stock summary' },
      },
    },
  },
  '/api/v1/medical-stock/transactions/inward': {
    post: {
      tags: ['Medical Stock'],
      summary: 'Record stock inward with batches and expiry dates',
      operationId: 'recordMedicalInward',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['gaushalaId', 'itemId'],
              properties: {
                gaushalaId: { type: 'string' },
                itemId: { type: 'string' },
                reason: { type: 'string', example: 'PURCHASE' },
                supplierOrDonorName: { type: 'string' },
                billOrReceiptNo: { type: 'string' },
                batches: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['batchNumber', 'expiryDate', 'quantity'],
                    properties: {
                      batchNumber: { type: 'string', example: 'BAT-2027-01' },
                      expiryDate: { type: 'string', format: 'date', example: '2027-10-12' },
                      quantity: { type: 'number', example: 200 },
                      unitPrice: { type: 'number', example: 45 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Medical inward recorded' },
      },
    },
  },
  '/api/v1/medical-stock/transactions/outward': {
    post: {
      tags: ['Medical Stock'],
      summary: 'Record stock outward with automated FEFO deduction',
      operationId: 'recordMedicalOutward',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['gaushalaId', 'itemId', 'quantity'],
              properties: {
                gaushalaId: { type: 'string' },
                itemId: { type: 'string' },
                quantity: { type: 'number', example: 300 },
                reason: { type: 'string', example: 'TREATMENT' },
                cowId: { type: 'string' },
                shedId: { type: 'string' },
                doctorName: { type: 'string' },
                prescribedFor: { type: 'string' },
                notes: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Medical outward recorded via FEFO' },
      },
    },
  },
  '/api/v1/medical-stock/transactions/adjustment': {
    post: {
      tags: ['Medical Stock'],
      summary: 'Record stock adjustment or expired stock disposal',
      operationId: 'recordMedicalAdjustment',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['gaushalaId', 'itemId', 'quantity'],
              properties: {
                gaushalaId: { type: 'string' },
                itemId: { type: 'string' },
                quantity: { type: 'number' },
                batchId: { type: 'string' },
                type: { type: 'string', example: 'EXPIRED_DISPOSAL' },
                reason: { type: 'string', example: 'EXPIRED_DISPOSAL' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Adjustment recorded' },
      },
    },
  },
  '/api/v1/medical-stock/transactions': {
    get: {
      tags: ['Medical Stock'],
      summary: 'List medical stock transaction ledger history',
      operationId: 'getMedicalTransactions',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', schema: { type: 'string' } },
        { name: 'itemId', in: 'query', schema: { type: 'string' } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
        { name: 'reason', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Transactions history list' },
      },
    },
  },
  '/api/v1/medical-stock/transactions/{id}': {
    get: {
      tags: ['Medical Stock'],
      summary: 'Get single medical transaction details by ID',
      operationId: 'getMedicalTransactionById',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Transaction details' },
      },
    },
  },
};

module.exports = medicalStockPaths;
