import { createSlice, Dispatch } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
import { ITMSProductState, ITMSProduct, IProductFormValues } from '../../@types/tms';

// ----------------------------------------------------------------------

const initialState: ITMSProductState = {
  isLoading: false,
  error: null,
  products: [],
  product: null,
};

const slice = createSlice({
  name: 'tmsProduct',
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

    // GET PRODUCTS
    getProductsSuccess(state, action) {
      state.isLoading = false;
      state.products = action.payload;
    },

    // GET PRODUCT
    getProductSuccess(state, action) {
      state.isLoading = false;
      state.product = action.payload;
    },

    // CREATE PRODUCT
    createProductSuccess(state, action) {
      state.isLoading = false;
      state.products = [...state.products, action.payload];
    },

    // UPDATE PRODUCT
    updateProductSuccess(state, action) {
      state.isLoading = false;
      state.products = state.products.map((product) =>
        product.id === action.payload.id ? action.payload : product
      );
      if (state.product && state.product.id === action.payload.id) {
        state.product = action.payload;
      }
    },

    // DELETE PRODUCT
    deleteProductSuccess(state, action) {
      state.isLoading = false;
      state.products = state.products.filter((product) => product.id !== action.payload);
    },
  },
});

// Reducer
export default slice.reducer;

// ----------------------------------------------------------------------

export function getTMSProducts() {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get('/api/products');
      dispatch(slice.actions.getProductsSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

export function getTMSProduct(id: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`/api/products/${id}`);
      dispatch(slice.actions.getProductSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

export function createTMSProduct(productData: IProductFormValues) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.post('/api/products', productData);
      dispatch(slice.actions.createProductSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || 'Failed to create product' };
    }
  };
}

// ----------------------------------------------------------------------

export function updateTMSProduct(id: number, productData: Partial<IProductFormValues>) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(`/api/products/${id}`, productData);
      dispatch(slice.actions.updateProductSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || 'Failed to update product' };
    }
  };
}

// ----------------------------------------------------------------------

export function deleteTMSProduct(id: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      await axios.delete(`/api/products/${id}`);
      dispatch(slice.actions.deleteProductSuccess(id));
      return { success: true };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || 'Failed to delete product' };
    }
  };
}
