import { createSlice, Dispatch } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
import { ICustomerState, ICustomer, ICustomerFormValues } from '../../@types/tms';

// ----------------------------------------------------------------------

const initialState: ICustomerState = {
  isLoading: false,
  error: null,
  customers: [],
  customer: null,
};

const slice = createSlice({
  name: 'customer',
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

    // GET CUSTOMERS
    getCustomersSuccess(state, action) {
      state.isLoading = false;
      state.customers = action.payload;
    },

    // GET CUSTOMER
    getCustomerSuccess(state, action) {
      state.isLoading = false;
      state.customer = action.payload;
    },

    // CREATE CUSTOMER
    createCustomerSuccess(state, action) {
      state.isLoading = false;
      state.customers = [...state.customers, action.payload];
    },

    // UPDATE CUSTOMER
    updateCustomerSuccess(state, action) {
      state.isLoading = false;
      state.customers = state.customers.map((customer) =>
        customer.id === action.payload.id ? action.payload : customer
      );
      if (state.customer && state.customer.id === action.payload.id) {
        state.customer = action.payload;
      }
    },

    // DELETE CUSTOMER
    deleteCustomerSuccess(state, action) {
      state.isLoading = false;
      state.customers = state.customers.filter((customer) => customer.id !== action.payload);
    },
  },
});

// Reducer
export default slice.reducer;

// ----------------------------------------------------------------------

export function getCustomers() {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get('/api/customers');
      dispatch(slice.actions.getCustomersSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

export function getCustomer(id: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`/api/customers/${id}`);
      dispatch(slice.actions.getCustomerSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

export function createCustomer(customerData: ICustomerFormValues) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.post('/api/customers', customerData);
      dispatch(slice.actions.createCustomerSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || error.message || 'Failed to create customer' };
    }
  };
}

// ----------------------------------------------------------------------

export function updateCustomer(id: number, customerData: Partial<ICustomerFormValues>) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(`/api/customers/${id}`, customerData);
      dispatch(slice.actions.updateCustomerSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || error.message || 'Failed to update customer' };
    }
  };
}

// ----------------------------------------------------------------------

export function deleteCustomer(id: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      await axios.delete(`/api/customers/${id}`);
      dispatch(slice.actions.deleteCustomerSuccess(id));
      return { success: true };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || error.message || 'Failed to delete customer' };
    }
  };
}
