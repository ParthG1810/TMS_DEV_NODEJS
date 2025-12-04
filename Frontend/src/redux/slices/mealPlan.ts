import { createSlice, Dispatch } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
import { IMealPlanState, IMealPlan, IMealPlanFormValues } from '../../@types/tms';

// ----------------------------------------------------------------------

const initialState: IMealPlanState = {
  isLoading: false,
  error: null,
  mealPlans: [],
  mealPlan: null,
};

const slice = createSlice({
  name: 'mealPlan',
  initialState,
  reducers: {
    // START LOADING
    startLoading(state) {
      state.isLoading = true;
    },

    // HAS ERROR
    hasError(state, action) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // GET MEAL PLANS
    getMealPlansSuccess(state, action) {
      state.isLoading = false;
      state.mealPlans = action.payload;
    },

    // GET MEAL PLAN
    getMealPlanSuccess(state, action) {
      state.isLoading = false;
      state.mealPlan = action.payload;
    },

    // CREATE MEAL PLAN
    createMealPlanSuccess(state, action) {
      state.isLoading = false;
      state.mealPlans = [...state.mealPlans, action.payload];
    },

    // UPDATE MEAL PLAN
    updateMealPlanSuccess(state, action) {
      state.isLoading = false;
      state.mealPlans = state.mealPlans.map((plan) =>
        plan.id === action.payload.id ? action.payload : plan
      );
      if (state.mealPlan && state.mealPlan.id === action.payload.id) {
        state.mealPlan = action.payload;
      }
    },

    // DELETE MEAL PLAN
    deleteMealPlanSuccess(state, action) {
      state.isLoading = false;
      state.mealPlans = state.mealPlans.filter((plan) => plan.id !== action.payload);
    },
  },
});

// Reducer
export default slice.reducer;

// ----------------------------------------------------------------------

export function getMealPlans() {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get('/api/meal-plans');
      dispatch(slice.actions.getMealPlansSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

export function getMealPlan(id: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`/api/meal-plans/${id}`);
      dispatch(slice.actions.getMealPlanSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

export function createMealPlan(mealPlanData: IMealPlanFormValues) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.post('/api/meal-plans', mealPlanData);
      dispatch(slice.actions.createMealPlanSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || 'Failed to create meal plan' };
    }
  };
}

// ----------------------------------------------------------------------

export function updateMealPlan(id: number, mealPlanData: Partial<IMealPlanFormValues>) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(`/api/meal-plans/${id}`, mealPlanData);
      dispatch(slice.actions.updateMealPlanSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || 'Failed to update meal plan' };
    }
  };
}

// ----------------------------------------------------------------------

export function deleteMealPlan(id: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      await axios.delete(`/api/meal-plans/${id}`);
      dispatch(slice.actions.deleteMealPlanSuccess(id));
      return { success: true };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || 'Failed to delete meal plan' };
    }
  };
}
