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

  // Check if order is locked based on payment status
  // Status flow: calculating → pending → finalized → paid/partial_paid
  const isLocked = payment_status && ['finalized', 'paid', 'partial_paid'].includes(payment_status);
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
    if (payment_status === 'finalized') {
      return {
        label: 'Approved (Locked)',
        color: 'info' as const,
        icon: 'eva:lock-outline',
        tooltip: 'Billing approved - order is locked',
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
          <Tooltip title={isLocked ? `Cannot select - ${statusInfo?.tooltip}` : ''}>
            <Checkbox
              checked={selected}
              onClick={onSelectRow}
              disabled={isLocked}
            />
          </Tooltip>
        </TableCell>

        <TableCell sx={{ fontWeight: 600 }}>#{row.id}</TableCell>

        <TableCell>
          <Box>
            <Box sx={{ fontWeight: 500 }}>{customer_name}</Box>
            <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
              {row.customer_email || 'No email'}
            </Box>
          </Box>
        </TableCell>

        <TableCell>
          <Box>
            <Box>{format(new Date(start_date), 'dd MMM yyyy')}</Box>
            <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
              {format(new Date(start_date), 'h:mm a')}
            </Box>
          </Box>
        </TableCell>

        <TableCell align="center">
          <Box sx={{ fontWeight: 500 }}>
            {selected_days && selected_days.length > 0 ? selected_days.length : 7}
          </Box>
        </TableCell>

        <TableCell align="right">
          <Box sx={{ fontWeight: 600 }}>${Number(price).toFixed(2)}</Box>
        </TableCell>

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
          title={isLocked ? `Cannot edit - ${statusInfo?.tooltip}` : ''}
          placement="left"
        >
          <MenuItem
            onClick={() => {
              if (isLocked) {
                enqueueSnackbar(
                  `Cannot edit order - ${statusInfo?.tooltip}`,
                  { variant: 'warning' }
                );
                handleClosePopover();
                return;
              }
              onEditRow();
              handleClosePopover();
            }}
            sx={{
              color: isLocked ? 'text.disabled' : 'inherit',
              cursor: isLocked ? 'not-allowed' : 'pointer',
              opacity: isLocked ? 0.5 : 1,
            }}
          >
            <Iconify icon={isLocked ? 'eva:lock-outline' : 'eva:edit-fill'} />
            {isLocked ? 'Locked' : 'Edit'}
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
          title={(isPending || isLocked) ? `Cannot delete - ${statusInfo?.tooltip}` : ''}
          placement="left"
        >
          <MenuItem
            onClick={() => {
              if (isPending || isLocked) {
                enqueueSnackbar(
                  `Cannot delete order - ${statusInfo?.tooltip}`,
                  { variant: 'warning' }
                );
                handleClosePopover();
                return;
              }
              handleOpenConfirm();
              handleClosePopover();
            }}
            sx={{
              color: (isPending || isLocked) ? 'text.disabled' : 'error.main',
              cursor: (isPending || isLocked) ? 'not-allowed' : 'pointer',
              opacity: (isPending || isLocked) ? 0.5 : 1,
            }}
          >
            <Iconify icon={(isPending || isLocked) ? 'eva:lock-outline' : 'eva:trash-2-outline'} />
            {(isPending || isLocked) ? 'Locked' : 'Delete'}
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
