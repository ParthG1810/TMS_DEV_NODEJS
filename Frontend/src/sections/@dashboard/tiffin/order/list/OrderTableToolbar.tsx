import { Stack, InputAdornment, TextField, Button, MenuItem, IconButton } from '@mui/material';
// components
import Iconify from '../../../../../components/iconify';
import MenuPopover from '../../../../../components/menu-popover';
import { useState } from 'react';

// ----------------------------------------------------------------------

type Props = {
  isFiltered: boolean;
  filterName: string;
  filterStartDate: Date | null;
  filterEndDate: Date | null;
  onFilterName: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterStartDate: (date: Date | null) => void;
  onFilterEndDate: (date: Date | null) => void;
  onResetFilter: VoidFunction;
  onPrint?: VoidFunction;
  onImport?: VoidFunction;
  onExport?: VoidFunction;
};

export default function OrderTableToolbar({
  isFiltered,
  filterName,
  filterStartDate,
  filterEndDate,
  onFilterName,
  onFilterStartDate,
  onFilterEndDate,
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
    <Stack spacing={2} sx={{ px: 2.5, py: 3 }}>
      {/* First row: Date filters, search, and actions */}
      <Stack
        spacing={2}
        alignItems="center"
        direction={{
          xs: 'column',
          md: 'row',
        }}
      >
        {/* Start Date */}
        <TextField
          fullWidth
          type="date"
          label="Start date"
          value={filterStartDate ? filterStartDate.toISOString().split('T')[0] : ''}
          onChange={(e) => onFilterStartDate(e.target.value ? new Date(e.target.value) : null)}
          InputLabelProps={{ shrink: true }}
          sx={{ maxWidth: { md: 200 } }}
        />

        {/* End Date */}
        <TextField
          fullWidth
          type="date"
          label="End date"
          value={filterEndDate ? filterEndDate.toISOString().split('T')[0] : ''}
          onChange={(e) => onFilterEndDate(e.target.value ? new Date(e.target.value) : null)}
          InputLabelProps={{ shrink: true }}
          sx={{ maxWidth: { md: 200 } }}
        />

        {/* Search */}
        <TextField
          fullWidth
          value={filterName}
          onChange={onFilterName}
          placeholder="Search customer or order number..."
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
      </Stack>

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
