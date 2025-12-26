import { useState } from 'react';
import { Stack, InputAdornment, TextField, Button, MenuItem, IconButton } from '@mui/material';
// components
import Iconify from '../../../../../components/iconify';
import MenuPopover from '../../../../../components/menu-popover';

// ----------------------------------------------------------------------

type Props = {
  isFiltered: boolean;
  filterName: string;
  filterPriceOperator: string;
  filterPriceValue: string;
  onFilterName: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterPriceOperator: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterPriceValue: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onResetFilter: VoidFunction;
  onPrint?: VoidFunction;
  onImport?: VoidFunction;
  onExport?: VoidFunction;
};

const PRICE_OPERATORS = [
  { value: '', label: 'Any' },
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: '<', label: '<' },
  { value: '<=', label: '<=' },
  { value: '==', label: '=' },
];

export default function MealPlanTableToolbar({
  isFiltered,
  filterName,
  filterPriceOperator,
  filterPriceValue,
  onFilterName,
  onFilterPriceOperator,
  onFilterPriceValue,
  onResetFilter,
  onPrint,
  onImport,
  onExport,
}: Props) {
  const [openPopover, setOpenPopover] = useState<HTMLElement | null>(null);

  const handleOpenPopover = (event: React.MouseEvent<HTMLElement>) => {
    setOpenPopover(event.currentTarget);
  };

  const handleClosePopover = () => {
    setOpenPopover(null);
  };

  return (
    <Stack
      spacing={2}
      alignItems="center"
      direction={{
        xs: 'column',
        md: 'row',
      }}
      sx={{ px: 2.5, py: 3 }}
    >
      {/* Price Filter */}
      <Stack direction="row" spacing={1} sx={{ minWidth: { md: 280 } }}>
        <TextField
          select
          label="Price"
          value={filterPriceOperator}
          onChange={onFilterPriceOperator}
          sx={{ width: 100 }}
        >
          {PRICE_OPERATORS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          type="number"
          label="Value"
          value={filterPriceValue}
          onChange={onFilterPriceValue}
          disabled={!filterPriceOperator}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          sx={{ width: 150 }}
        />
      </Stack>

      {/* Search */}
      <TextField
        fullWidth
        value={filterName}
        onChange={onFilterName}
        placeholder="Search meal plan name or description..."
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
      />

      {/* Actions Menu */}
      <IconButton onClick={handleOpenPopover} sx={{ flexShrink: 0 }}>
        <Iconify icon="eva:more-vertical-fill" />
      </IconButton>

      {isFiltered && (
        <Button
          color="error"
          sx={{ flexShrink: 0 }}
          onClick={onResetFilter}
          startIcon={<Iconify icon="eva:trash-2-outline" />}
        >
          Clear
        </Button>
      )}

      {/* Actions Popover */}
      <MenuPopover
        open={openPopover}
        onClose={handleClosePopover}
        arrow="right-top"
        sx={{ width: 160 }}
      >
        {onPrint && (
          <MenuItem
            onClick={() => {
              onPrint();
              handleClosePopover();
            }}
          >
            <Iconify icon="eva:printer-fill" />
            Print
          </MenuItem>
        )}

        {onImport && (
          <MenuItem
            onClick={() => {
              onImport();
              handleClosePopover();
            }}
          >
            <Iconify icon="eva:cloud-download-fill" />
            Import
          </MenuItem>
        )}

        {onExport && (
          <MenuItem
            onClick={() => {
              onExport();
              handleClosePopover();
            }}
          >
            <Iconify icon="eva:cloud-upload-fill" />
            Export
          </MenuItem>
        )}
      </MenuPopover>
    </Stack>
  );
}
