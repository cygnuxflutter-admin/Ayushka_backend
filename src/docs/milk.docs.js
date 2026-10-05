/**
 * OpenAPI documentation paths for Milk Production & Distribution Module
 */

const milkPaths = {
  '/api/v1/milk/daily-summary': {
    get: {
      tags: ['Milk Management'],
      summary: 'Get daily milk production, distribution, and fridge stock summary',
      operationId: 'getDailyMilkSummary',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' }, description: 'Gaushala ID' },
        { name: 'date', in: 'query', required: false, schema: { type: 'string' }, description: 'Date in YYYY-MM-DD format (defaults to today)' },
      ],
      responses: {
        '200': { description: 'Daily summary fetched successfully' },
      },
    },
  },
  '/api/v1/milk/fridge-stock': {
    get: {
      tags: ['Milk Management'],
      summary: 'Get all dates with remaining leftover milk stored in fridge',
      operationId: 'getFridgeMilkStock',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' }, description: 'Gaushala ID' },
      ],
      responses: {
        '200': { description: 'Fridge milk stock fetched successfully' },
      },
    },
  },
  '/api/v1/milk/production': {
    get: {
      tags: ['Milk Management'],
      summary: 'List cow-wise milk production records',
      operationId: 'getMilkProductionList',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'date', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'startDate', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'endDate', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'shift', in: 'query', required: false, schema: { type: 'string', enum: ['morning', 'evening'] } },
        { name: 'cowId', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'workerId', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Production records fetched successfully' },
      },
    },
    post: {
      tags: ['Milk Management'],
      summary: 'Record single cow milk production (triggers daily variance alert if +-10%)',
      operationId: 'recordSingleMilkProduction',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['gaushalaId', 'date', 'shift', 'cowId', 'workerId', 'quantity'],
              properties: {
                gaushalaId: { type: 'string' },
                date: { type: 'string', example: '2026-10-02' },
                shift: { type: 'string', enum: ['morning', 'evening'], example: 'morning' },
                cowId: { type: 'string' },
                workerId: { type: 'string' },
                quantity: { type: 'number', example: 12.5 },
                fat: { type: 'number', example: 4.2 },
                snf: { type: 'number', example: 8.5 },
                remarks: { type: 'string', example: 'Normal milking' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Milk production recorded successfully' },
      },
    },
  },
  '/api/v1/milk/production/bulk': {
    post: {
      tags: ['Milk Management'],
      summary: 'Record bulk cow milk production for a shift (triggers alerts per cow)',
      operationId: 'recordBulkMilkProduction',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['gaushalaId', 'date', 'shift', 'entries'],
              properties: {
                gaushalaId: { type: 'string' },
                date: { type: 'string', example: '2026-10-02' },
                shift: { type: 'string', enum: ['morning', 'evening'], example: 'morning' },
                workerId: { type: 'string', description: 'Default worker ID for all entries if not specified per entry' },
                entries: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['cowId', 'quantity'],
                    properties: {
                      cowId: { type: 'string' },
                      workerId: { type: 'string' },
                      quantity: { type: 'number', example: 10.5 },
                      fat: { type: 'number', example: 4.0 },
                      snf: { type: 'number', example: 8.5 },
                      remarks: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Bulk production recorded successfully' },
      },
    },
  },
  '/api/v1/milk/distribution': {
    get: {
      tags: ['Milk Management'],
      summary: 'List milk distribution records',
      operationId: 'getMilkDistributionList',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'milkDate', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'shift', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'recipientType', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Distribution records fetched successfully' },
      },
    },
    post: {
      tags: ['Milk Management'],
      summary: 'Record milk distribution (same-day shift-wise or delayed from ALL milk)',
      operationId: 'recordMilkDistribution',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['gaushalaId', 'milkDate', 'quantity'],
              properties: {
                gaushalaId: { type: 'string' },
                milkDate: { type: 'string', example: '2026-10-02', description: 'Production date of the milk being distributed' },
                shift: { type: 'string', enum: ['morning', 'evening', 'all'], description: 'Required for same-day distribution (morning or evening)' },
                quantity: { type: 'number', example: 25.0 },
                recipientType: { type: 'string', enum: ['customer', 'dairy_plant', 'calf_feeding', 'staff', 'other'], example: 'customer' },
                recipientName: { type: 'string', example: 'Ramesh Patel' },
                customerId: { type: 'string' },
                ratePerLiter: { type: 'number', example: 60.0 },
                remarks: { type: 'string', example: 'Daily morning supply' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Milk distribution recorded successfully' },
      },
    },
  },
  '/api/v1/milk/dispose': {
    get: {
      tags: ['Milk Management'],
      summary: 'List spoiled/waste milk disposal records',
      operationId: 'getMilkDisposalList',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'milkDate', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'disposalDate', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'reason', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Disposal records fetched successfully' },
      },
    },
    post: {
      tags: ['Milk Management'],
      summary: 'Record disposal of spoiled/waste milk from fridge',
      operationId: 'recordMilkDisposal',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['gaushalaId', 'milkDate', 'quantity'],
              properties: {
                gaushalaId: { type: 'string' },
                milkDate: { type: 'string', example: '2026-10-02', description: 'Date of spoiled milk batch' },
                disposalDate: { type: 'string', example: '2026-10-04' },
                quantity: { type: 'number', example: 10.0 },
                reason: { type: 'string', enum: ['spoiled', 'sour', 'temperature_failure', 'contamination', 'other'], example: 'spoiled' },
                reportedBy: { type: 'string', description: 'Worker ID' },
                remarks: { type: 'string', example: 'Curdled due to power cut' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Disposal recorded successfully' },
      },
    },
  },
  '/api/v1/milk/alerts/check-monthly': {
    post: {
      tags: ['Milk Management'],
      summary: 'Run monthly variance alert check across all cows (Month M vs M-1)',
      operationId: 'checkMonthlyMilkAlerts',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['gaushalaId'],
              properties: {
                gaushalaId: { type: 'string' },
                year: { type: 'integer', example: 2026 },
                month: { type: 'integer', example: 9, description: '1-12' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Monthly variance check completed and alerts generated' },
      },
    },
  },
};

module.exports = milkPaths;
