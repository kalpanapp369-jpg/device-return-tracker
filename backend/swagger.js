const swaggerJsdoc  = require('swagger-jsdoc');
const swaggerUi     = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'Device Return & Damage Tracker API',
      version:     '4.0.0',
      description: `
## Device Return & Damage Tracker
**One Point Solutions — Internship Project**

A complete REST API for tracking device returns, damage assessment, deposit settlements and photo evidence.

### Features
- 🔐 JWT Authentication with Role-based Access (Admin / Staff)
- 📦 Full CRUD for return records
- ⚖️ Settlement workflow (Approve / Reject / Settle)
- 📷 Damage photo upload
- 📊 Analytics & reporting
- 📋 Audit log for every action
- 📧 Email notifications via Nodemailer

### Auth
All protected endpoints require a Bearer token in the Authorization header.
Get a token by calling \`POST /api/auth/login\`.
      `,
      contact: { name: 'One Point Solutions', email: 'admin@onepointsolutions.com' },
      license: { name: 'MIT' }
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Local Development' },
      { url: 'https://your-app.railway.app', description: 'Production (Railway)' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
          description:  'Enter your JWT token from POST /api/auth/login'
        }
      },
      schemas: {
        ReturnRecord: {
          type: 'object',
          properties: {
            id:                { type: 'integer', example: 1 },
            booking_id:        { type: 'integer', example: 1 },
            return_date:       { type: 'string', format: 'date', example: '2026-06-10' },
            device_condition:  { type: 'string', enum: ['Good','Minor Scratches','Major Damage','Non-Functional'], example: 'Minor Scratches' },
            damage_description:{ type: 'string', example: 'Small scratch on lid' },
            repair_cost:       { type: 'number', example: 500.00 },
            deposit_deduction: { type: 'number', example: 500.00 },
            deposit_refund:    { type: 'number', example: 4500.00 },
            settlement_status: { type: 'string', enum: ['Pending','Approved','Rejected','Settled'], example: 'Pending' },
            approved_by:       { type: 'string', example: 'Admin User' },
            notes:             { type: 'string', example: 'Customer informed' },
            customer_name:     { type: 'string', example: 'Ravi Kumar' },
            device_name:       { type: 'string', example: 'Dell Laptop 15"' },
            created_at:        { type: 'string', format: 'date-time' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id:         { type: 'integer', example: 1 },
            name:       { type: 'string', example: 'Admin User' },
            email:      { type: 'string', example: 'admin@example.com' },
            role:       { type: 'string', enum: ['admin','staff'], example: 'admin' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data:    { }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error description' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth',       description: 'Login, register, user management' },
      { name: 'Returns',    description: 'Return record CRUD with pagination & filtering' },
      { name: 'Settlement', description: 'Approve, reject, settle return records' },
      { name: 'Upload',     description: 'Damage photo upload & management' },
      { name: 'Analytics',  description: 'Dashboard stats and charts data' },
      { name: 'Audit',      description: 'Audit log — admin only' }
    ],
    paths: {
      // ── AUTH ──────────────────────────────────────────────────────────────
      '/api/auth/login': {
        post: {
          tags: ['Auth'], summary: 'Login', security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { type:'object', required:['email','password'], properties: { email:{type:'string',example:'admin@example.com'}, password:{type:'string',example:'password123'} } } } } },
          responses: {
            200: { description: 'Login successful', content: { 'application/json': { schema: { type:'object', properties: { success:{type:'boolean'}, token:{type:'string'}, user:{ $ref:'#/components/schemas/User' } } } } } },
            401: { description: 'Invalid credentials' }
          }
        }
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'], summary: 'Register first admin (only if no users exist)', security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { type:'object', required:['name','email','password'], properties: { name:{type:'string',example:'Admin'}, email:{type:'string'}, password:{type:'string',example:'securepass123'} } } } } },
          responses: { 201: { description: 'Admin created' }, 403: { description: 'Registration closed' } }
        }
      },
      '/api/auth/me': {
        get: { tags: ['Auth'], summary: 'Get current user', responses: { 200: { description: 'Current user info' }, 401: { description: 'Unauthorized' } } }
      },
      '/api/auth/users': {
        get: { tags: ['Auth'], summary: 'List all users (admin only)', responses: { 200: { description: 'User list' }, 403: { description: 'Admin only' } } },
        post: { tags: ['Auth'], summary: 'Add staff user (admin only)', requestBody: { required:true, content: { 'application/json': { schema: { type:'object', properties: { name:{type:'string'}, email:{type:'string'}, password:{type:'string'}, role:{type:'string',enum:['admin','staff']} } } } } }, responses: { 201: { description: 'User created' }, 403: { description: 'Admin only' } } }
      },
      '/api/auth/users/{id}': {
        delete: { tags:['Auth'], summary:'Delete user (admin only)', parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}], responses:{200:{description:'Deleted'},403:{description:'Admin only'}} }
      },
      // ── RETURNS ───────────────────────────────────────────────────────────
      '/api/returns': {
        get: {
          tags: ['Returns'], summary: 'Get all return records with filters & pagination',
          parameters: [
            { name:'page',      in:'query', schema:{type:'integer',default:1},    description:'Page number' },
            { name:'limit',     in:'query', schema:{type:'integer',default:15},   description:'Records per page (max 100)' },
            { name:'sort',      in:'query', schema:{type:'string',enum:['created_at','return_date','repair_cost','settlement_status','device_condition'],default:'created_at'} },
            { name:'order',     in:'query', schema:{type:'string',enum:['asc','desc'],default:'desc'} },
            { name:'status',    in:'query', schema:{type:'string',enum:['Pending','Approved','Rejected','Settled']}, description:'Filter by settlement status' },
            { name:'condition', in:'query', schema:{type:'string',enum:['Good','Minor Scratches','Major Damage','Non-Functional']}, description:'Filter by device condition' },
            { name:'search',    in:'query', schema:{type:'string'}, description:'Search customer name, device, booking ID' },
            { name:'from',      in:'query', schema:{type:'string',format:'date'}, description:'Return date from' },
            { name:'to',        in:'query', schema:{type:'string',format:'date'}, description:'Return date to' }
          ],
          responses: { 200: { description: 'Paginated return records', content: { 'application/json': { schema: { type:'object', properties: { success:{type:'boolean'}, data:{type:'array',items:{$ref:'#/components/schemas/ReturnRecord'}}, total:{type:'integer'}, page:{type:'integer'}, totalPages:{type:'integer'} } } } } } }
        },
        post: {
          tags: ['Returns'], summary: 'Create a new return record',
          requestBody: { required:true, content: { 'application/json': { schema: { type:'object', required:['booking_id','return_date','device_condition'], properties: { booking_id:{type:'integer',example:1}, return_date:{type:'string',format:'date',example:'2026-06-10'}, device_condition:{type:'string',enum:['Good','Minor Scratches','Major Damage','Non-Functional']}, damage_description:{type:'string'}, repair_cost:{type:'number',example:500}, notes:{type:'string'} } } } } },
          responses: { 201: { description: 'Record created' }, 400: { description: 'Validation error' }, 404: { description: 'Booking not found' } }
        }
      },
      '/api/returns/{id}': {
        get:    { tags:['Returns'], summary:'Get single record', parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}], responses:{200:{description:'Record found'},404:{description:'Not found'}} },
        put:    { tags:['Returns'], summary:'Update a record', parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}], requestBody:{required:true,content:{'application/json':{schema:{type:'object',properties:{return_date:{type:'string'},device_condition:{type:'string'},repair_cost:{type:'number'},settlement_status:{type:'string'},notes:{type:'string'}}}}}}, responses:{200:{description:'Updated'},404:{description:'Not found'}} },
        delete: { tags:['Returns'], summary:'Delete a record (admin only)', parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}], responses:{200:{description:'Deleted'},403:{description:'Admin only'},404:{description:'Not found'}} }
      },
      // ── SETTLEMENT ────────────────────────────────────────────────────────
      '/api/settlement/{id}/approve': { put: { tags:['Settlement'], summary:'Approve settlement + send email', parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}], requestBody:{content:{'application/json':{schema:{type:'object',properties:{notes:{type:'string'}}}}}}, responses:{200:{description:'Approved'}} } },
      '/api/settlement/{id}/reject':  { put: { tags:['Settlement'], summary:'Reject settlement + send email', parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}], requestBody:{content:{'application/json':{schema:{type:'object',properties:{reason:{type:'string'}}}}}}, responses:{200:{description:'Rejected'}} } },
      '/api/settlement/{id}/settle':  { put: { tags:['Settlement'], summary:'Mark as fully settled', parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}], responses:{200:{description:'Settled'}} } },
      // ── UPLOAD ────────────────────────────────────────────────────────────
      '/api/upload/damage/{returnId}': {
        get:  { tags:['Upload'], summary:'Get all photos for a return record', parameters:[{name:'returnId',in:'path',required:true,schema:{type:'integer'}}], responses:{200:{description:'Photo list'}} },
        post: { tags:['Upload'], summary:'Upload damage photo (multipart/form-data)', parameters:[{name:'returnId',in:'path',required:true,schema:{type:'integer'}}], requestBody:{required:true,content:{'multipart/form-data':{schema:{type:'object',required:['photo'],properties:{photo:{type:'string',format:'binary'},description:{type:'string'}}}}}}, responses:{201:{description:'Photo uploaded'}} }
      },
      '/api/upload/damage/photo/{photoId}': { delete: { tags:['Upload'], summary:'Delete a photo', parameters:[{name:'photoId',in:'path',required:true,schema:{type:'integer'}}], responses:{200:{description:'Deleted'}} } },
      // ── ANALYTICS ─────────────────────────────────────────────────────────
      '/api/analytics/summary':         { get: { tags:['Analytics'], summary:'Overall KPI summary', responses:{200:{description:'Stats totals'}} } },
      '/api/analytics/monthly':         { get: { tags:['Analytics'], summary:'Monthly returns last 6 months', responses:{200:{description:'Monthly data'}} } },
      '/api/analytics/top-devices':     { get: { tags:['Analytics'], summary:'Top 5 devices by return count', responses:{200:{description:'Device list'}} } },
      '/api/analytics/recent-activity': { get: { tags:['Analytics'], summary:'Last 8 return records', responses:{200:{description:'Activity feed'}} } },
      // ── AUDIT ─────────────────────────────────────────────────────────────
      '/api/audit': { get: { tags:['Audit'], summary:'Get audit log (admin only)', parameters:[{name:'page',in:'query',schema:{type:'integer'}},{name:'action',in:'query',schema:{type:'string'}},{name:'user',in:'query',schema:{type:'string'}}], responses:{200:{description:'Audit entries'},403:{description:'Admin only'}} } }
    }
  },
  apis: []
};

const specs = swaggerJsdoc(options);

module.exports = { specs, swaggerUi };