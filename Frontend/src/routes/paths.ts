// ----------------------------------------------------------------------

function path(root: string, sublink: string) {
  return `${root}${sublink}`;
}

const ROOTS_AUTH = '/auth';
const ROOTS_DASHBOARD = '/dashboard';

// ----------------------------------------------------------------------

export const PATH_AUTH = {
  root: ROOTS_AUTH,
  login: path(ROOTS_AUTH, '/login'),
  register: path(ROOTS_AUTH, '/register'),
  loginUnprotected: path(ROOTS_AUTH, '/login-unprotected'),
  registerUnprotected: path(ROOTS_AUTH, '/register-unprotected'),
  verify: path(ROOTS_AUTH, '/verify'),
  resetPassword: path(ROOTS_AUTH, '/reset-password'),
  newPassword: path(ROOTS_AUTH, '/new-password'),
};

export const PATH_PAGE = {
  comingSoon: '/coming-soon',
  maintenance: '/maintenance',
  about: '/about-us',
  contact: '/contact-us',
  faqs: '/faqs',
  page403: '/403',
  page404: '/404',
  page500: '/500',
  components: '/components',
};

export const PATH_DASHBOARD = {
  root: ROOTS_DASHBOARD,
  permissionDenied: path(ROOTS_DASHBOARD, '/permission-denied'),
  general: {
    app: path(ROOTS_DASHBOARD, '/app'),
  },
  user: {
    root: path(ROOTS_DASHBOARD, '/user'),
    new: path(ROOTS_DASHBOARD, '/user/new'),
    list: path(ROOTS_DASHBOARD, '/user/list'),
    account: path(ROOTS_DASHBOARD, '/user/account'),
    edit: (name: string) => path(ROOTS_DASHBOARD, `/user/${name}/edit`),
    demoEdit: path(ROOTS_DASHBOARD, `/user/reece-chung/edit`),
  },
  ingredient: {
    root: path(ROOTS_DASHBOARD, '/ingredient-management'),
    list: path(ROOTS_DASHBOARD, '/ingredient-management'),
    new: path(ROOTS_DASHBOARD, '/ingredient-entry'),
    edit: (id: string) => path(ROOTS_DASHBOARD, `/ingredient-entry?id=${id}`),
  },
  recipe: {
    root: path(ROOTS_DASHBOARD, '/recipe-management'),
    list: path(ROOTS_DASHBOARD, '/recipe-management'),
    new: path(ROOTS_DASHBOARD, '/recipe-creation'),
    edit: (id: string) => path(ROOTS_DASHBOARD, `/recipe-creation?id=${id}`),
  },
  tiffin: {
    root: path(ROOTS_DASHBOARD, '/tiffin'),
    mealPlans: path(ROOTS_DASHBOARD, '/tiffin/meal-plans'),
    mealPlanNew: path(ROOTS_DASHBOARD, '/tiffin/meal-plan-new'),
    mealPlanEdit: (id: string) => path(ROOTS_DASHBOARD, `/tiffin/meal-plan-edit?id=${id}`),
    customers: path(ROOTS_DASHBOARD, '/tiffin/customers'),
    customerNew: path(ROOTS_DASHBOARD, '/tiffin/customer-new'),
    customerEdit: (id: string) => path(ROOTS_DASHBOARD, `/tiffin/customer-edit?id=${id}`),
    orders: path(ROOTS_DASHBOARD, '/tiffin/orders'),
    orderNew: path(ROOTS_DASHBOARD, '/tiffin/order-new'),
    orderEdit: (id: string) => path(ROOTS_DASHBOARD, `/tiffin/order-edit?id=${id}`),
    dailyCount: path(ROOTS_DASHBOARD, '/tiffin/daily-count'),
    monthlyList: path(ROOTS_DASHBOARD, '/tiffin/monthly-list'),
    completeList: path(ROOTS_DASHBOARD, '/tiffin/complete-list'),
    billingCalendar: path(ROOTS_DASHBOARD, '/tiffin/billing-calendar'),
    billingStatus: path(ROOTS_DASHBOARD, '/tiffin/billing-status'),
    billingDetails: (id: string) => path(ROOTS_DASHBOARD, `/tiffin/billing-details?id=${id}`),
    invoices: path(ROOTS_DASHBOARD, '/tiffin/invoices'),
    invoiceDetails: (id: string) => path(ROOTS_DASHBOARD, `/tiffin/invoices/${id}`),
    settings: path(ROOTS_DASHBOARD, '/tiffin/settings'),
    // Label printing system
    labelEditor: path(ROOTS_DASHBOARD, '/tiffin/label-editor'),
    labelEditorEdit: (id: string) => path(ROOTS_DASHBOARD, `/tiffin/label-editor?id=${id}`),
    labelTemplates: path(ROOTS_DASHBOARD, '/tiffin/label-templates'),
    customerPrintOrder: path(ROOTS_DASHBOARD, '/tiffin/customer-print-order'),
    printLabels: path(ROOTS_DASHBOARD, '/tiffin/print-labels'),
  },
  payments: {
    root: path(ROOTS_DASHBOARD, '/payments'),
    interac: path(ROOTS_DASHBOARD, '/payments/interac'),
    history: path(ROOTS_DASHBOARD, '/payments/history'),
    cashPayment: path(ROOTS_DASHBOARD, '/payments/cash'),
    credit: path(ROOTS_DASHBOARD, '/payments/credit'),
    refunds: path(ROOTS_DASHBOARD, '/payments/refunds'),
    settings: path(ROOTS_DASHBOARD, '/payments/settings'),
    allocate: (id: string) => path(ROOTS_DASHBOARD, `/payments/allocate?id=${id}`),
  },
};

export const PATH_DOCS = {
  root: 'https://docs.minimals.cc',
  changelog: 'https://docs.minimals.cc/changelog',
};

export const PATH_ZONE_ON_STORE = 'https://mui.com/store/items/zone-landing-page/';

export const PATH_MINIMAL_ON_STORE = 'https://mui.com/store/items/minimal-dashboard/';

export const PATH_FREE_VERSION = 'https://mui.com/store/items/minimal-dashboard-free/';

export const PATH_FIGMA_PREVIEW =
  'https://www.figma.com/file/rWMDOkMZYw2VpTdNuBBCvN/%5BPreview%5D-Minimal-Web.26.11.22?node-id=0%3A1&t=ya2mDFiuhTXXLLF1-1';
