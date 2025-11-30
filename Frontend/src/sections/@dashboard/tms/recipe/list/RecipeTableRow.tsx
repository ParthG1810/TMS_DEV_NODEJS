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
import { ITMSRecipe } from '../../../../../@types/tms';
// utils
import { fCurrency } from '../../../../../utils/formatNumber';
// components
import Label from '../../../../../components/label';
import Image from '../../../../../components/image';
import Iconify from '../../../../../components/iconify';
import MenuPopover from '../../../../../components/menu-popover';
import ConfirmDialog from '../../../../../components/confirm-dialog';

// ----------------------------------------------------------------------

type Props = {
  row: ITMSRecipe;
  selected: boolean;
  onEditRow: VoidFunction;
  onSelectRow: VoidFunction;
  onDeleteRow: VoidFunction;
};

export default function RecipeTableRow({
  row,
  selected,
  onEditRow,
  onSelectRow,
  onDeleteRow,
}: Props) {
  const { name, description, ingredients, images, total_cost } = row;

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

  const primaryImage = images.find((img) => img.is_primary);
  const imageUrl = primaryImage?.image_url || images[0]?.image_url;

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell padding="checkbox">
          <Checkbox checked={selected} onClick={onSelectRow} />
        </TableCell>

        <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
          {imageUrl ? (
            <Image
              disabledEffect
              alt={name}
              src={imageUrl}
              sx={{ borderRadius: 1.5, width: 64, height: 64, mr: 2 }}
            />
          ) : (
            <Avatar
              alt={name}
              sx={{ mr: 2, width: 64, height: 64, bgcolor: 'primary.main' }}
            >
              {name.charAt(0).toUpperCase()}
            </Avatar>
          )}

          <Stack>
            <Typography variant="subtitle2" noWrap>
              {name}
            </Typography>

            <Typography noWrap variant="body2" sx={{ color: 'text.disabled' }}>
              {description || 'No description'}
            </Typography>
          </Stack>
        </TableCell>

        <TableCell align="center">
          <Label
            variant="soft"
            color={
              (ingredients.length === 0 && 'error') ||
              (ingredients.length <= 3 && 'warning') ||
              'success'
            }
          >
            {ingredients.length} {ingredients.length === 1 ? 'Ingredient' : 'Ingredients'}
          </Label>
        </TableCell>

        <TableCell align="center">
          {images.length > 0 ? (
            <Label variant="soft" color="info">
              {images.length} {images.length === 1 ? 'Image' : 'Images'}
            </Label>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              No images
            </Typography>
          )}
        </TableCell>

        <TableCell align="right">
          <Typography variant="subtitle2">
            {total_cost ? fCurrency(total_cost) : '-'}
          </Typography>
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
        content="Are you sure want to delete this recipe?"
        action={
          <Button variant="contained" color="error" onClick={onDeleteRow}>
            Delete
          </Button>
        }
      />
    </>
  );
}
