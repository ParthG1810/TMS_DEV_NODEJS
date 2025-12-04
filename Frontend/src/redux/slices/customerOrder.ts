import { createSlice, Dispatch } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
import {
  ICustomerOrderState,
  ICustomerOrder,
  ICustomerOrderFormValues,
  IDailyTiffinSummary,
} from '../../@types/tms';

// ----------------------------------------------------------------------

const initialState: ICustomerOrderState = {
  isLoading: false,
  error: null,
  orders: [],
  order: null,
  dailySummary: null,
};

const slice = createSlice({
  name: 'customerOrder',
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

    // GET ORDERS
    getOrdersSuccess(state, action) {
      state.isLoading = false;
      state.orders = action.payload;
    },

    // GET ORDER
    getOrderSuccess(state, action) {
      state.isLoading = false;
      state.order = action.payload;
    },

    // CREATE ORDER
    createOrderSuccess(state, action) {
      state.isLoading = false;
      state.orders = [...state.orders, action.payload];
    },

    // UPDATE ORDER
    updateOrderSuccess(state, action) {
      state.isLoading = false;
      state.orders = state.orders.map((order) =>
        order.id === action.payload.id ? action.payload : order
      );
      if (state.order && state.order.id === action.payload.id) {
        state.order = action.payload;
      }
    },

    // DELETE ORDER
    deleteOrderSuccess(state, action) {
      state.isLoading = false;
      state.orders = state.orders.filter((order) => order.id !== action.payload);
    },

    // GET DAILY SUMMARY
    getDailySummarySuccess(state, action) {
      state.isLoading = false;
      state.dailySummary = action.payload;
    },
  },
});

// Reducer
export default slice.reducer;

// ----------------------------------------------------------------------

export function getCustomerOrders(params?: { filter?: string; month?: string; page?: number; limit?: number }) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get('/api/customer-orders', { params });
      // Handle paginated response
      const data = response.data.data.orders || response.data.data;
      dispatch(slice.actions.getOrdersSuccess(data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

export function getCustomerOrder(id: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`/api/customer-orders/${id}`);
      dispatch(slice.actions.getOrderSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

export function createCustomerOrder(orderData: ICustomerOrderFormValues) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.post('/api/customer-orders', orderData);
      dispatch(slice.actions.createOrderSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || 'Failed to create order' };
    }
  };
}

// ----------------------------------------------------------------------

export function updateCustomerOrder(id: number, orderData: Partial<ICustomerOrderFormValues>) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(`/api/customer-orders/${id}`, orderData);
      dispatch(slice.actions.updateOrderSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || 'Failed to update order' };
    }
  };
}

// ----------------------------------------------------------------------

export function deleteCustomerOrder(id: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      await axios.delete(`/api/customer-orders/${id}`);
      dispatch(slice.actions.deleteOrderSuccess(id));
      return { success: true };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || 'Failed to delete order' };
    }
  };
}

// ----------------------------------------------------------------------

export function getDailyTiffinCount(date?: string) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const params = date ? { date } : {};
      const response = await axios.get('/api/tiffin-reports/daily-count', { params });
      dispatch(slice.actions.getDailySummarySuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

export function getMonthlyTiffinList(month?: string) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const params = month ? { month } : {};
      const response = await axios.get('/api/tiffin-reports/monthly-list', { params });
      dispatch(slice.actions.getOrdersSuccess(response.data.data.orders));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

export function getCompleteTiffinList(params?: { search?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: string }) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get('/api/tiffin-reports/complete-list', { params });
      dispatch(slice.actions.getOrdersSuccess(response.data.data.orders));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}
