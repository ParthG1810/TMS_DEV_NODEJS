import { useState } from 'react';
// @mui
import {
  TableRow,
  Checkbox,
  TableCell,
  IconButton,
  MenuItem,
  Tooltip,
} from '@mui/material';
// @types
import { IMealPlan } from '../../../../../@types/tms';
// components
import Iconify from '../../../../../components/iconify';
import MenuPopover from '../../../../../components/menu-popover';
import ConfirmDialog from '../../../../../components/confirm-dialog';

// ----------------------------------------------------------------------

type Props = {
  row: IMealPlan;
  selected: boolean;
  onEditRow: VoidFunction;
  onSelectRow: VoidFunction;
  onDeleteRow: VoidFunction;
  hasOrders?: boolean;
};

export default function MealPlanTableRow({
  row,
  selected,
  onEditRow,
  onSelectRow,
  onDeleteRow,
  hasOrders = false,
}: Props) {
  const { meal_name, frequency, days, price, description } = row;

  const [openConfirm, setOpenConfirm] = useState(false);
  const [openPopover, setOpenPopover] = useState<HTMLElement | null>(null);

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
          <Tooltip title={hasOrders ? 'Cannot select meal plan used in orders' : ''}>
            <span>
              <Checkbox
                checked={selected}
                onClick={onSelectRow}
                disabled={hasOrders}
              />
            </span>
          </Tooltip>
        </TableCell>

        <TableCell>{meal_name}</TableCell>

        <TableCell>{frequency}</TableCell>

        <TableCell>{days}</TableCell>

        <TableCell align="right">CAD ${Number(price).toFixed(2)}</TableCell>

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
        sx={{ width: 140 }}
      >
        <MenuItem
          onClick={() => {
            onEditRow();
            handleClosePopover();
          }}
        >
          <Iconify icon="eva:edit-fill" />
          Edit
        </MenuItem>

        <Tooltip title={hasOrders ? 'Cannot delete meal plan used in orders' : ''}>
          <span>
            <MenuItem
              onClick={() => {
                handleOpenConfirm();
                handleClosePopover();
              }}
              sx={{ color: hasOrders ? 'text.disabled' : 'error.main' }}
              disabled={hasOrders}
            >
              <Iconify icon="eva:trash-2-outline" />
              Delete
            </MenuItem>
          </span>
        </Tooltip>
      </MenuPopover>

      <ConfirmDialog
        open={openConfirm}
        onClose={handleCloseConfirm}
        title="Delete"
        content="Are you sure want to delete this meal plan?"
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
