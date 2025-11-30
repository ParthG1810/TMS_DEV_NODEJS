import { createSlice, Dispatch } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
import { ITMSIngredientState, ITMSIngredient, IIngredientFormValues } from '../../@types/tms';

// ----------------------------------------------------------------------

const initialState: ITMSIngredientState = {
  isLoading: false,
  error: null,
  ingredients: [],
  ingredient: null,
};

const slice = createSlice({
  name: 'tmsIngredient',
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

    // GET INGREDIENTS
    getIngredientsSuccess(state, action) {
      state.isLoading = false;
      state.ingredients = action.payload;
    },

    // GET INGREDIENT
    getIngredientSuccess(state, action) {
      state.isLoading = false;
      state.ingredient = action.payload;
    },

    // CREATE INGREDIENT
    createIngredientSuccess(state, action) {
      state.isLoading = false;
      state.ingredients = [...state.ingredients, action.payload];
    },

    // UPDATE INGREDIENT
    updateIngredientSuccess(state, action) {
      state.isLoading = false;
      state.ingredients = state.ingredients.map((ingredient) =>
        ingredient.id === action.payload.id ? action.payload : ingredient
      );
      if (state.ingredient && state.ingredient.id === action.payload.id) {
        state.ingredient = action.payload;
      }
    },

    // DELETE INGREDIENT
    deleteIngredientSuccess(state, action) {
      state.isLoading = false;
      state.ingredients = state.ingredients.filter((ingredient) => ingredient.id !== action.payload);
    },
  },
});

// Reducer
export default slice.reducer;

// ----------------------------------------------------------------------

export function getTMSIngredients() {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get('/api/ingredients');
      dispatch(slice.actions.getIngredientsSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

export function getTMSIngredient(id: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`/api/ingredients/${id}`);
      dispatch(slice.actions.getIngredientSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

export function createTMSIngredient(ingredientData: IIngredientFormValues) {
  return async (dispatch: Dispatch) {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.post('/api/ingredients', ingredientData);
      dispatch(slice.actions.createIngredientSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || 'Failed to create ingredient' };
    }
  };
}

// ----------------------------------------------------------------------

export function updateTMSIngredient(id: number, ingredientData: Partial<IIngredientFormValues>) {
  return async (dispatch: Dispatch) {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(`/api/ingredients/${id}`, ingredientData);
      dispatch(slice.actions.updateIngredientSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || 'Failed to update ingredient' };
    }
  };
}

// ----------------------------------------------------------------------

export function deleteTMSIngredient(id: number) {
  return async (dispatch: Dispatch) {
    dispatch(slice.actions.startLoading());
    try {
      await axios.delete(`/api/ingredients/${id}`);
      dispatch(slice.actions.deleteIngredientSuccess(id));
      return { success: true };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || 'Failed to delete ingredient' };
    }
  };
}
