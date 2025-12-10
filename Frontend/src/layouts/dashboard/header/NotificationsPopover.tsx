import { noCase } from 'change-case';
import { useState, useEffect } from 'react';
// @mui
import {
  Box,
  Stack,
  List,
  Badge,
  Button,
  Avatar,
  Tooltip,
  Divider,
  IconButton,
  Typography,
  ListItemText,
  ListSubheader,
  ListItemAvatar,
  ListItemButton,
} from '@mui/material';
// utils
import { fToNow } from '../../../utils/formatTime';
import axios from '../../../utils/axios';
// components
import Iconify from '../../../components/iconify';
import Scrollbar from '../../../components/scrollbar';
import MenuPopover from '../../../components/menu-popover';
import { IconButtonAnimate } from '../../../components/animate';
import { useSnackbar } from '../../../components/snackbar';

// ----------------------------------------------------------------------

interface PaymentNotification {
  id: number;
  notification_type: string;
  billing_id: number;
  customer_id: number;
  billing_month: string;
  title: string;
  message: string;
  priority: string;
  is_read: boolean;
  is_dismissed: boolean;
  action_url: string;
  created_at: string;
}

export default function NotificationsPopover() {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [openPopover, setOpenPopover] = useState<HTMLElement | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const [hasShownStartupAlert, setHasShownStartupAlert] = useState(false);

  // Fetch notifications from API
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Show startup alert for pending approvals
  useEffect(() => {
    if (!hasShownStartupAlert && notifications.length > 0) {
      const pendingApprovals = notifications.filter(
        (n) => !n.is_read && n.notification_type === 'billing_pending_approval'
      );

      if (pendingApprovals.length > 0) {
        enqueueSnackbar(
          `You have ${pendingApprovals.length} billing${
            pendingApprovals.length > 1 ? 's' : ''
          } pending approval. Check notifications!`,
          {
            variant: 'warning',
            autoHideDuration: 8000,
            anchorOrigin: {
              vertical: 'top',
              horizontal: 'right',
            },
          }
        );
        setHasShownStartupAlert(true);
      }
    }
  }, [notifications, hasShownStartupAlert, enqueueSnackbar]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/payment-notifications', {
        params: { unread_only: false },
      });
      if (response.data.success) {
        setNotifications(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const totalUnRead = notifications.filter((item) => !item.is_read).length;

  const handleOpenPopover = (event: React.MouseEvent<HTMLElement>) => {
    setOpenPopover(event.currentTarget);
  };

  const handleClosePopover = () => {
    setOpenPopover(null);
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Mark all unread notifications as read
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);

      for (const id of unreadIds) {
        await axios.put(`/api/payment-notifications/${id}`, { is_read: true });
      }

      // Refresh notifications
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification: PaymentNotification) => {
    try {
      // Mark as read
      if (!notification.is_read) {
        await axios.put(`/api/payment-notifications/${notification.id}`, { is_read: true });
        await fetchNotifications();
      }

      // Navigate to action URL
      if (notification.action_url) {
        window.location.href = notification.action_url;
      }

      handleClosePopover();
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  return (
    <>
      <IconButtonAnimate
        color={openPopover ? 'primary' : 'default'}
        onClick={handleOpenPopover}
        sx={{ width: 40, height: 40 }}
      >
        <Badge badgeContent={totalUnRead} color="error">
          <Iconify icon="eva:bell-fill" />
        </Badge>
      </IconButtonAnimate>

      <MenuPopover open={openPopover} onClose={handleClosePopover} sx={{ width: 360, p: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', py: 2, px: 2.5 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1">Notifications</Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              You have {totalUnRead} unread messages
            </Typography>
          </Box>

          {totalUnRead > 0 && (
            <Tooltip title=" Mark all as read">
              <IconButton color="primary" onClick={handleMarkAllAsRead}>
                <Iconify icon="eva:done-all-fill" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Scrollbar sx={{ height: { xs: 340, sm: 'auto' } }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            <>
              <List
                disablePadding
                subheader={
                  <ListSubheader disableSticky sx={{ py: 1, px: 2.5, typography: 'overline' }}>
                    Unread
                  </ListSubheader>
                }
              >
                {notifications
                  .filter((n) => !n.is_read)
                  .slice(0, 5)
                  .map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                    />
                  ))}
              </List>

              {notifications.filter((n) => n.is_read).length > 0 && (
                <List
                  disablePadding
                  subheader={
                    <ListSubheader disableSticky sx={{ py: 1, px: 2.5, typography: 'overline' }}>
                      Read
                    </ListSubheader>
                  }
                >
                  {notifications
                    .filter((n) => n.is_read)
                    .slice(0, 5)
                    .map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                      />
                    ))}
                </List>
              )}
            </>
          )}
        </Scrollbar>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ p: 1 }}>
          <Button fullWidth disableRipple>
            View All
          </Button>
        </Box>
      </MenuPopover>
    </>
  );
}

// ----------------------------------------------------------------------

function NotificationItem({
  notification,
  onClick,
}: {
  notification: PaymentNotification;
  onClick: () => void;
}) {
  const { avatar, title } = renderContent(notification);

  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        py: 1.5,
        px: 2.5,
        mt: '1px',
        ...(!notification.is_read && {
          bgcolor: 'action.selected',
        }),
      }}
    >
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: 'background.neutral' }}>{avatar}</Avatar>
      </ListItemAvatar>

      <ListItemText
        disableTypography
        primary={title}
        secondary={
          <Stack direction="row" sx={{ mt: 0.5, typography: 'caption', color: 'text.disabled' }}>
            <Iconify icon="eva:clock-fill" width={16} sx={{ mr: 0.5 }} />
            <Typography variant="caption">{fToNow(new Date(notification.created_at))}</Typography>
          </Stack>
        }
      />
    </ListItemButton>
  );
}

// ----------------------------------------------------------------------

function renderContent(notification: PaymentNotification) {
  const title = (
    <Typography variant="subtitle2">
      {notification.title}
      <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
        &nbsp; {notification.message}
      </Typography>
    </Typography>
  );

  if (notification.notification_type === 'billing_pending_approval') {
    return {
      avatar: <Iconify icon="eva:credit-card-fill" width={24} />,
      title,
    };
  }
  if (notification.notification_type === 'month_end_calculation') {
    return {
      avatar: <Iconify icon="eva:calendar-fill" width={24} />,
      title,
    };
  }
  if (notification.notification_type === 'payment_received') {
    return {
      avatar: <Iconify icon="eva:checkmark-circle-fill" width={24} />,
      title,
    };
  }
  return {
    avatar: <Iconify icon="eva:bell-fill" width={24} />,
    title,
  };
}
