/**
 * OpenAPI documentation paths for Cattle Feed / Fodder Stock Management
 */

const feedStockPaths = {
  '/api/v1/feed-stock/items/low-stock': {
    get: {
      tags: ['Feed Stock'],
      summary: 'Get low stock feed items alert',
      operationId: 'getLowStockFeedItems',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Low stock items list' },
      },
    },
  },
  '/api/v1/feed-stock/items': {
    get: {
      tags: ['Feed Stock'],
      summary: 'List feed items with filters',
      operationId: 'getFeedItems',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', schema: { type: 'string' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Feed items list' },
      },
    },
    post: {
      tags: ['Feed Stock'],
      summary: 'Create new feed item master',
      operationId: 'createFeedItem',
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
                itemName: { type: 'string', example: 'Green Grass' },
                category: { type: 'string', enum: ['GREEN_FODDER', 'DRY_FODDER', 'CONCENTRATE_FEED', 'SUPPLEMENT', 'OTHER'] },
                unit: { type: 'string', enum: ['KG', 'TON', 'QUINTAL', 'BAG', 'BUNDLE', 'LITER', 'OTHER'] },
                minStockAlert: { type: 'number', example: 50 },
                initialStock: { type: 'number', example: 100 },
                unitPrice: { type: 'number', example: 10 },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Feed item created' },
      },
    },
  },
  '/api/v1/feed-stock/items/{id}': {
    get: {
      tags: ['Feed Stock'],
      summary: 'Get feed item details by ID',
      operationId: 'getFeedItemById',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Feed item details' },
      },
    },
  },
  '/api/v1/feed-stock/items/{id}/update': {
    post: {
      tags: ['Feed Stock'],
      summary: 'Update feed item (POST alias)',
      operationId: 'updateFeedItem',
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
                isActive: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Feed item updated' },
      },
    },
  },
  '/api/v1/feed-stock/items/{id}/delete': {
    post: {
      tags: ['Feed Stock'],
      summary: 'Delete feed item (POST alias)',
      operationId: 'deleteFeedItem',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Feed item deleted' },
      },
    },
  },
  '/api/v1/feed-stock/summary': {
    get: {
      tags: ['Feed Stock'],
      summary: 'Dashboard summary for feed stock',
      operationId: 'getFeedSummary',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Feed stock dashboard summary' },
      },
    },
  },
  '/api/v1/feed-stock/transactions/inward': {
    post: {
      tags: ['Feed Stock'],
      summary: 'Record feed stock inward (purchase / donation)',
      operationId: 'recordFeedInward',
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
                reason: { type: 'string', example: 'PURCHASE' },
                ratePerUnit: { type: 'number' },
                supplierOrDonorName: { type: 'string' },
                billOrReceiptNo: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Feed inward recorded' },
      },
    },
  },
  '/api/v1/feed-stock/transactions/outward': {
    post: {
      tags: ['Feed Stock'],
      summary: 'Record feed stock outward (daily feeding)',
      operationId: 'recordFeedOutward',
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
                reason: { type: 'string', example: 'DAILY_FEEDING' },
                shedId: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Feed outward recorded' },
      },
    },
  },
  '/api/v1/feed-stock/transactions/adjustment': {
    post: {
      tags: ['Feed Stock'],
      summary: 'Record feed stock adjustment / wastage',
      operationId: 'recordFeedAdjustment',
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
                type: { type: 'string', example: 'WASTAGE' },
                reason: { type: 'string', example: 'DAMAGED_EXPIRED' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Feed adjustment recorded' },
      },
    },
  },
  '/api/v1/feed-stock/transactions': {
    get: {
      tags: ['Feed Stock'],
      summary: 'List feed stock transaction ledger history',
      operationId: 'getFeedTransactions',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', schema: { type: 'string' } },
        { name: 'itemId', in: 'query', schema: { type: 'string' } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Feed transactions history' },
      },
    },
  },
  '/api/v1/feed-stock/transactions/{id}': {
    get: {
      tags: ['Feed Stock'],
      summary: 'Get single feed transaction details by ID',
      operationId: 'getFeedTransactionById',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Feed transaction details' },
      },
    },
  },
};

module.exports = feedStockPaths;
