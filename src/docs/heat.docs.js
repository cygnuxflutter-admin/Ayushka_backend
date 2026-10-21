/**
 * OpenAPI documentation paths for Cow Heat Management Module
 */

const heatPaths = {
  '/api/v1/heats/alerts/active': {
    get: {
      tags: ['Cow Heat Management'],
      summary: 'Get cows currently active in heat (ready for mating)',
      operationId: 'getActiveHeats',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' }, description: 'Gaushala ID' },
      ],
      responses: {
        '200': { description: 'Active heat cows fetched successfully' },
      },
    },
  },
  '/api/v1/heats/alerts/repeat': {
    get: {
      tags: ['Cow Heat Management'],
      summary: 'Get repeat heat alerts (cows with 3 or more consecutive heats without conception)',
      operationId: 'getRepeatHeatAlerts',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' }, description: 'Gaushala ID' },
      ],
      responses: {
        '200': { description: 'Repeat heat alerts fetched successfully' },
      },
    },
  },
  '/api/v1/heats': {
    get: {
      tags: ['Cow Heat Management'],
      summary: 'List cow heat records with filtering and pagination',
      operationId: 'getHeatList',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'cowId', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['OBSERVED', 'READY_FOR_MATING', 'MATED', 'MISSED', 'EXPIRED'] } },
        { name: 'heatStage', in: 'query', required: false, schema: { type: 'string', enum: ['EARLY', 'STANDING', 'LATE'] } },
        { name: 'intensity', in: 'query', required: false, schema: { type: 'string', enum: ['MILD', 'MODERATE', 'STRONG'] } },
        { name: 'isRepeatHeatAlert', in: 'query', required: false, schema: { type: 'boolean' } },
        { name: 'startDate', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'endDate', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Heat records fetched successfully' },
      },
    },
    post: {
      tags: ['Cow Heat Management'],
      summary: 'Record new cow heat observation (triggers alert if 3rd consecutive heat)',
      operationId: 'createHeatRecord',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['cowId', 'heatDate'],
              properties: {
                gaushalaId: { type: 'string' },
                cowId: { type: 'string', example: '67001...' },
                heatDate: { type: 'string', example: '2026-10-13' },
                heatTime: { type: 'string', example: 'morning' },
                heatStage: { type: 'string', enum: ['EARLY', 'STANDING', 'LATE'], default: 'STANDING' },
                heatSigns: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['MOUNTING', 'MUCUS_DISCHARGE', 'BELLOWING'],
                },
                intensity: { type: 'string', enum: ['MILD', 'MODERATE', 'STRONG'], default: 'MODERATE' },
                status: { type: 'string', enum: ['OBSERVED', 'READY_FOR_MATING', 'MATED', 'MISSED', 'EXPIRED'], default: 'READY_FOR_MATING' },
                observedByWorkerId: { type: 'string' },
                remarks: { type: 'string', example: 'High standing heat observed' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Heat observation recorded successfully' },
      },
    },
  },
  '/api/v1/heats/{id}': {
    get: {
      tags: ['Cow Heat Management'],
      summary: 'Get single heat record by ID',
      operationId: 'getHeatById',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Heat record fetched successfully' },
      },
    },
  },
  '/api/v1/heats/{id}/update': {
    post: {
      tags: ['Cow Heat Management'],
      summary: 'Update heat record details',
      operationId: 'updateHeatRecord',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                heatDate: { type: 'string' },
                heatTime: { type: 'string' },
                heatStage: { type: 'string', enum: ['EARLY', 'STANDING', 'LATE'] },
                heatSigns: { type: 'array', items: { type: 'string' } },
                intensity: { type: 'string', enum: ['MILD', 'MODERATE', 'STRONG'] },
                status: { type: 'string', enum: ['OBSERVED', 'READY_FOR_MATING', 'MATED', 'MISSED', 'EXPIRED'] },
                observedByWorkerId: { type: 'string' },
                remarks: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Heat record updated successfully' },
      },
    },
  },
  '/api/v1/heats/{id}/delete': {
    post: {
      tags: ['Cow Heat Management'],
      summary: 'Delete heat record (soft delete)',
      operationId: 'deleteHeatRecord',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Heat record deleted successfully' },
      },
    },
  },
};

module.exports = heatPaths;
