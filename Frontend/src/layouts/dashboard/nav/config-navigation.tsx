// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// components
import SvgColor from '../../../components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`/assets/icons/navbar/${name}.svg`} sx={{ width: 1, height: 1 }} />
);

const ICONS = {
  cart: icon('ic_cart'),
  user: icon('ic_user'),
  label: icon('ic_label'),
  banking: icon('ic_banking'),
  booking: icon('ic_booking'),
  menuItem: icon('ic_menu_item'),
  dashboard: icon('ic_dashboard'),
};

const navConfig = [
  // Surti-Fusion
  //------------------------------------------------------------------------

  {
    subheader: 'SURTI FUSION',
    items: [
      { title: 'app', path: PATH_DASHBOARD.general.app, icon: ICONS.dashboard },
      // INGREDIENT MANAGEMENT
      {
        title: 'Ingredient Management',
        path: PATH_DASHBOARD.ingredient.root,
        icon: ICONS.cart,
        children: [
          { title: 'list', path: PATH_DASHBOARD.ingredient.list },
          { title: 'create', path: PATH_DASHBOARD.ingredient.new },
        ],
      },

      // RECIPE MANAGEMENT
      {
        title: 'Recipe Management',
        path: PATH_DASHBOARD.recipe.root,
        icon: ICONS.booking,
        children: [
          { title: 'list', path: PATH_DASHBOARD.recipe.list },
          { title: 'create', path: PATH_DASHBOARD.recipe.new },
        ],
      },

      // TIFFIN MANAGEMENT
      {
        title: 'Tiffin Management',
        path: PATH_DASHBOARD.tiffin.root,
        icon: ICONS.menuItem,
        children: [
          { title: 'Dashboard', path: PATH_DASHBOARD.tiffin.root },
          { title: 'Meal Plans', path: PATH_DASHBOARD.tiffin.mealPlans },
          { title: 'Customers', path: PATH_DASHBOARD.tiffin.customers },
          { title: 'Tiffin Orders', path: PATH_DASHBOARD.tiffin.orders },
          { title: 'Billing Calendar', path: PATH_DASHBOARD.tiffin.billingCalendar },
          { title: 'Billing Status', path: PATH_DASHBOARD.tiffin.billingStatus },
          { title: 'Invoices', path: PATH_DASHBOARD.tiffin.invoices },
          { title: 'Settings', path: PATH_DASHBOARD.tiffin.settings },
        ],
      },

      // LABEL PRINT
      {
        title: 'Label Print',
        path: PATH_DASHBOARD.tiffin.labelTemplates,
        icon: ICONS.label,
        children: [
          { title: 'Label Templates', path: PATH_DASHBOARD.tiffin.labelTemplates },
          { title: 'New Template', path: PATH_DASHBOARD.tiffin.labelEditor },
          { title: 'Customer Print Order', path: PATH_DASHBOARD.tiffin.customerPrintOrder },
          { title: 'Print Labels', path: PATH_DASHBOARD.tiffin.printLabels },
          { title: 'Daily Count', path: PATH_DASHBOARD.tiffin.dailyCount },
          { title: 'Monthly List', path: PATH_DASHBOARD.tiffin.monthlyList },
        ],
      },

      // PAYMENTS
      {
        title: 'Payments',
        path: PATH_DASHBOARD.payments.root,
        icon: ICONS.banking,
        children: [
          { title: 'Dashboard', path: PATH_DASHBOARD.payments.root },
          { title: 'Interac Transactions', path: PATH_DASHBOARD.payments.interac },
          { title: 'Record Cash Payment', path: PATH_DASHBOARD.payments.cashPayment },
          { title: 'Payment History', path: PATH_DASHBOARD.payments.history },
          { title: 'Customer Credit', path: PATH_DASHBOARD.payments.credit },
          { title: 'Refunds', path: PATH_DASHBOARD.payments.refunds },
          { title: 'Gmail Settings', path: PATH_DASHBOARD.payments.settings },
        ],
      },
      // USER
      {
        title: 'user',
        path: PATH_DASHBOARD.user.root,
        icon: ICONS.user,
        children: [
          { title: 'account', path: PATH_DASHBOARD.user.account },
          { title: 'list', path: PATH_DASHBOARD.user.list, roles: ['admin', 'manager'] },
          { title: 'create', path: PATH_DASHBOARD.user.new, roles: ['admin', 'manager'] },
        ],
      },
    ],
  },
];

export default navConfig;
