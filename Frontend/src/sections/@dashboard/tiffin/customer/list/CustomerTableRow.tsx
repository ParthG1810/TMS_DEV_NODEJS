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
import { ICustomer } from '../../../../../@types/tms';
// components
import Iconify from '../../../../../components/iconify';
import MenuPopover from '../../../../../components/menu-popover';
import ConfirmDialog from '../../../../../components/confirm-dialog';

// ----------------------------------------------------------------------

type Props = {
  row: ICustomer;
  selected: boolean;
  onEditRow: VoidFunction;
  onSelectRow: VoidFunction;
  onDeleteRow: VoidFunction;
  hasOrders?: boolean;
};

export default function CustomerTableRow({
  row,
  selected,
  onEditRow,
  onSelectRow,
  onDeleteRow,
  hasOrders = false,
}: Props) {
  const { name, phone, address } = row;

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
          <Checkbox checked={selected} onClick={onSelectRow} />
        </TableCell>

        <TableCell>{name}</TableCell>

        <TableCell>{phone || '-'}</TableCell>

        <TableCell>{address}</TableCell>

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

        <Tooltip title={hasOrders ? 'Cannot delete customer with orders' : ''}>
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
        content="Are you sure want to delete this customer?"
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
