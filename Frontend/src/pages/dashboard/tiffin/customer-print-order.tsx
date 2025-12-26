import { useEffect, useState } from 'react';
import Head from 'next/head';
// @mui
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Container,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Stack,
  Box,
  Alert,
} from '@mui/material';
// dnd-kit
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// @types
import { CustomerWithPrintOrder } from '../../../@types/label';
// components
import Iconify from '../../../components/iconify';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import { useSnackbar } from '../../../components/snackbar';
import DashboardLayout from '../../../layouts/dashboard';
import axios from '../../../utils/axios';

// ----------------------------------------------------------------------

CustomerPrintOrderPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default function CustomerPrintOrderPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [customers, setCustomers] = useState<CustomerWithPrintOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch customers
  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/customer-print-order');
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      enqueueSnackbar('Failed to load customers', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCustomers((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasChanges(true);
    }
  };

  // Save order
  const handleSaveOrder = async () => {
    setIsSaving(true);
    try {
      const orders = customers.map((customer, index) => ({
        customer_id: customer.id,
        print_order: index,
      }));

      await axios.put('/api/customer-print-order', { orders });
      enqueueSnackbar('Print order saved successfully');
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving order:', error);
      enqueueSnackbar(error.response?.data?.error || 'Failed to save order', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to alphabetical
  const handleResetAlphabetical = async () => {
    try {
      const response = await axios.post('/api/customer-print-order/reset');
      if (response.data.success) {
        setCustomers(response.data.data.customers);
        enqueueSnackbar('Print order reset to alphabetical');
        setHasChanges(false);
      }
    } catch (error: any) {
      console.error('Error resetting order:', error);
      enqueueSnackbar(error.response?.data?.error || 'Failed to reset order', { variant: 'error' });
    }
  };

  return (
    <>
      <Head>
        <title>Customer Print Order | TMS</title>
      </Head>

      <Container maxWidth="md">
        <CustomBreadcrumbs
          heading="Customer Print Order"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Customer Print Order' },
          ]}
          action={
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<Iconify icon="eva:refresh-fill" />}
                onClick={handleResetAlphabetical}
              >
                Reset to Alphabetical
              </Button>
              <Button
                variant="contained"
                startIcon={<Iconify icon="eva:save-fill" />}
                onClick={handleSaveOrder}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Order'}
              </Button>
            </Stack>
          }
        />

        {hasChanges && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You have unsaved changes. Click "Save Order" to save your changes.
          </Alert>
        )}

        <Card>
          <CardHeader
            title="Drag and Drop to Reorder"
            subheader="Set the order in which customers will appear when printing labels"
          />
          <CardContent>
            {isLoading ? (
              <Typography>Loading customers...</Typography>
            ) : customers.length === 0 ? (
              <Typography color="text.secondary">No customers found</Typography>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={customers.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <List>
                    {customers.map((customer, index) => (
                      <SortableCustomerItem
                        key={customer.id}
                        customer={customer}
                        index={index}
                      />
                    ))}
                  </List>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Total: {customers.length} customers
          </Typography>
        </Box>
      </Container>
    </>
  );
}

// ----------------------------------------------------------------------

interface SortableCustomerItemProps {
  customer: CustomerWithPrintOrder;
  index: number;
}

function SortableCustomerItem({ customer, index }: SortableCustomerItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: customer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 1,
        bgcolor: isDragging ? 'action.hover' : 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'grab',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
      {...attributes}
      {...listeners}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        <Iconify icon="eva:menu-outline" sx={{ color: 'text.secondary' }} />
      </ListItemIcon>
      <ListItemIcon sx={{ minWidth: 40 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {index + 1}
        </Typography>
      </ListItemIcon>
      <ListItemText
        primary={customer.name}
        secondary={
          <Stack direction="row" spacing={2} component="span">
            <Typography variant="caption" component="span">
              {customer.address}
            </Typography>
            {customer.phone && (
              <Typography variant="caption" component="span" color="text.secondary">
                {customer.phone}
              </Typography>
            )}
          </Stack>
        }
      />
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Iconify icon="eva:move-outline" sx={{ color: 'text.secondary' }} />
      </Box>
    </ListItem>
  );
}
