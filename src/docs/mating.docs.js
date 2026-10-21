/**
 * OpenAPI documentation paths for Cow Mating Management Module
 */

const matingPaths = {
  '/api/v1/matings/alerts/repeat-breeders': {
    get: {
      tags: ['Cow Mating Management'],
      summary: 'Get repeat breeder alerts (cows with 3 or more failed matings without conception)',
      operationId: 'getRepeatBreederAlerts',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' }, description: 'Gaushala ID' },
      ],
      responses: {
        '200': { description: 'Repeat breeder alerts fetched successfully' },
      },
    },
  },
  '/api/v1/matings/alerts/pending-pd': {
    get: {
      tags: ['Cow Mating Management'],
      summary: 'Get matings due for Pregnancy Diagnosis (PD) check',
      operationId: 'getPendingPDAlerts',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' }, description: 'Gaushala ID' },
      ],
      responses: {
        '200': { description: 'Pending PD alerts fetched successfully' },
      },
    },
  },
  '/api/v1/matings': {
    get: {
      tags: ['Cow Mating Management'],
      summary: 'List cow mating records with filtering and pagination',
      operationId: 'getMatingList',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'cowId', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['PENDING_PD', 'PREGNANT', 'FAILED', 'CALVED', 'ABORTED'] } },
        { name: 'matingType', in: 'query', required: false, schema: { type: 'string', enum: ['NATURAL', 'ARTIFICIAL'] } },
        { name: 'isRepeatBreederAlert', in: 'query', required: false, schema: { type: 'boolean' } },
        { name: 'startDate', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'endDate', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Mating records fetched successfully' },
      },
    },
    post: {
      tags: ['Cow Mating Management'],
      summary: 'Record new mating entry (Natural service or Artificial Insemination)',
      operationId: 'recordMating',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['cowId', 'matingDate', 'matingType'],
              properties: {
                gaushalaId: { type: 'string' },
                cowId: { type: 'string', example: '67001...' },
                heatId: { type: 'string', description: 'Optional link to Heat record' },
                matingDate: { type: 'string', example: '2026-10-13' },
                matingTime: { type: 'string', example: 'morning' },
                matingType: { type: 'string', enum: ['NATURAL', 'ARTIFICIAL'], example: 'ARTIFICIAL' },
                bullId: { type: 'string', description: 'Sire ID if NATURAL' },
                bullNameOrTag: { type: 'string', description: 'External sire name/tag' },
                semenStrawCode: { type: 'string', example: 'STRAW-GIR-4501' },
                semenBreedId: { type: 'string' },
                semenSource: { type: 'string', example: 'SAG Bidaj' },
                inseminatorName: { type: 'string', example: 'Dr. Sharma' },
                inseminatorWorkerId: { type: 'string' },
                remarks: { type: 'string', example: 'A.I. done with high pedigree Gir bull semen' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Mating recorded successfully' },
      },
    },
  },
  '/api/v1/matings/{id}': {
    get: {
      tags: ['Cow Mating Management'],
      summary: 'Get single mating record by ID',
      operationId: 'getMatingById',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Mating record fetched successfully' },
      },
    },
  },
  '/api/v1/matings/{id}/update': {
    post: {
      tags: ['Cow Mating Management'],
      summary: 'Update mating details',
      operationId: 'updateMating',
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
                matingDate: { type: 'string' },
                matingTime: { type: 'string' },
                matingType: { type: 'string', enum: ['NATURAL', 'ARTIFICIAL'] },
                bullId: { type: 'string' },
                bullNameOrTag: { type: 'string' },
                semenStrawCode: { type: 'string' },
                semenBreedId: { type: 'string' },
                semenSource: { type: 'string' },
                inseminatorName: { type: 'string' },
                inseminatorWorkerId: { type: 'string' },
                remarks: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Mating details updated successfully' },
      },
    },
  },
  '/api/v1/matings/{id}/pd-status': {
    post: {
      tags: ['Cow Mating Management'],
      summary: 'Update Pregnancy Diagnosis (PD) status (POSITIVE marks cow PREGNANT, NEGATIVE marks OPEN)',
      operationId: 'updatePDStatus',
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
              required: ['pdResult'],
              properties: {
                pdResult: { type: 'string', enum: ['POSITIVE', 'NEGATIVE'], example: 'POSITIVE' },
                pdDate: { type: 'string', example: '2026-12-13' },
                pdPerformedBy: { type: 'string', example: 'Dr. Patel' },
                remarks: { type: 'string', example: 'Pregnancy confirmed at 60 days' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'PD status updated successfully' },
      },
    },
  },
  '/api/v1/matings/{id}/calving': {
    post: {
      tags: ['Cow Mating Management'],
      summary: 'Record calving event upon successful delivery of calf',
      operationId: 'recordCalving',
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
                actualCalvingDate: { type: 'string', example: '2027-07-22' },
                remarks: { type: 'string', example: 'Healthy female calf born' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Calving recorded successfully' },
      },
    },
  },
  '/api/v1/matings/{id}/delete': {
    post: {
      tags: ['Cow Mating Management'],
      summary: 'Delete mating record (soft delete)',
      operationId: 'deleteMating',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Mating record deleted successfully' },
      },
    },
  },
};

module.exports = matingPaths;
