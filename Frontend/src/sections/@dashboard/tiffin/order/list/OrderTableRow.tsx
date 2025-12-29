import { useState } from 'react';
import { format } from 'date-fns';
// @mui
import {
  TableRow,
  Checkbox,
  TableCell,
  IconButton,
  Chip,
  Box,
  Tooltip,
  Button,
} from '@mui/material';
// @types
import { ICustomerOrder } from '../../../../../@types/tms';
// components
import Iconify from '../../../../../components/iconify';
import ConfirmDialog from '../../../../../components/confirm-dialog';
import { useSnackbar } from '../../../../../components/snackbar';

// ----------------------------------------------------------------------

type Props = {
  row: ICustomerOrder;
  selected: boolean;
  onEditRow: VoidFunction;
  onSelectRow: VoidFunction;
  onDeleteRow: VoidFunction;
  onCalculateBilling?: VoidFunction;
};

export default function OrderTableRow({
  row,
  selected,
  onEditRow,
  onSelectRow,
  onDeleteRow,
  onCalculateBilling,
}: Props) {
  const {
    customer_name,
    meal_plan_name,
    quantity,
    selected_days,
    price,
    start_date,
    end_date,
    payment_status,
  } = row;

  const { enqueueSnackbar } = useSnackbar();
  const [openConfirm, setOpenConfirm] = useState(false);

  // Check if order is locked based on payment status
  // Status flow: calculating → pending → approved → finalized → paid/partial_paid
  const isLocked = payment_status && ['approved', 'finalized', 'paid', 'partial_paid'].includes(payment_status);
  const isPending = payment_status === 'pending';
  const isCalculating = !payment_status || payment_status === 'calculating';

  // Get status display info
  const getStatusInfo = () => {
    if (payment_status === 'pending') {
      return {
        label: 'Pending Approval',
        color: 'warning' as const,
        icon: 'eva:clock-outline',
        tooltip: 'Billing is pending approval - cannot delete',
      };
    }
    if (payment_status === 'approved') {
      return {
        label: 'Approved (Locked)',
        color: 'info' as const,
        icon: 'eva:lock-outline',
        tooltip: 'Billing approved - order is locked',
      };
    }
    if (payment_status === 'finalized') {
      return {
        label: 'Invoiced (Locked)',
        color: 'primary' as const,
        icon: 'eva:file-text-outline',
        tooltip: 'Invoice generated - order is locked',
      };
    }
    if (payment_status === 'paid') {
      return {
        label: 'Paid (Locked)',
        color: 'success' as const,
        icon: 'eva:checkmark-circle-2-outline',
        tooltip: 'Payment completed - order is read-only',
      };
    }
    if (payment_status === 'partial_paid') {
      return {
        label: 'Partial Paid (Locked)',
        color: 'secondary' as const,
        icon: 'eva:checkmark-outline',
        tooltip: 'Partial payment received - order is read-only',
      };
    }
    if (payment_status === 'calculating') {
      return {
        label: 'Calculating',
        color: 'default' as const,
        icon: 'eva:refresh-outline',
        tooltip: 'Billing is being calculated',
      };
    }
    return null;
  };

  const statusInfo = getStatusInfo();

  const handleOpenConfirm = () => {
    setOpenConfirm(true);
  };

  const handleCloseConfirm = () => {
    setOpenConfirm(false);
  };

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell padding="checkbox">
          <Tooltip title={(isPending || isLocked) ? `Cannot select - ${statusInfo?.tooltip}` : ''}>
            <span>
              <Checkbox
                checked={selected}
                onClick={onSelectRow}
                disabled={isPending || isLocked}
              />
            </span>
          </Tooltip>
        </TableCell>

        {/* Customer with Meal Plan - Frozen column */}
        <TableCell
          sx={{
            position: 'sticky',
            left: 0,
            bgcolor: 'background.paper',
            zIndex: 1,
            minWidth: 200,
          }}
        >
          <Box>
            <Box sx={{ fontWeight: 500 }}>{customer_name}</Box>
            <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
              {meal_plan_name}
            </Box>
          </Box>
        </TableCell>

        {/* Period */}
        <TableCell>
          <Box sx={{ minWidth: 180 }}>
            {format(new Date(start_date), 'dd MMM yyyy')} - {format(new Date(end_date), 'dd MMM yyyy')}
          </Box>
        </TableCell>

        {/* Quantity */}
        <TableCell align="center">
          <Box sx={{ fontWeight: 500 }}>
            {quantity}
          </Box>
        </TableCell>

        {/* Days */}
        <TableCell>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected_days && selected_days.length > 0 ? (
              selected_days.slice(0, 3).map((day) => (
                <Chip key={day} label={day.substring(0, 3)} size="small" />
              ))
            ) : (
              <Chip label="All" size="small" />
            )}
            {selected_days && selected_days.length > 3 && (
              <Chip label={`+${selected_days.length - 3}`} size="small" variant="outlined" />
            )}
          </Box>
        </TableCell>

        {/* Price */}
        <TableCell align="right">
          <Box sx={{ fontWeight: 600 }}>CAD ${Number(price).toFixed(2)}</Box>
        </TableCell>

        {/* Status */}
        <TableCell>
          {statusInfo ? (
            <Chip
              label={statusInfo.label}
              size="small"
              color={statusInfo.color}
              icon={<Iconify icon={statusInfo.icon} width={14} />}
            />
          ) : (
            <Chip label="Draft" size="small" color="default" />
          )}
        </TableCell>

        {/* Action Buttons */}
        <TableCell align="right">
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            <Tooltip title={isLocked ? `Cannot edit - ${statusInfo?.tooltip}` : 'Edit'}>
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  if (isLocked) {
                    enqueueSnackbar(
                      `Cannot edit order - ${statusInfo?.tooltip}`,
                      { variant: 'warning' }
                    );
                    return;
                  }
                  onEditRow();
                }}
                disabled={isLocked}
              >
                <Iconify icon="eva:edit-fill" />
              </IconButton>
            </Tooltip>

            {onCalculateBilling && (
              <Tooltip title={statusInfo ? statusInfo.label : 'Calculate'}>
                <IconButton
                  size="small"
                  color="info"
                  onClick={onCalculateBilling}
                >
                  <Iconify icon={statusInfo ? statusInfo.icon : 'eva:calculator-fill'} />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title={(isPending || isLocked) ? `Cannot delete - ${statusInfo?.tooltip}` : 'Delete'}>
              <IconButton
                size="small"
                color="error"
                onClick={() => {
                  if (isPending || isLocked) {
                    enqueueSnackbar(
                      `Cannot delete order - ${statusInfo?.tooltip}`,
                      { variant: 'warning' }
                    );
                    return;
                  }
                  handleOpenConfirm();
                }}
                disabled={isPending || isLocked}
              >
                <Iconify icon={(isPending || isLocked) ? 'eva:lock-outline' : 'eva:trash-2-outline'} />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>

      <ConfirmDialog
        open={openConfirm}
        onClose={handleCloseConfirm}
        title="Delete"
        content="Are you sure want to delete this order?"
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              onDeleteRow();
              handleCloseConfirm();
            }}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}
