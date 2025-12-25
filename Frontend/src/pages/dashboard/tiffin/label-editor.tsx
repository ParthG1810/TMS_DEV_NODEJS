import { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
// @mui
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Container,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  Box,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  InputAdornment,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
} from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// @types
import {
  LabelTemplate,
  CreateLabelTemplateRequest,
  CustomPlaceholder,
  SYSTEM_PLACEHOLDERS,
  PRESET_LABEL_SIZES,
  FONT_SIZE_PRESETS,
  DEFAULT_ZEBRA_PRINT_SETTINGS,
  ZEBRA_GX430D_SPECS,
  inchesToPixels,
  replacePlaceholders,
  getSamplePreviewData,
} from '../../../@types/label';
// components
import Iconify from '../../../components/iconify';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import { useSnackbar } from '../../../components/snackbar';
import DashboardLayout from '../../../layouts/dashboard';
import axios from '../../../utils/axios';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <Box sx={{ height: 200, bgcolor: 'grey.100' }} />,
});
import 'react-quill/dist/quill.snow.css';

// ----------------------------------------------------------------------

LabelEditorPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function LabelEditorPage() {
  const { push, query } = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const editorRef = useRef<any>(null);

  const editId = query.id ? parseInt(query.id as string) : null;
  const isEdit = !!editId;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [widthInches, setWidthInches] = useState(4.0);
  const [heightInches, setHeightInches] = useState(2.0);
  const [templateHtml, setTemplateHtml] = useState('<p>{{customerName}}</p><p>{{customerAddress}}</p>');
  const [customPlaceholders, setCustomPlaceholders] = useState<CustomPlaceholder[]>([]);
  const [printSettings, setPrintSettings] = useState(DEFAULT_ZEBRA_PRINT_SETTINGS);
  const [isDefault, setIsDefault] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [customPlaceholderDialog, setCustomPlaceholderDialog] = useState(false);
  const [newPlaceholder, setNewPlaceholder] = useState({ key: '', defaultValue: '', description: '' });
  const [originalTemplate, setOriginalTemplate] = useState<LabelTemplate | null>(null);

  // Load template if editing
  useEffect(() => {
    if (editId) {
      loadTemplate(editId);
    }
  }, [editId]);

  const loadTemplate = async (id: number) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`/api/label-templates/${id}`);
      if (response.data.success) {
        const template = response.data.data;
        setName(template.name);
        setDescription(template.description || '');
        setWidthInches(template.width_inches);
        setHeightInches(template.height_inches);
        setTemplateHtml(template.template_html);
        setCustomPlaceholders(template.custom_placeholders || []);
        setPrintSettings(template.print_settings || DEFAULT_ZEBRA_PRINT_SETTINGS);
        setIsDefault(template.is_default);
        setOriginalTemplate(template);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      enqueueSnackbar('Failed to load template', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle preset size selection
  const handlePresetChange = (presetName: string) => {
    const preset = PRESET_LABEL_SIZES.find((p) => p.name === presetName);
    if (preset && preset.width > 0) {
      setWidthInches(preset.width);
      setHeightInches(preset.height);
    }
  };

  // Insert placeholder into editor
  const insertPlaceholder = (key: string) => {
    const placeholder = `{{${key}}}`;
    setTemplateHtml((prev) => prev + placeholder);
    enqueueSnackbar(`Inserted {{${key}}}`, { variant: 'info' });
  };

  // Add custom placeholder
  const handleAddCustomPlaceholder = () => {
    if (!newPlaceholder.key.trim()) {
      enqueueSnackbar('Placeholder key is required', { variant: 'error' });
      return;
    }

    // Validate key format (alphanumeric and camelCase)
    const keyRegex = /^[a-zA-Z][a-zA-Z0-9]*$/;
    if (!keyRegex.test(newPlaceholder.key)) {
      enqueueSnackbar('Key must start with a letter and contain only alphanumeric characters', {
        variant: 'error',
      });
      return;
    }

    // Check for duplicates
    const isDuplicate =
      customPlaceholders.some((p) => p.key === newPlaceholder.key) ||
      SYSTEM_PLACEHOLDERS.some((p) => p.key === newPlaceholder.key);

    if (isDuplicate) {
      enqueueSnackbar('This placeholder key already exists', { variant: 'error' });
      return;
    }

    setCustomPlaceholders((prev) => [...prev, newPlaceholder]);
    setNewPlaceholder({ key: '', defaultValue: '', description: '' });
    setCustomPlaceholderDialog(false);
    enqueueSnackbar('Custom placeholder added');
  };

  // Remove custom placeholder
  const handleRemoveCustomPlaceholder = (key: string) => {
    setCustomPlaceholders((prev) => prev.filter((p) => p.key !== key));
  };

  // Save template
  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      enqueueSnackbar('Template name is required', { variant: 'error' });
      return;
    }
    if (widthInches < 0.75 || widthInches > ZEBRA_GX430D_SPECS.maxPrintWidth) {
      enqueueSnackbar(
        `Width must be between 0.75 and ${ZEBRA_GX430D_SPECS.maxPrintWidth} inches`,
        { variant: 'error' }
      );
      return;
    }
    if (!templateHtml.trim()) {
      enqueueSnackbar('Template content is required', { variant: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      const data: CreateLabelTemplateRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        width_inches: widthInches,
        height_inches: heightInches,
        template_html: templateHtml,
        custom_placeholders: customPlaceholders.length > 0 ? customPlaceholders : undefined,
        print_settings: printSettings,
        is_default: isDefault,
      };

      if (isEdit && editId) {
        await axios.put(`/api/label-templates/${editId}`, data);
        enqueueSnackbar('Template updated successfully');
      } else {
        await axios.post('/api/label-templates', data);
        enqueueSnackbar('Template created successfully');
      }

      push(PATH_DASHBOARD.tiffin.labelTemplates);
    } catch (error: any) {
      console.error('Error saving template:', error);
      enqueueSnackbar(error.response?.data?.error || 'Failed to save template', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel and load default (original)
  const handleCancelAndLoadDefault = () => {
    if (originalTemplate) {
      setName(originalTemplate.name);
      setDescription(originalTemplate.description || '');
      setWidthInches(originalTemplate.width_inches);
      setHeightInches(originalTemplate.height_inches);
      setTemplateHtml(originalTemplate.template_html);
      setCustomPlaceholders(originalTemplate.custom_placeholders || []);
      setPrintSettings(originalTemplate.print_settings || DEFAULT_ZEBRA_PRINT_SETTINGS);
      setIsDefault(originalTemplate.is_default);
      enqueueSnackbar('Reverted to saved version');
    } else {
      push(PATH_DASHBOARD.tiffin.labelTemplates);
    }
  };

  // Generate preview HTML
  const getPreviewHtml = useCallback(() => {
    const sampleData = getSamplePreviewData();
    // Add custom placeholder defaults
    customPlaceholders.forEach((p) => {
      sampleData[p.key] = p.defaultValue || `[${p.key}]`;
    });
    return replacePlaceholders(templateHtml, sampleData);
  }, [templateHtml, customPlaceholders]);

  // Quill modules configuration
  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      [{ size: ['8pt', '10pt', '12pt', '14pt', '18pt', '24pt'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['image'],
      ['clean'],
    ],
    history: {
      delay: 500,
      maxStack: 100,
      userOnly: true,
    },
  };

  const quillFormats = [
    'header',
    'size',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'background',
    'align',
    'image',
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
        }
      }
      if (e.key === 'Escape') {
        handleCancelAndLoadDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [name, templateHtml, widthInches, heightInches]);

  return (
    <>
      <Head>
        <title>{isEdit ? 'Edit Label Template' : 'New Label Template'} | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading={isEdit ? 'Edit Label Template' : 'Create Label Template'}
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Label Templates', href: PATH_DASHBOARD.tiffin.labelTemplates },
            { name: isEdit ? 'Edit' : 'New' },
          ]}
        />

        <Alert severity="info" sx={{ mb: 3 }}>
          Keyboard shortcuts: Ctrl+S (Save), Escape (Cancel)
        </Alert>

        <Grid container spacing={3}>
          {/* Left Column - Editor */}
          <Grid item xs={12} md={8}>
            {/* Template Info */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Template Information" />
              <CardContent>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Template Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g., Standard Tiffin 4x2"
                  />
                  <TextField
                    fullWidth
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={2}
                    placeholder="Optional description"
                  />
                </Stack>
              </CardContent>
            </Card>

            {/* Label Size */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Label Size" />
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel>Preset Size</InputLabel>
                      <Select
                        label="Preset Size"
                        value=""
                        onChange={(e) => handlePresetChange(e.target.value)}
                      >
                        {PRESET_LABEL_SIZES.map((preset) => (
                          <MenuItem key={preset.name} value={preset.name}>
                            {preset.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      label="Width"
                      type="number"
                      value={widthInches}
                      onChange={(e) => setWidthInches(parseFloat(e.target.value) || 0)}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">in</InputAdornment>,
                        inputProps: { min: 0.75, max: 4.09, step: 0.25 },
                      }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      label="Height"
                      type="number"
                      value={heightInches}
                      onChange={(e) => setHeightInches(parseFloat(e.target.value) || 0)}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">in</InputAdornment>,
                        inputProps: { min: 0.5, max: 12, step: 0.25 },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Typography variant="caption" color="text.secondary">
                      Max: {ZEBRA_GX430D_SPECS.maxPrintWidth}" (GX430d)
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Editor */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Template Editor" />
              <CardContent>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  {widthInches}" x {heightInches}" ({inchesToPixels(widthInches)}px x{' '}
                  {inchesToPixels(heightInches)}px at 96 DPI)
                </Typography>
                <Box
                  sx={{
                    '& .quill': {
                      display: 'flex',
                      flexDirection: 'column',
                    },
                    '& .ql-toolbar': {
                      borderRadius: '8px 8px 0 0',
                      backgroundColor: '#f5f5f5',
                      borderColor: 'grey.300',
                    },
                    '& .ql-container': {
                      width: inchesToPixels(widthInches),
                      height: inchesToPixels(heightInches),
                      border: '2px dashed',
                      borderColor: 'grey.400',
                      borderRadius: '0 0 8px 8px',
                      backgroundColor: 'white',
                      mx: 'auto',
                      overflow: 'hidden',
                    },
                    '& .ql-editor': {
                      width: '100%',
                      height: '100%',
                      padding: '8px',
                      overflow: 'auto',
                    },
                  }}
                >
                  <ReactQuill
                    ref={editorRef}
                    theme="snow"
                    value={templateHtml}
                    onChange={setTemplateHtml}
                    modules={quillModules}
                    formats={quillFormats}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Print Settings */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Print Settings (Zebra GX430d)" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      label="Darkness"
                      type="number"
                      value={printSettings.darkness}
                      onChange={(e) =>
                        setPrintSettings((prev) => ({
                          ...prev,
                          darkness: parseInt(e.target.value) || 15,
                        }))
                      }
                      InputProps={{
                        inputProps: { min: 0, max: 30 },
                      }}
                      helperText="0-30"
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      label="Print Speed"
                      type="number"
                      value={printSettings.printSpeed}
                      onChange={(e) =>
                        setPrintSettings((prev) => ({
                          ...prev,
                          printSpeed: parseInt(e.target.value) || 4,
                        }))
                      }
                      InputProps={{
                        endAdornment: <InputAdornment position="end">in/s</InputAdornment>,
                        inputProps: { min: 1, max: 4 },
                      }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>Print Method</InputLabel>
                      <Select
                        label="Print Method"
                        value={printSettings.printMethod}
                        onChange={(e) =>
                          setPrintSettings((prev) => ({
                            ...prev,
                            printMethod: e.target.value as 'native' | 'usb-direct',
                          }))
                        }
                      >
                        <MenuItem value="native">Windows Driver</MenuItem>
                        <MenuItem value="usb-direct">Direct USB</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>Media Type</InputLabel>
                      <Select
                        label="Media Type"
                        value={printSettings.mediaType}
                        onChange={(e) =>
                          setPrintSettings((prev) => ({
                            ...prev,
                            mediaType: e.target.value as 'direct-thermal' | 'thermal-transfer',
                          }))
                        }
                      >
                        <MenuItem value="direct-thermal">Direct Thermal</MenuItem>
                        <MenuItem value="thermal-transfer">Thermal Transfer</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Placeholders & Preview */}
          <Grid item xs={12} md={4}>
            {/* Placeholders */}
            <Card sx={{ mb: 3 }}>
              <CardHeader
                title="Placeholders"
                subheader="Click to insert into template"
              />
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  System Placeholders
                </Typography>
                <Stack spacing={1} sx={{ mb: 2 }}>
                  {SYSTEM_PLACEHOLDERS.map((p) => (
                    <Box
                      key={p.key}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'grey.100',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'grey.200' },
                      }}
                      onClick={() => insertPlaceholder(p.key)}
                    >
                      <Box>
                        <Typography variant="body2" fontFamily="monospace">
                          {`{{${p.key}}}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.description}
                        </Typography>
                      </Box>
                      <IconButton size="small">
                        <Iconify icon="eva:plus-circle-fill" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Custom Placeholders
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Iconify icon="eva:plus-fill" />}
                    onClick={() => setCustomPlaceholderDialog(true)}
                  >
                    Add
                  </Button>
                </Stack>
                <Stack spacing={1}>
                  {customPlaceholders.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      No custom placeholders yet
                    </Typography>
                  ) : (
                    customPlaceholders.map((p) => (
                      <Box
                        key={p.key}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1,
                          borderRadius: 1,
                          bgcolor: 'primary.lighter',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'primary.light' },
                        }}
                        onClick={() => insertPlaceholder(p.key)}
                      >
                        <Box>
                          <Typography variant="body2" fontFamily="monospace">
                            {`{{${p.key}}}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.description || p.defaultValue}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCustomPlaceholder(p.key);
                          }}
                        >
                          <Iconify icon="eva:trash-2-outline" />
                        </IconButton>
                      </Box>
                    ))
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Live Preview */}
            <Card sx={{ mb: 3 }}>
              <CardHeader
                title="Live Preview"
                action={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="caption">Zoom:</Typography>
                    <Slider
                      value={previewZoom}
                      onChange={(e, v) => setPreviewZoom(v as number)}
                      min={50}
                      max={200}
                      step={10}
                      sx={{ width: 100 }}
                      size="small"
                    />
                    <Typography variant="caption">{previewZoom}%</Typography>
                  </Stack>
                }
              />
              <CardContent>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: 'grey.50',
                    overflow: 'auto',
                    maxHeight: 400,
                  }}
                >
                  <Box
                    sx={{
                      width: inchesToPixels(widthInches),
                      minHeight: inchesToPixels(heightInches),
                      border: '1px solid',
                      borderColor: 'grey.400',
                      bgcolor: 'white',
                      transform: `scale(${previewZoom / 100})`,
                      transformOrigin: 'top left',
                      p: 1,
                    }}
                    dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                  />
                </Paper>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Preview shows sample data. Actual values will be replaced during printing.
                </Typography>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Stack spacing={2}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<Iconify icon="eva:save-fill" />}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Template'}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Iconify icon="eva:close-fill" />}
                onClick={handleCancelAndLoadDefault}
              >
                {isEdit ? 'Cancel & Load Default' : 'Cancel'}
              </Button>
              {!isEdit && (
                <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  startIcon={<Iconify icon="eva:copy-fill" />}
                  onClick={() => {
                    // Save as new logic would go here
                    enqueueSnackbar('Use Save to create new template', { variant: 'info' });
                  }}
                >
                  Save As New
                </Button>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Container>

      {/* Add Custom Placeholder Dialog */}
      <Dialog open={customPlaceholderDialog} onClose={() => setCustomPlaceholderDialog(false)}>
        <DialogTitle>Add Custom Placeholder</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
            <TextField
              fullWidth
              label="Placeholder Key"
              value={newPlaceholder.key}
              onChange={(e) => setNewPlaceholder((prev) => ({ ...prev, key: e.target.value }))}
              placeholder="e.g., routeNumber"
              helperText="Will become {{routeNumber}}"
            />
            <TextField
              fullWidth
              label="Default Value"
              value={newPlaceholder.defaultValue}
              onChange={(e) => setNewPlaceholder((prev) => ({ ...prev, defaultValue: e.target.value }))}
              placeholder="e.g., R1"
            />
            <TextField
              fullWidth
              label="Description"
              value={newPlaceholder.description}
              onChange={(e) => setNewPlaceholder((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Route number for delivery"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomPlaceholderDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddCustomPlaceholder}>
            Add Placeholder
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
