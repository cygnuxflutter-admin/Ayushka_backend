const DEFAULT_MODULES = [
  {
    name: 'Cow Management',
    code: 'COW',
    description: 'Manage cow records and shed transfers',
    subModules: [
      { name: 'Cow Records', code: 'COW_LIST', description: 'View, add, edit, and delete cows' },
      { name: 'Shed Transfer', code: 'SHED_TRANSFER', description: 'Transfer cows and view history' },
    ],
  },
  {
    name: 'Shed Management',
    code: 'SHED',
    description: 'Manage sheds and sheds list',
    subModules: [
      { name: 'Shed Records', code: 'SHED_LIST', description: 'View, add, edit, and delete sheds' },
      { name: 'Shed Transfer', code: 'SHED_TRANSFER', description: 'Transfer cows and view history' },
    ],
  },
  {
    name: 'Gaushala Management',
    code: 'GAUSHALA',
    description: 'Manage gaushalas',
    subModules: [
      { name: 'Gaushala Records', code: 'GAUSHALA_LIST', description: 'View, add, edit, and delete gaushalas' },
    ],
  },
  {
    name: 'User Management',
    code: 'USER',
    description: 'Manage system users and statuses',
    subModules: [
      { name: 'User Records', code: 'USER_LIST', description: 'View, add, edit, and delete users' },
    ],
  },
  {
    name: 'Role Management',
    code: 'ROLE',
    description: 'Manage user roles',
    subModules: [
      { name: 'Role Records', code: 'ROLE_LIST', description: 'View, add, edit, and delete roles' },
    ],
  },
  {
    name: 'Breed Type Management',
    code: 'BREED_TYPE',
    description: 'Manage cattle breed types',
    subModules: [
      { name: 'Breed Type Records', code: 'BREED_TYPE_LIST', description: 'View, add, edit, and delete breed types' },
    ],
  },
  {
    name: 'Cattle Type Management',
    code: 'TYPE',
    description: 'Manage cattle types',
    subModules: [
      { name: 'Cattle Type Records', code: 'TYPE_LIST', description: 'View, add, edit, and delete cattle types' },
    ],
  },
  {
    name: 'Feed & Fodder Management',
    code: 'FEED_STOCK',
    description: 'Manage cow chara/feed items and stock transactions',
    subModules: [
      { name: 'Feed Items', code: 'FEED_ITEMS', description: 'View, add, edit, and delete feed items' },
      { name: 'Stock Transactions', code: 'STOCK_TRANSACTION', description: 'Record inward, outward, and wastage transactions' },
    ],
  },
  {
    name: 'Medical Stock Management',
    code: 'MEDICAL_STOCK',
    description: 'Manage veterinary medicine inventory and stock ledger',
    subModules: [
      { name: 'Medical Items', code: 'MEDICAL_ITEMS', description: 'View, add, edit, and delete medical items' },
      { name: 'Stock Transactions', code: 'STOCK_TRANSACTION', description: 'Record inward, outward, and disposal transactions' },
    ],
  },
  {
    name: 'Cow Treatment Management',
    code: 'TREATMENT',
    description: 'Manage cow treatments, multi-dose schedules, and veterinary records',
    subModules: [
      { name: 'Treatment Records', code: 'TREATMENT_LIST', description: 'View, add, edit, and manage cow treatments' },
      { name: 'Dose Schedules & Alerts', code: 'DOSE_SCHEDULE', description: 'Manage dose schedules and administer doses' },
    ],
  },
  {
    name: 'Staff & Worker Management',
    code: 'WORKER_MGMT',
    description: 'Manage departments and worker records department-wise',
    subModules: [
      { name: 'Department Records', code: 'DEPARTMENT_LIST', description: 'View, add, edit, and delete departments' },
      { name: 'Worker Records', code: 'WORKER_LIST', description: 'View, add, edit, and manage department-wise worker records' },
    ],
  },
  {
    name: 'Milk Production & Distribution',
    code: 'MILK_MGMT',
    description: 'Manage daily cow milk production, distribution, leftover stock, and disposal',
    subModules: [
      { name: 'Milk Production', code: 'MILK_PRODUCTION', description: 'Record cow-wise daily milk production and alerts' },
      { name: 'Milk Distribution', code: 'MILK_DISTRIBUTION', description: 'Manage milk distribution, fridge stock, and disposal' },
    ],
  },
  {
    name: 'Donation Management',
    code: 'DONATION',
    description: 'Manage Gaushala donations and receipts',
    subModules: [
      { name: 'Donation Records', code: 'DONATION_LIST', description: 'View, add, edit, and delete donations' },
      { name: 'Donor Receipts', code: 'DONATION_RECEIPT', description: 'Generate and print receipts' },
    ],
  },
];

module.exports = DEFAULT_MODULES;
