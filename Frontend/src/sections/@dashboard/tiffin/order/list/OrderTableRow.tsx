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

  // Check if order is locked (billing is pending approval)
  const isLocked = payment_status === 'pending';

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
          <Tooltip title={isLocked ? 'Cannot select - billing is pending approval' : ''}>
            <Checkbox
              checked={selected}
              onClick={onSelectRow}
              disabled={isLocked}
            />
          </Tooltip>
        </TableCell>

        <TableCell>
          {customer_name}
          {isLocked && (
            <Chip
              label="Billing Pending"
              size="small"
              color="warning"
              sx={{ ml: 1, fontSize: 10 }}
              icon={<Iconify icon="eva:lock-outline" width={14} />}
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
          title={isLocked ? 'Cannot edit - billing is pending approval' : ''}
          placement="left"
        >
          <MenuItem
            onClick={() => {
              if (isLocked) {
                enqueueSnackbar(
                  'Cannot edit order - billing is pending approval. Please reject or approve the billing first.',
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
            sx={{ color: isLocked ? 'warning.main' : 'info.main' }}
          >
            <Iconify icon={isLocked ? 'eva:clock-outline' : 'eva:calculator-fill'} />
            {isLocked ? 'Pending Approval' : 'Calculate'}
          </MenuItem>
        )}

        <Tooltip
          title={isLocked ? 'Cannot delete - billing is pending approval' : ''}
          placement="left"
        >
          <MenuItem
            onClick={() => {
              if (isLocked) {
                enqueueSnackbar(
                  'Cannot delete order - billing is pending approval. Please reject or approve the billing first.',
                  { variant: 'warning' }
                );
                handleClosePopover();
                return;
              }
              handleOpenConfirm();
              handleClosePopover();
            }}
            sx={{
              color: isLocked ? 'text.disabled' : 'error.main',
              cursor: isLocked ? 'not-allowed' : 'pointer',
              opacity: isLocked ? 0.5 : 1,
            }}
          >
            <Iconify icon={isLocked ? 'eva:lock-outline' : 'eva:trash-2-outline'} />
            {isLocked ? 'Locked' : 'Delete'}
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
