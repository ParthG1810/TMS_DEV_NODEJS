import { combineReducers } from 'redux';
import createWebStorage from 'redux-persist/lib/storage/createWebStorage';
// slices
import tmsIngredientReducer from './slices/tmsIngredient';
import tmsRecipeReducer from './slices/tmsRecipe';
import mealPlanReducer from './slices/mealPlan';
import customerReducer from './slices/customer';
import customerOrderReducer from './slices/customerOrder';
import paymentReducer from './slices/payment';

// ----------------------------------------------------------------------

export const createNoopStorage = () => ({
  getItem(_key: string) {
    return Promise.resolve(null);
  },
  setItem(_key: string, value: any) {
    return Promise.resolve(value);
  },
  removeItem(_key: string) {
    return Promise.resolve();
  },
});

export const storage =
  typeof window !== 'undefined' ? createWebStorage('local') : createNoopStorage();

export const rootPersistConfig = {
  key: 'root',
  storage,
  keyPrefix: 'redux-',
  whitelist: [],
};

const rootReducer = combineReducers({
  tmsIngredient: tmsIngredientReducer,
  tmsRecipe: tmsRecipeReducer,
  mealPlan: mealPlanReducer,
  customer: customerReducer,
  customerOrder: customerOrderReducer,
  payment: paymentReducer,
});

export default rootReducer;
