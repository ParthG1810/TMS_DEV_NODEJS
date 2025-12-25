// @mui
import {
  Box,
  Card,
  Table,
  Button,
  Divider,
  TableRow,
  TableBody,
  TableCell,
  CardProps,
  CardHeader,
  TableContainer,
  Typography,
  Stack,
} from '@mui/material';
// utils
import { fCurrency } from '../../../../utils/formatNumber';
// components
import Label from '../../../../components/label';
import Iconify from '../../../../components/iconify';
import Scrollbar from '../../../../components/scrollbar';
import { TableHeadCustom } from '../../../../components/table';
// types
import { IMonthlyBilling } from '../../../../@types/tms';

// ----------------------------------------------------------------------

interface Props extends CardProps {
  title?: string;
  subheader?: string;
  tableData: IMonthlyBilling[];
  onViewAll?: () => void;
  onViewBilling?: (billing: IMonthlyBilling) => void;
}

const TABLE_HEAD = [
  { id: 'customer', label: 'Customer' },
  { id: 'phone', label: 'Phone' },
  { id: 'month', label: 'Month' },
  { id: 'amount', label: 'Amount Due' },
  { id: 'status', label: 'Status' },
  { id: 'action', label: '', align: 'right' as const },
];

export default function AppPendingPayments({
  title,
  subheader,
  tableData,
  onViewAll,
  onViewBilling,
  ...other
}: Props) {
  const hasData = tableData && tableData.length > 0;

  return (
    <Card {...other}>
      <CardHeader
        title={title}
        subheader={subheader}
        sx={{ mb: 3 }}
        action={
          <Label color="error" variant="soft">
            {tableData.length} pending
          </Label>
        }
      />

      <TableContainer sx={{ overflow: 'unset' }}>
        <Scrollbar>
          <Table sx={{ minWidth: 720 }}>
            <TableHeadCustom headLabel={TABLE_HEAD} />

            <TableBody>
              {hasData ? (
                tableData.slice(0, 5).map((row) => (
                  <PendingPaymentRow
                    key={row.id}
                    row={row}
                    onView={() => onViewBilling?.(row)}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Stack spacing={1} alignItems="center" sx={{ py: 5 }}>
                      <Iconify icon="eva:checkmark-circle-2-fill" width={48} sx={{ color: 'success.main' }} />
                      <Typography variant="subtitle1" color="text.secondary">
                        No pending payments
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        All customers are up to date!
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Scrollbar>
      </TableContainer>

      {hasData && (
        <>
          <Divider />
          <Box sx={{ p: 2, textAlign: 'right' }}>
            <Button
              size="small"
              color="inherit"
              endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
              onClick={onViewAll}
            >
              View All ({tableData.length})
            </Button>
          </Box>
        </>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------

type PendingPaymentRowProps = {
  row: IMonthlyBilling;
  onView?: () => void;
};

function PendingPaymentRow({ row, onView }: PendingPaymentRowProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'partial_paid':
        return 'warning';
      case 'finalized':
        return 'info';
      case 'pending':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatMonth = (monthStr: string) => {
    try {
      const date = new Date(monthStr + '-01');
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return monthStr;
    }
  };

  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="subtitle2" noWrap>
          {row.customer_name || `Customer #${row.customer_id}`}
        </Typography>
      </TableCell>

      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {row.customer_phone || '-'}
        </Typography>
      </TableCell>

      <TableCell>{formatMonth(row.billing_month)}</TableCell>

      <TableCell>
        <Typography variant="subtitle2" color="error.main">
          {fCurrency(row.total_amount)}
        </Typography>
      </TableCell>

      <TableCell>
        <Label variant="soft" color={getStatusColor(row.status)}>
          {row.status.replace('_', ' ')}
        </Label>
      </TableCell>

      <TableCell align="right">
        <Button
          size="small"
          variant="outlined"
          startIcon={<Iconify icon="eva:eye-fill" />}
          onClick={onView}
        >
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}
