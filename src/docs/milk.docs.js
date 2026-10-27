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
  '/api/v1/milk/matrix': {
    get: {
      tags: ['Milk Management'],
      summary: 'Get cow-wise milk production matrix for date range (max 30 days, Morning & Evening grid)',
      operationId: 'getMilkProductionMatrix',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'startDate', in: 'query', required: true, schema: { type: 'string' }, description: 'Start date in YYYY-MM-DD format (mandatory)' },
        { name: 'endDate', in: 'query', required: true, schema: { type: 'string' }, description: 'End date in YYYY-MM-DD format (mandatory, max 30 days after startDate)' },
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' }, description: 'Gaushala ID (auto-resolved from token for non-superadmins)' },
        { name: 'cowId', in: 'query', required: false, schema: { type: 'string' }, description: 'Optional cow ID filter' },
        { name: 'shedId', in: 'query', required: false, schema: { type: 'string' }, description: 'Optional shed ID filter' },
        { name: 'includeAllCows', in: 'query', required: false, schema: { type: 'boolean', default: false }, description: 'Include all cows in gaushala even if 0 milk records' },
        { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'excel'] }, description: 'Set to excel to download .xlsx directly' },
      ],
      responses: {
        '200': { description: 'Milk production matrix fetched or Excel downloaded successfully' },
        '400': { description: 'Validation error (missing dates, startDate > endDate, or range > 30 days)' },
      },
    },
  },
  '/api/v1/milk/matrix/export-excel': {
    get: {
      tags: ['Milk Management'],
      summary: 'Export cow-wise milk production matrix as styled Excel spreadsheet (.xlsx)',
      operationId: 'exportMilkProductionMatrixExcel',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'startDate', in: 'query', required: true, schema: { type: 'string' }, description: 'Start date in YYYY-MM-DD format (mandatory)' },
        { name: 'endDate', in: 'query', required: true, schema: { type: 'string' }, description: 'End date in YYYY-MM-DD format (mandatory, max 30 days after startDate)' },
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' }, description: 'Gaushala ID' },
        { name: 'cowId', in: 'query', required: false, schema: { type: 'string' }, description: 'Optional cow ID filter' },
        { name: 'shedId', in: 'query', required: false, schema: { type: 'string' }, description: 'Optional shed ID filter' },
      ],
      responses: {
        '200': { description: 'Excel spreadsheet buffer downloaded successfully' },
        '400': { description: 'Validation error' },
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
  '/api/v1/milk/import-template': {
    get: {
      tags: ['Milk Management'],
      summary: 'Download dynamic Milk Production Excel Import Template with database dropdowns',
      operationId: 'downloadMilkImportTemplate',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' }, description: 'Gaushala ID to scope dropdown cattle & workers' },
        { name: 'date', in: 'query', required: false, schema: { type: 'string' }, description: 'Date (YYYY-MM-DD) to pre-fill rows (defaults to today)' },
        { name: 'shift', in: 'query', required: false, schema: { type: 'string', enum: ['morning', 'evening'] }, description: 'Default shift to pre-fill rows' },
      ],
      responses: {
        '200': { description: 'Dynamic Excel template downloaded (.xlsx)' },
      },
    },
  },
  '/api/v1/milk/upload-excel': {
    post: {
      tags: ['Milk Management'],
      summary: 'Bulk import milk production records from Excel or CSV file',
      operationId: 'importMilkProductionExcel',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: { type: 'string', format: 'binary', description: 'Excel (.xlsx, .xls) or CSV (.csv) file' },
                gaushalaId: { type: 'string', description: 'Default Gaushala ID (optional, overrides row gaushala)' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Milk production records imported successfully' },
        '400': { description: 'Bad request or parsing error' },
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
