/**
 * OpenAPI documentation paths for Cow Treatment and Notification Modules
 */

const treatmentPaths = {
  '/api/v1/treatments/dashboard/summary': {
    get: {
      tags: ['Cow Treatment'],
      summary: 'Get dashboard summary metrics for treatments',
      operationId: 'getTreatmentSummary',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Treatment dashboard summary metrics' },
      },
    },
  },
  '/api/v1/treatments/doses/today-due': {
    get: {
      tags: ['Cow Treatment'],
      summary: 'Get list of treatments with doses scheduled/due today',
      operationId: 'getTodayDueDoses',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Today due doses list' },
      },
    },
  },
  '/api/v1/treatments': {
    get: {
      tags: ['Cow Treatment'],
      summary: 'Get all treatments with filtering and pagination',
      operationId: 'getTreatments',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'cowId', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['UNDER_TREATMENT', 'RECOVERED', 'CRITICAL', 'REFERRED', 'DECEASED', 'CLOSED'] } },
        { name: 'severity', in: 'query', schema: { type: 'string', enum: ['MILD', 'MODERATE', 'CRITICAL'] } },
        { name: 'diseaseName', in: 'query', schema: { type: 'string' } },
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Treatments list' },
      },
    },
    post: {
      tags: ['Cow Treatment'],
      summary: 'Create a new treatment case with multi-dose schedule and hybrid medicines',
      operationId: 'createTreatment',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['gaushalaId', 'cowId', 'diseaseName'],
              properties: {
                gaushalaId: { type: 'string', example: '65b...' },
                cowId: { type: 'string', example: '65b...' },
                diseaseName: { type: 'string', example: 'Acute Bovine Mastitis' },
                symptoms: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['Udder swelling', 'High temperature', 'Milk clot'],
                },
                diagnosisNotes: { type: 'string', example: 'Severe bacterial infection in left quarter' },
                severity: { type: 'string', enum: ['MILD', 'MODERATE', 'CRITICAL'], default: 'MODERATE' },
                doctorName: { type: 'string', example: 'Dr. Rajesh Patel' },
                doctorContact: { type: 'string', example: '+91 9876543210' },
                doctorType: { type: 'string', enum: ['IN_HOUSE', 'VISITING_VET', 'GOVERNMENT', 'OTHER'], default: 'VISITING_VET' },
                totalDoses: { type: 'integer', example: 3 },
                doseIntervalDays: { type: 'integer', example: 1 },
                scheduledDoseDates: {
                  type: 'array',
                  items: { type: 'string', format: 'date-time' },
                },
                medicines: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['medicineName'],
                    properties: {
                      isStockItem: { type: 'boolean', example: false },
                      itemId: { type: 'string', example: 'null' },
                      medicineName: { type: 'string', example: 'Melonex Plus Bolus' },
                      dosage: { type: 'string', example: '2 Bolus' },
                      unit: { type: 'string', example: 'BOLUS' },
                      route: { type: 'string', example: 'ORAL' },
                      notes: { type: 'string', example: 'Post feeding' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Treatment case created successfully' },
      },
    },
  },
  '/api/v1/treatments/{id}': {
    get: {
      tags: ['Cow Treatment'],
      summary: 'Get single treatment details',
      operationId: 'getTreatmentById',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Treatment record details' },
      },
    },
  },
  '/api/v1/treatments/{id}/update': {
    post: {
      tags: ['Cow Treatment'],
      summary: 'Update treatment details',
      operationId: 'updateTreatment',
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
                diseaseName: { type: 'string' },
                symptoms: { type: 'array', items: { type: 'string' } },
                diagnosisNotes: { type: 'string' },
                severity: { type: 'string', enum: ['MILD', 'MODERATE', 'CRITICAL'] },
                doctorName: { type: 'string' },
                doctorContact: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Treatment updated successfully' },
      },
    },
  },
  '/api/v1/treatments/{id}/doses/{doseNumber}/administer': {
    post: {
      tags: ['Cow Treatment'],
      summary: 'Administer / mark a specific dose as given',
      operationId: 'administerDose',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'doseNumber', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                administeredDate: { type: 'string', format: 'date-time' },
                administeredBy: { type: 'string', example: 'Dr. Rajesh Patel' },
                notes: { type: 'string', example: 'Dose administered as planned' },
                recoveryNotes: { type: 'string', example: 'Full recovery observed' },
                markCompleted: { type: 'boolean', default: true },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Dose administered successfully' },
      },
    },
  },
  '/api/v1/treatments/{id}/status': {
    post: {
      tags: ['Cow Treatment'],
      summary: 'Update treatment status (e.g. RECOVERED, CRITICAL, DECEASED, CLOSED)',
      operationId: 'updateTreatmentStatus',
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
              required: ['status'],
              properties: {
                status: {
                  type: 'string',
                  enum: ['UNDER_TREATMENT', 'RECOVERED', 'CRITICAL', 'REFERRED', 'DECEASED', 'CLOSED'],
                  example: 'RECOVERED',
                },
                recoveryNotes: { type: 'string', example: 'Cow recovered completely' },
                markCowDied: { type: 'boolean', default: false },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Treatment status updated successfully' },
      },
    },
  },
  '/api/v1/treatments/{id}/delete': {
    post: {
      tags: ['Cow Treatment'],
      summary: 'Soft delete treatment record',
      operationId: 'deleteTreatment',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Treatment deleted successfully' },
      },
    },
  },
  '/api/v1/notifications/unread-count': {
    get: {
      tags: ['Notifications'],
      summary: 'Get unread notifications count for bell icon badge',
      operationId: 'getUnreadNotificationsCount',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Unread count' },
      },
    },
  },
  '/api/v1/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'Get notifications list (automatically refreshes due dose alerts)',
      operationId: 'getNotifications',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'gaushalaId', in: 'query', schema: { type: 'string' } },
        { name: 'isRead', in: 'query', schema: { type: 'boolean' } },
        { name: 'type', in: 'query', schema: { type: 'string', enum: ['TREATMENT_DOSE', 'MEDICAL_STOCK_ALERT', 'GENERAL'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Notifications list' },
      },
    },
  },
  '/api/v1/notifications/read-all': {
    post: {
      tags: ['Notifications'],
      summary: 'Mark all notifications as read',
      operationId: 'markAllNotificationsAsRead',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                gaushalaId: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'All notifications marked as read' },
      },
    },
  },
  '/api/v1/notifications/{id}/read': {
    post: {
      tags: ['Notifications'],
      summary: 'Mark single notification as read',
      operationId: 'markNotificationAsRead',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Notification marked as read' },
      },
    },
  },
  '/api/v1/notifications/{id}/delete': {
    post: {
      tags: ['Notifications'],
      summary: 'Delete notification',
      operationId: 'deleteNotification',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Notification deleted successfully' },
      },
    },
  },
};

module.exports = treatmentPaths;
