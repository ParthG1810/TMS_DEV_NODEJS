import { createSlice, Dispatch } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
import {
  IPaymentState,
  ICalendarGridData,
  IMonthlyBilling,
  IPaymentNotification,
  IPricingRule,
  ITiffinCalendarEntry,
  ICalendarEntryFormValues,
  CalendarEntryStatus,
} from '../../@types/tms';

// ----------------------------------------------------------------------

const initialState: IPaymentState = {
  isLoading: false,
  error: null,
  calendarData: null,
  monthlyBillings: [],
  currentBilling: null,
  notifications: [],
  unreadCount: 0,
  pricingRules: [],
};

const slice = createSlice({
  name: 'payment',
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

    // GET CALENDAR GRID
    getCalendarGridSuccess(state, action) {
      state.isLoading = false;
      state.calendarData = action.payload;
    },

    // UPDATE CALENDAR ENTRY
    updateCalendarEntrySuccess(state, action) {
      state.isLoading = false;
      // Update the calendar data with the new entry
      if (state.calendarData) {
        const entry: ITiffinCalendarEntry = action.payload;
        const customerIndex = state.calendarData.customers.findIndex(
          (c) => c.customer_id === entry.customer_id
        );

        if (customerIndex !== -1) {
          state.calendarData.customers[customerIndex].entries[entry.delivery_date] = entry.status;
        }
      }
    },

    // BATCH UPDATE CALENDAR ENTRIES
    batchUpdateCalendarEntriesSuccess(state, action) {
      state.isLoading = false;
      // Update multiple entries in the calendar data
      if (state.calendarData && action.payload.length > 0) {
        const customerId = action.payload[0].customer_id;
        const customerIndex = state.calendarData.customers.findIndex(
          (c) => c.customer_id === customerId
        );

        if (customerIndex !== -1) {
          action.payload.forEach((entry: ITiffinCalendarEntry) => {
            state.calendarData!.customers[customerIndex].entries[entry.delivery_date] = entry.status;
          });
        }
      }
    },

    // GET MONTHLY BILLINGS
    getMonthlyBillingsSuccess(state, action) {
      state.isLoading = false;
      state.monthlyBillings = action.payload;
    },

    // GET BILLING
    getBillingSuccess(state, action) {
      state.isLoading = false;
      state.currentBilling = action.payload;
    },

    // CALCULATE BILLING
    calculateBillingSuccess(state, action) {
      state.isLoading = false;
      const updatedBilling = action.payload;

      // Update in the list
      const index = state.monthlyBillings.findIndex((b) => b.id === updatedBilling.id);
      if (index !== -1) {
        state.monthlyBillings[index] = updatedBilling;
      } else {
        state.monthlyBillings = [...state.monthlyBillings, updatedBilling];
      }

      // Update current billing if it's the same
      if (state.currentBilling?.id === updatedBilling.id) {
        state.currentBilling = updatedBilling;
      }
    },

    // FINALIZE BILLING
    finalizeBillingSuccess(state, action) {
      state.isLoading = false;
      const updatedBilling = action.payload;

      // Update in the list
      const index = state.monthlyBillings.findIndex((b) => b.id === updatedBilling.id);
      if (index !== -1) {
        state.monthlyBillings[index] = updatedBilling;
      }

      // Update current billing
      if (state.currentBilling?.id === updatedBilling.id) {
        state.currentBilling = updatedBilling;
      }
    },

    // GET NOTIFICATIONS
    getNotificationsSuccess(state, action) {
      state.isLoading = false;
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter((n: IPaymentNotification) => !n.is_read).length;
    },

    // MARK NOTIFICATION AS READ
    markNotificationReadSuccess(state, action) {
      state.isLoading = false;
      const notificationId = action.payload.id;

      const index = state.notifications.findIndex((n) => n.id === notificationId);
      if (index !== -1) {
        state.notifications[index] = action.payload;
      }

      state.unreadCount = state.notifications.filter((n) => !n.is_read).length;
    },

    // DISMISS NOTIFICATION
    dismissNotificationSuccess(state, action) {
      state.isLoading = false;
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },

    // GET PRICING RULES
    getPricingRulesSuccess(state, action) {
      state.isLoading = false;
      state.pricingRules = action.payload;
    },
  },
});

// Reducer
export default slice.reducer;

// Actions
export const { updateCalendarEntrySuccess } = slice.actions;

// ----------------------------------------------------------------------

/**
 * Get calendar grid data for a specific month
 */
