import { useState } from 'react';
import { format } from 'date-fns';
// @mui
import {
  TableRow,
  Checkbox,
  TableCell,
  IconButton,
  MenuItem,
  Chip,
  Box,
  Tooltip,
} from '@mui/material';
// @types
import { ICustomerOrder } from '../../../../../@types/tms';
// components
import Iconify from '../../../../../components/iconify';
import MenuPopover from '../../../../../components/menu-popover';
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
  const [openPopover, setOpenPopover] = useState<HTMLElement | null>(null);

  // Check if order is locked (any non-calculating status)
  const isLocked = payment_status && ['pending', 'received'].includes(payment_status);
  const isPaid = payment_status === 'paid';
  const isDisabled = isLocked || isPaid; // Disable for all locked states

  // Get status display info
  const getStatusInfo = () => {
    if (payment_status === 'pending') {
      return {
        label: 'Pending Approval',
        color: 'warning' as const,
        icon: 'eva:clock-outline',
        tooltip: 'Billing is pending approval',
      };
    }
    if (payment_status === 'received') {
      return {
        label: 'Approved, Payment Waiting',
        color: 'info' as const,
        icon: 'eva:checkmark-outline',
        tooltip: 'Billing approved, waiting for payment',
      };
    }
    if (payment_status === 'paid') {
      return {
        label: 'Paid',
        color: 'success' as const,
        icon: 'eva:checkmark-circle-2-outline',
        tooltip: 'Payment completed - read only',
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

  const handleOpenPopover = (event: React.MouseEvent<HTMLElement>) => {
    setOpenPopover(event.currentTarget);
  };

  const handleClosePopover = () => {
    setOpenPopover(null);
  };

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell padding="checkbox">
          <Tooltip title={statusInfo ? `Cannot select - ${statusInfo.tooltip}` : ''}>
            <Checkbox
              checked={selected}
              onClick={onSelectRow}
              disabled={isDisabled}
            />
          </Tooltip>
        </TableCell>

        <TableCell>
          {customer_name}
          {statusInfo && (
            <Chip
              label={statusInfo.label}
              size="small"
              color={statusInfo.color}
              sx={{ ml: 1, fontSize: 10 }}
              icon={<Iconify icon={statusInfo.icon} width={14} />}
            />
          )}
        </TableCell>

        <TableCell>{meal_plan_name}</TableCell>

        <TableCell align="center">{quantity}</TableCell>

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

        <TableCell align="right">CAD ${Number(price).toFixed(2)}</TableCell>

        <TableCell>
          {format(new Date(start_date), 'dd MMM yyyy')} - {format(new Date(end_date), 'dd MMM yyyy')}
        </TableCell>

        <TableCell align="right">
          <IconButton color={openPopover ? 'inherit' : 'default'} onClick={handleOpenPopover}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      <MenuPopover
        open={openPopover}
        onClose={handleClosePopover}
        arrow="right-top"
        sx={{ width: 160 }}
      >
        <Tooltip
          title={isDisabled ? `Cannot edit - ${statusInfo?.tooltip}` : ''}
          placement="left"
        >
          <MenuItem
            onClick={() => {
              if (isDisabled) {
                enqueueSnackbar(
                  `Cannot edit order - ${statusInfo?.tooltip}. ${isPaid ? 'Order is completed.' : 'Please reject or approve the billing first.'}`,
                  { variant: 'warning' }
                );
                handleClosePopover();
                return;
              }
              onEditRow();
              handleClosePopover();
            }}
            sx={{
              color: isDisabled ? 'text.disabled' : 'inherit',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.5 : 1,
            }}
          >
            <Iconify icon={isDisabled ? 'eva:lock-outline' : 'eva:edit-fill'} />
            {isDisabled ? 'Locked' : 'Edit'}
          </MenuItem>
        </Tooltip>

        {onCalculateBilling && (
          <MenuItem
            onClick={() => {
              onCalculateBilling();
              handleClosePopover();
            }}
            sx={{ color: statusInfo ? statusInfo.color + '.main' : 'info.main' }}
          >
            <Iconify icon={statusInfo ? statusInfo.icon : 'eva:calculator-fill'} />
            {statusInfo ? statusInfo.label : 'Calculate'}
          </MenuItem>
        )}

        <Tooltip
          title={isDisabled ? `Cannot delete - ${statusInfo?.tooltip}` : ''}
          placement="left"
        >
          <MenuItem
            onClick={() => {
              if (isDisabled) {
                enqueueSnackbar(
                  `Cannot delete order - ${statusInfo?.tooltip}. ${isPaid ? 'Order is completed.' : 'Please reject or approve the billing first.'}`,
                  { variant: 'warning' }
                );
                handleClosePopover();
                return;
              }
              handleOpenConfirm();
              handleClosePopover();
            }}
            sx={{
              color: isDisabled ? 'text.disabled' : 'error.main',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.5 : 1,
            }}
          >
            <Iconify icon={isDisabled ? 'eva:lock-outline' : 'eva:trash-2-outline'} />
            {isDisabled ? 'Locked' : 'Delete'}
          </MenuItem>
        </Tooltip>
      </MenuPopover>

      <ConfirmDialog
        open={openConfirm}
        onClose={handleCloseConfirm}
        title="Delete"
        content="Are you sure want to delete this order?"
        action={
          <MenuItem
            variant="contained"
            color="error"
            onClick={() => {
              onDeleteRow();
              handleCloseConfirm();
            }}
          >
            Delete
          </MenuItem>
        }
      />
    </>
  );
}
