import { createSlice, Dispatch } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
import { ITMSRecipeState, ITMSRecipe, IRecipeFormValues } from '../../@types/tms';

// ----------------------------------------------------------------------

const initialState: ITMSRecipeState = {
  isLoading: false,
  error: null,
  recipes: [],
  recipe: null,
};

const slice = createSlice({
  name: 'tmsRecipe',
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

    // GET RECIPES
    getRecipesSuccess(state, action) {
      state.isLoading = false;
      state.recipes = action.payload;
    },

    // GET RECIPE
    getRecipeSuccess(state, action) {
      state.isLoading = false;
      state.recipe = action.payload;
    },

    // CREATE RECIPE
    createRecipeSuccess(state, action) {
      state.isLoading = false;
      state.recipes = [...state.recipes, action.payload];
    },

    // UPDATE RECIPE
    updateRecipeSuccess(state, action) {
      state.isLoading = false;
      state.recipes = state.recipes.map((recipe) =>
        recipe.id === action.payload.id ? action.payload : recipe
      );
      if (state.recipe && state.recipe.id === action.payload.id) {
        state.recipe = action.payload;
      }
    },

    // DELETE RECIPE
    deleteRecipeSuccess(state, action) {
      state.isLoading = false;
      state.recipes = state.recipes.filter((recipe) => recipe.id !== action.payload);
    },
  },
});

// Reducer
export default slice.reducer;

// ----------------------------------------------------------------------

export function getTMSRecipes() {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get('/api/recipes');
      dispatch(slice.actions.getRecipesSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

export function getTMSRecipe(id: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`/api/recipes/${id}`);
      dispatch(slice.actions.getRecipeSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

export function createTMSRecipe(recipeData: IRecipeFormValues) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('name', recipeData.name);
      formData.append('description', recipeData.description || '');
      formData.append('ingredients', JSON.stringify(recipeData.ingredients));

      // Append image files
      recipeData.images.forEach((image) => {
        if (image instanceof File) {
          formData.append('images', image);
        }
      });

      const response = await axios.post('/api/recipes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      dispatch(slice.actions.createRecipeSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || 'Failed to create recipe' };
    }
  };
}

// ----------------------------------------------------------------------

export function updateTMSRecipe(id: number, recipeData: Partial<IRecipeFormValues>) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      // Create FormData for file upload
      const formData = new FormData();

      if (recipeData.name) {
        formData.append('name', recipeData.name);
      }

      if (recipeData.description !== undefined) {
        formData.append('description', recipeData.description || '');
      }

      if (recipeData.ingredients) {
        formData.append('ingredients', JSON.stringify(recipeData.ingredients));
      }

      // Append image files (if provided)
      if (recipeData.images) {
        const hasNewImages = recipeData.images.some((img) => img instanceof File);
        if (hasNewImages) {
          recipeData.images.forEach((image) => {
            if (image instanceof File) {
              formData.append('images', image);
            }
          });
          formData.append('keepExistingImages', 'false');
        } else {
          formData.append('keepExistingImages', 'true');
        }
      }

      const response = await axios.put(`/api/recipes/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      dispatch(slice.actions.updateRecipeSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || 'Failed to update recipe' };
    }
  };
}

// ----------------------------------------------------------------------

export function deleteTMSRecipe(id: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      await axios.delete(`/api/recipes/${id}`);
      dispatch(slice.actions.deleteRecipeSuccess(id));
      return { success: true };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      return { success: false, error: error.response?.data?.error || 'Failed to delete recipe' };
    }
  };
}