export function getCalendarGrid(month: string, customerId?: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const params: any = { format: 'grid', month };
      if (customerId) {
        params.customer_id = customerId;
      }

      // Add timestamp to prevent caching
      params._t = Date.now();

      const response = await axios.get('/api/monthly-billing', { params });
      dispatch(slice.actions.getCalendarGridSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

/**
 * Create or update a calendar entry
 */
export function createCalendarEntry(entryData: ICalendarEntryFormValues) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.post('/api/calendar-entries', entryData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      dispatch(slice.actions.updateCalendarEntrySuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      const errorMessage = error.error || error.message || 'Failed to create calendar entry';
      return { success: false, error: errorMessage };
    }
  };
}

// ----------------------------------------------------------------------

/**
 * Update a calendar entry
 */
export function updateCalendarEntry(
  id: number,
  updates: { status?: CalendarEntryStatus; quantity?: number; price?: number; notes?: string }
) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(`/api/calendar-entries/${id}`, updates, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      dispatch(slice.actions.updateCalendarEntrySuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      const errorMessage = error.error || error.message || 'Failed to update calendar entry';
      return { success: false, error: errorMessage };
    }
  };
}

// ----------------------------------------------------------------------

/**
 * Batch update calendar entries
 */
export function batchUpdateCalendarEntries(
  customerId: number,
  orderId: number,
  entries: { delivery_date: string; status: CalendarEntryStatus; quantity?: number; price?: number }[]
) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(
        '/api/calendar-entries',
        {
          customer_id: customerId,
          order_id: orderId,
          entries,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      dispatch(slice.actions.batchUpdateCalendarEntriesSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      const errorMessage = error.error || error.message || 'Failed to batch update calendar entries';
      return { success: false, error: errorMessage };
    }
  };
}

// ----------------------------------------------------------------------

/**
 * Get monthly billings
 */
export function getMonthlyBillings(month?: string, customerId?: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const params: any = {};
      if (month) params.month = month;
      if (customerId) params.customer_id = customerId;

      // Add timestamp to prevent caching
      params._t = Date.now();

      const response = await axios.get('/api/monthly-billing', { params });
      dispatch(slice.actions.getMonthlyBillingsSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

/**
 * Get a specific billing
 */
export function getBilling(id: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`/api/monthly-billing/${id}`);
      dispatch(slice.actions.getBillingSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

/**
 * Calculate monthly billing for a customer
 */
export function calculateMonthlyBilling(customerId: number, billingMonth: string) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.post(
        '/api/monthly-billing',
        {
          customer_id: customerId,
          billing_month: billingMonth,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      dispatch(slice.actions.calculateBillingSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      const errorMessage = error.error || error.message || 'Failed to calculate billing';
      return { success: false, error: errorMessage };
    }
  };
}

// ----------------------------------------------------------------------

/**
 * Finalize monthly billing
 */
export function finalizeBilling(billingId: number, finalizedBy: string, notes?: string) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(
        `/api/monthly-billing/${billingId}`,
        {
          action: 'finalize',
          billing_id: billingId,
          finalized_by: finalizedBy,
          notes,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      dispatch(slice.actions.finalizeBillingSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      const errorMessage = error.error || error.message || 'Failed to finalize billing';
      return { success: false, error: errorMessage };
    }
  };
}

// ----------------------------------------------------------------------

/**
 * Get payment notifications
 */
export function getPaymentNotifications(unreadOnly: boolean = false) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get('/api/payment-notifications', {
        params: { unread_only: unreadOnly },
      });
      dispatch(slice.actions.getNotificationsSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}

// ----------------------------------------------------------------------

/**
 * Mark notification as read
 */
export function markNotificationAsRead(id: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(
        `/api/payment-notifications/${id}`,
        { is_read: true },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      dispatch(slice.actions.markNotificationReadSuccess(response.data.data));
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      const errorMessage = error.error || error.message || 'Failed to mark notification as read';
      return { success: false, error: errorMessage };
    }
  };
}

// ----------------------------------------------------------------------

/**
 * Dismiss notification
 */
export function dismissNotification(id: number) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      await axios.put(
        `/api/payment-notifications/${id}`,
        { is_dismissed: true },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      dispatch(slice.actions.dismissNotificationSuccess(id));
      return { success: true };
    } catch (error: any) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
      const errorMessage = error.error || error.message || 'Failed to dismiss notification';
      return { success: false, error: errorMessage };
    }
  };
}

// ----------------------------------------------------------------------

/**
 * Get pricing rules
 */
export function getPricingRules(isDefault?: boolean) {
  return async (dispatch: Dispatch) => {
    dispatch(slice.actions.startLoading());
    try {
      const params: any = {};
      if (isDefault !== undefined) params.is_default = isDefault;

      const response = await axios.get('/api/pricing-rules', { params });
      dispatch(slice.actions.getPricingRulesSuccess(response.data.data));
    } catch (error) {
      console.error(error);
      dispatch(slice.actions.hasError(error));
    }
  };
}
