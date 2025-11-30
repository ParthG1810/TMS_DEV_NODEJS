import { useState } from 'react';
// @mui
import {
  Stack,
  Avatar,
  Button,
  Checkbox,
  TableRow,
  MenuItem,
  TableCell,
  IconButton,
  Typography,
} from '@mui/material';
// @types
import { ITMSIngredient } from '../../../../../@types/tms';
// components
import Label from '../../../../../components/label';
import Iconify from '../../../../../components/iconify';
import MenuPopover from '../../../../../components/menu-popover';
import ConfirmDialog from '../../../../../components/confirm-dialog';

// ----------------------------------------------------------------------

type Props = {
  row: ITMSIngredient;
  selected: boolean;
  onEditRow: VoidFunction;
  onSelectRow: VoidFunction;
  onDeleteRow: VoidFunction;
};

export default function IngredientTableRow({
  row,
  selected,
  onEditRow,
  onSelectRow,
  onDeleteRow,
}: Props) {
  const { name, description, vendors } = row;

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

  const defaultVendor = vendors.find((v) => v.is_default);

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell padding="checkbox">
          <Checkbox checked={selected} onClick={onSelectRow} />
        </TableCell>

        <TableCell>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar alt={name} sx={{ bgcolor: 'primary.main' }}>
              {name.charAt(0).toUpperCase()}
            </Avatar>

            <div>
              <Typography variant="subtitle2" noWrap>
                {name}
              </Typography>

              <Typography noWrap variant="body2" sx={{ color: 'text.disabled' }}>
                {description || 'No description'}
              </Typography>
            </div>
          </Stack>
        </TableCell>

        <TableCell align="left">
          <Label
            variant="soft"
            color={(vendors.length === 0 && 'error') || (vendors.length === 1 && 'warning') || 'success'}
          >
            {vendors.length} {vendors.length === 1 ? 'Vendor' : 'Vendors'}
          </Label>
        </TableCell>

        <TableCell align="left">
          {defaultVendor ? (
            <Stack>
              <Typography variant="body2">{defaultVendor.vendor_name}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                ${defaultVendor.price} / {defaultVendor.weight} {defaultVendor.package_size}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              No default vendor
            </Typography>
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
        sx={{ width: 140 }}
      >
        <MenuItem
          onClick={() => {
            handleOpenConfirm();
            handleClosePopover();
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="eva:trash-2-outline" />
          Delete
        </MenuItem>

        <MenuItem
          onClick={() => {
            onEditRow();
            handleClosePopover();
          }}
        >
          <Iconify icon="eva:edit-fill" />
          Edit
        </MenuItem>
      </MenuPopover>

      <ConfirmDialog
        open={openConfirm}
        onClose={handleCloseConfirm}
        title="Delete"
        content="Are you sure want to delete this product?"
        action={
          <Button variant="contained" color="error" onClick={onDeleteRow}>
            Delete
          </Button>
        }
      />
    </>
  );
}
