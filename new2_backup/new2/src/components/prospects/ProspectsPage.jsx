
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { isBefore, isAfter, isToday, addDays } from 'date-fns';
import { useProspectsData } from '@/hooks/useProspectsData';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ArrowRight, Plus, Edit, X, Calendar, Table as TableIcon, FilterX, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import ProspectHistoryDrawer from '@/components/prospects/ProspectHistoryDrawer';
import CreateProspectModal from '@/components/prospects/CreateProspectModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { convertProspectToClient, updateProspectWithHistory, createProspect, buildProspectTagsMap, deleteProspectWithReason, markAsLost, restoreProspect } from '@/lib/prospectsService';
import { getAvailableTags } from '@/lib/tagsService';
import { supabase } from '@/lib/customSupabaseClient';
import { formatM } from '@/lib/formatters';
import { sortProspectsByPriority } from '@/lib/prospectSortingUtils';

// Segments Service and Modals
import { getSavedSegments, createSavedSegment, updateSavedSegment, deleteSavedSegment, toggleFavorite } from '@/lib/savedSegmentsService';
import SavedSegmentsModal from '@/components/common/SavedSegmentsModal';
import RenameSegmentModal from '@/components/common/RenameSegmentModal';
import DeleteSegmentModal from '@/components/common/DeleteSegmentModal';

// Dashboard Components
import PipelineMetrics from '@/components/prospects/PipelineMetrics';
import MonthlyGapCard from '@/components/prospects/MonthlyGapCard';
import CoverageRatios from '@/components/prospects/CoverageRatios';
import TopProspectsTable from '@/components/prospects/TopProspectsTable';
import UrgentFollowUps from '@/components/prospects/UrgentFollowUps';
import ProspectsFilterPanel from '@/components/prospects/ProspectsFilterPanel';
import TopTagsMetrics from '@/components/prospects/TopTagsMetrics';
import FollowUpTimeline from '@/components/prospects/FollowUpTimeline';
import ProspectsFunnel from '@/components/prospects/ProspectsFunnel';
import LostProspectsTable from '@/components/prospects/LostProspectsTable';

// Modal & Drawer Components
import EditProspectModal from '@/components/prospects/EditProspectModal';
import UpdateFollowUpModal from '@/components/prospects/UpdateFollowUpModal';
import NotesHistoryDrawer from '@/components/prospects/NotesHistoryDrawer';
import MarkAsLostModal from '@/components/prospects/MarkAsLostModal';
import RestoreProspectModal from '@/components/prospects/RestoreProspectModal';

// Calendar Components
import ProspectsCalendar from '@/components/prospects/ProspectsCalendar';
import DayFollowUpsDrawer from '@/components/prospects/DayFollowUpsDrawer';
import RescheduleFollowUpModal from '@/components/prospects/RescheduleFollowUpModal';
import OverdueFollowUpsKPI from '@/components/prospects/OverdueFollowUpsKPI';

const defaultFilters = {
  documentsSent: 'all',
  qualification: { min: 1, max: 10 },
  propertyType: [],
  source: 'all',
  portfolio: false,
  followUpRange: 'all',
  followUpCustom: { from: '', to: '' },
  search: '',
};

const ProspectsPage = () => {
  const { user, isAdmin } = useAuth();
  const { 
    prospects, 
    loading: prospectsLoading, 
    refetch,
    urgentFollowUps,
    upcomingFollowUps,
    memberQuota,
    achievedMTD,
    gapToGoal,
    hotCoveragePct,
    expectedCoveragePct
  } = useProspectsData();
  const { toast } = useToast();
  
  const [filters, setFilters] = useState(defaultFilters);
  const [viewMode, setViewMode] = useState('table');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [activeTab, setActiveTab] = useState('active');

  // Quick Filter (Neon Funnel)
  const [quickFilter, setQuickFilter] = useState(null);

  // Tags State
  const [availableTags, setAvailableTags] = useState([]);
  const [includeTagIds, setIncludeTagIds] = useState([]);
  const [excludeTagIds, setExcludeTagIds] = useState([]);
  const [includeMode, setIncludeMode] = useState('any'); // 'any' or 'all'
  const [prospectTagsMap, setProspectTagsMap] = useState({});
  const [tagsLoading, setTagsLoading] = useState(true);

  // Segments State
  const [savedSegments, setSavedSegments] = useState([]);
  const [activeSegmentId, setActiveSegmentId] = useState(null);
  const [isLoadingSegments, setIsLoadingSegments] = useState(true);
  
  const [isSaveSegmentModalOpen, setIsSaveSegmentModalOpen] = useState(false);
  const [isRenameSegmentModalOpen, setIsRenameSegmentModalOpen] = useState(false);
  const [isDeleteSegmentModalOpen, setIsDeleteSegmentModalOpen] = useState(false);
  const [segmentActionId, setSegmentActionId] = useState(null);

  // Lost/Restore Modals
  const [markAsLostModalOpen, setMarkAsLostModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedProspectForStatus, setSelectedProspectForStatus] = useState(null);

  // Delete Prospect State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [prospectToDelete, setProspectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchTags = async () => {
      try {
        const tags = await getAvailableTags(user.id);
        const uniqueTags = Array.from(new Map(tags.map(t => [t.id, t])).values());
        setAvailableTags(uniqueTags);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTags();
  }, [user]);

  useEffect(() => {
    if (!prospects || prospects.length === 0) {
      setProspectTagsMap({});
      setTagsLoading(false);
      return;
    }
    const buildMap = async () => {
      setTagsLoading(true);
      try {
        const map = await buildProspectTagsMap(prospects);
        setProspectTagsMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setTagsLoading(false);
      }
    };
    buildMap();
  }, [prospects]);

  // Load Segments
  const fetchSegments = useCallback(async () => {
    if (!user) return;
    setIsLoadingSegments(true);
    try {
      const data = await getSavedSegments(user.id, 'prospects');
      setSavedSegments(data);
    } catch (err) {
      console.error('Failed to load segments', err);
    } finally {
      setIsLoadingSegments(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  useEffect(() => {
    if (!user) return;
    const key = isAdmin ? 'adminProspectsFiltersV3' : 'memberProspectsFiltersV3';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFilters(parsed.filters || defaultFilters);
        setIncludeTagIds(parsed.includeTagIds || []);
        setExcludeTagIds(parsed.excludeTagIds || []);
        setIncludeMode(parsed.includeMode || 'any');
      } catch (e) {
        console.error('Failed to parse filters', e);
      }
    }

    const savedSegment = localStorage.getItem('activeSegmentId:prospects');
    if (savedSegment) {
      setActiveSegmentId(savedSegment);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user) return;
    const key = isAdmin ? 'adminProspectsFiltersV3' : 'memberProspectsFiltersV3';
    localStorage.setItem(key, JSON.stringify({ filters, includeTagIds, excludeTagIds, includeMode }));
    if (activeSegmentId) {
      localStorage.setItem('activeSegmentId:prospects', activeSegmentId);
    } else {
      localStorage.removeItem('activeSegmentId:prospects');
    }
  }, [filters, includeTagIds, excludeTagIds, includeMode, user, isAdmin, activeSegmentId]);

  // Quick Filter Handlers
  const handleQuickFilter = (filter) => {
    setQuickFilter(filter);
    if (filter) {
      toast({ description: `Filtro rápido aplicado: ${filter.name}` });
    }
  };

  const clearQuickFilter = () => {
    setQuickFilter(null);
  };

  // Segment Handlers
  const handleApplySegment = (id) => {
    const segment = savedSegments.find(s => s.id === id);
    if (segment && segment.filters) {
      setFilters(segment.filters.filters || defaultFilters);
      setIncludeTagIds(segment.filters.includeTagIds || []);
      setExcludeTagIds(segment.filters.excludeTagIds || []);
      setIncludeMode(segment.filters.includeMode || 'any');
      setActiveSegmentId(id);
      toast({ description: `Segmento '${segment.name}' aplicado.` });
    }
  };

  const handleSaveSegment = async (name, isFavorite) => {
    try {
      const payload = { filters, includeTagIds, excludeTagIds, includeMode };
      const newSegment = await createSavedSegment(user.id, 'prospects', name, payload, isFavorite);
      setSavedSegments(prev => [newSegment, ...prev]);
      setActiveSegmentId(newSegment.id);
      toast({ description: "Segmento guardado exitosamente." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleRenameSegment = async (newName) => {
    try {
      await updateSavedSegment(segmentActionId, newName, undefined, undefined);
      await fetchSegments();
      toast({ description: "Segmento renombrado." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleUpdateSegmentFilters = async (id) => {
    try {
      const payload = { filters, includeTagIds, excludeTagIds, includeMode };
      await updateSavedSegment(id, undefined, payload, undefined);
      await fetchSegments();
      toast({ description: "Filtros del segmento actualizados." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteSegment = async () => {
    try {
      await deleteSavedSegment(segmentActionId);
      if (activeSegmentId === segmentActionId) {
        setActiveSegmentId(null);
      }
      await fetchSegments();
      toast({ description: "Segmento eliminado." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleToggleFavorite = async (id, isFavorite) => {
    try {
      await toggleFavorite(id, isFavorite);
      await fetchSegments();
    } catch (err) {
      toast({ title: "Error", description: "No se pudo actualizar favorito.", variant: "destructive" });
    }
  };

  const handleClearSegment = () => {
    setActiveSegmentId(null);
    setFilters(defaultFilters);
    setIncludeTagIds([]);
    setExcludeTagIds([]);
    setIncludeMode('any');
  };

  // ✅ ESTANDARIZADO EN STATUS - NO MEZCLAR CON STAGE
  const activeProspects = useMemo(() => prospects.filter(p => p.status === 'active'), [prospects]);
  const lostProspects = useMemo(() => prospects.filter(p => p.status === 'lost'), [prospects]);

  const filterProspectList = (list) => {
    let result = list;
    
    // Apply Admin Owner Filter
    if (isAdmin && selectedOwner !== 'all') {
      result = result.filter(p => p.owner_user_id === selectedOwner);
    }

    result = result.filter(p => {
      // Quick Filter
      if (quickFilter && quickFilter.id !== 'all') {
        const q = p.qualification || 0;
        if (q < quickFilter.min || q > quickFilter.max) return false;
      }

      // Search
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const extId = String(p.external_id || '').toLowerCase();
        const name = String(p.prospect_name || '').toLowerCase();
        const notes = (p.notes || '').toLowerCase();
        if (!extId.includes(term) && !name.includes(term) && !notes.includes(term)) return false;
      }
      
      // Documents Sent
      if (filters.documentsSent !== 'all') {
        const docs = filters.documentsSent === 'yes';
        if (Boolean(p.documents_sent) !== docs) return false;
      }

      // Qualification (Standard Filter)
      if (filters.qualification?.min !== '' && p.qualification < Number(filters.qualification.min)) return false;
      if (filters.qualification?.max !== '' && p.qualification > Number(filters.qualification.max)) return false;

      // Property Type
      if (filters.propertyType?.length > 0) {
        if (!filters.propertyType.includes(p.property_type)) return false;
      }

      // Source
      if (filters.source !== 'all') {
        if (filters.source === 'Assigned' && p.source_lead !== 'Assigned') return false;
        if (filters.source === 'Other' && p.source_lead === 'Assigned') return false;
      }

      // Portfolio
      if (filters.portfolio && !p.has_portfolio) return false;

      // Follow Up
      if (filters.followUpRange !== 'all') {
        if (!p.follow_up_at) return false;
        const followUpDate = new Date(p.follow_up_at);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        switch (filters.followUpRange) {
          case 'overdue':
            if (!isBefore(followUpDate, today)) return false;
            break;
          case 'today':
            if (!isToday(followUpDate)) return false;
            break;
          case 'next7':
            if (!isAfter(followUpDate, today) || isAfter(followUpDate, addDays(today, 7))) return false;
            break;
          case 'next30':
            if (!isAfter(followUpDate, today) || isAfter(followUpDate, addDays(today, 30))) return false;
            break;
          case 'custom':
            if (filters.followUpCustom?.from && isBefore(followUpDate, new Date(filters.followUpCustom.from))) return false;
            if (filters.followUpCustom?.to && isAfter(followUpDate, new Date(filters.followUpCustom.to))) return false;
            break;
          default:
            break;
        }
      }

      return true;
    });

    // Apply Tags Filter using prospectTagsMap
    if (Object.keys(prospectTagsMap).length > 0) {
      if (includeTagIds.length > 0) {
        if (includeMode === 'any') {
          result = result.filter(p => {
            const pTags = prospectTagsMap[p.id] || [];
            return pTags.some(pt => includeTagIds.includes(pt.id));
          });
        } else {
          result = result.filter(p => {
            const pTags = prospectTagsMap[p.id] || [];
            return includeTagIds.every(tagId => pTags.some(pt => pt.id === tagId));
          });
        }
      }

      if (excludeTagIds.length > 0) {
        result = result.filter(p => {
          const pTags = prospectTagsMap[p.id] || [];
          return !pTags.some(pt => excludeTagIds.includes(pt.id));
        });
      }
    }

    return result;
  };

  // ✅ APLICAR FILTROS A CADA DATASET
  const filteredProspects = useMemo(() => {
    return filterProspectList(activeProspects);
  }, [activeProspects, filters, isAdmin, selectedOwner, includeTagIds, excludeTagIds, includeMode, prospectTagsMap, quickFilter]);

  const filteredProspectsLost = useMemo(() => {
    return filterProspectList(lostProspects);
  }, [lostProspects, filters, isAdmin, selectedOwner, includeTagIds, excludeTagIds, includeMode, prospectTagsMap, quickFilter]);

  const sortedFilteredProspects = useMemo(() => {
    return sortProspectsByPriority(filteredProspects);
  }, [filteredProspects]);

  const sortedFilteredProspectsLost = useMemo(() => {
    return sortProspectsByPriority(filteredProspectsLost);
  }, [filteredProspectsLost]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.documentsSent !== 'all') count++;
    if (filters.source !== 'all') count++;
    if (filters.portfolio) count++;
    if (filters.propertyType?.length > 0) count += filters.propertyType.length;
    if (filters.followUpRange !== 'all') count++;
    if (filters.qualification?.min !== 1 || filters.qualification?.max !== 10) count++;
    if (includeTagIds.length > 0) count++;
    if (excludeTagIds.length > 0) count++;
    if (isAdmin && selectedOwner !== 'all') count++;
    return count;
  }, [filters, isAdmin, selectedOwner, includeTagIds, excludeTagIds]);

  const handleResetFilters = () => {
    setActiveSegmentId(null);
    setFilters(defaultFilters);
    setSelectedOwner('all');
    setIncludeTagIds([]);
    setExcludeTagIds([]);
    setIncludeMode('any');
    clearQuickFilter();
  };

  const removeFilter = (key, nestedKey) => {
    setActiveSegmentId(null); // Modifying a filter clears the active segment state
    if (key === 'owner') {
      setSelectedOwner('all');
    } else if (key === 'includeTags') {
      setIncludeTagIds([]);
    } else if (key === 'excludeTags') {
      setExcludeTagIds([]);
    } else if (nestedKey) {
      setFilters(prev => ({ ...prev, [key]: { ...prev[key], [nestedKey]: defaultFilters[key][nestedKey] } }));
    } else {
      setFilters(prev => ({ ...prev, [key]: defaultFilters[key] }));
    }
  };

  const [selectedProspectForHistory, setSelectedProspectForHistory] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [prospectToConvert, setProspectToConvert] = useState(null);
  const [effectiveAt, setEffectiveAt] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState(null);
  
  // Calendar specific modal states
  const [isDayDrawerOpen, setIsDayDrawerOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState(null);
  const [selectedDayProspects, setSelectedDayProspects] = useState([]);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [salesMembers, setSalesMembers] = useState([]);

  useEffect(() => {
    if (isAdmin) {
      const fetchSalesMembers = async () => {
        const { data } = await supabase.from('sales_team').select('user_id, name');
        if (data) {
          const uniqueMembers = Array.from(new Map(data.map(m => [m.user_id, m])).values());
          setSalesMembers(uniqueMembers);
        }
      };
      fetchSalesMembers();
    }
  }, [isAdmin]);

  const handleConvertClick = (prospect) => {
    setProspectToConvert(prospect);
    setEffectiveAt(new Date().toISOString().slice(0, 16));
    setNote('');
    setConvertModalOpen(true);
  };

  const submitConversion = async () => {
    if (!effectiveAt) {
        toast({ title: "Error", description: "Fecha efectiva es obligatoria", variant: "destructive" });
        return;
    }
    setProcessing(true);
    try {
        await convertProspectToClient(prospectToConvert.id, new Date(effectiveAt).toISOString(), note);
        toast({ title: "Éxito", description: "Prospecto convertido a cliente." });
        setConvertModalOpen(false);
        refetch();
    } catch (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setProcessing(false);
    }
  };

  const handleEditProspect = (prospect) => {
    setSelectedProspect(prospect);
    setIsEditModalOpen(true);
  };

  const handleUpdateFollowUp = (prospect) => {
    setSelectedProspect(prospect);
    setIsFollowUpModalOpen(true);
  };

  const handleOpenNotesDrawer = (prospect) => {
    setSelectedProspect(prospect);
    setIsNotesDrawerOpen(true);
  };

  const handleRescheduleFromCalendar = (prospect) => {
    setSelectedProspect(prospect);
    setIsRescheduleModalOpen(true);
  };

  const handleDayClick = (date, dayProspects) => {
    setSelectedDayDate(date);
    setSelectedDayProspects(dayProspects);
    setIsDayDrawerOpen(true);
  };

  const handleSaveEdit = async (prospectId, updates, effective_at, note) => {
    setProcessing(true);
    console.log(`💾 Save flow started for prospect ID:`, prospectId);
    console.log(`📦 Payload received in ProspectsPage:`, updates);
    console.log(`📊 estimated_property_value in payload:`, updates.estimated_property_value);
    console.log(`📊 Type:`, typeof updates.estimated_property_value);
    
    try {
      const savedProspect = await updateProspectWithHistory(prospectId, updates, effective_at, note);
      console.log(`[handleSaveEdit] Returned prospect from service:`, savedProspect);
      
      console.log(`🔄 Calling refetch...`);
      const freshProspects = await refetch();
      console.log(`✅ Prospects fetched: ${freshProspects?.length || 0} records`);
      
      console.log(`🔍 Finding updated prospect in fresh data...`);
      const updatedProspect = freshProspects.find(p => p.id === prospectId);
      
      if (updatedProspect) {
        console.log(`✅ Found updated prospect:`, updatedProspect);
        console.log(`🔄 Syncing selectedProspect...`);
        setSelectedProspect(updatedProspect);
        console.log(`✅ selectedProspect synced:`, updatedProspect);
        setIsEditModalOpen(false);
        toast({ title: "Éxito", description: "Prospect actualizado correctamente" });
      } else {
        toast({ title: "Error", description: "Error: prospect no encontrado después de actualizar", variant: "destructive" });
        setIsEditModalOpen(false);
      }
    } catch (error) {
      console.error(`[handleSaveEdit] Error caught during save flow:`, error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveFollowUp = async (prospectId, updates, effective_at, note) => {
    setProcessing(true);
    try {
      await updateProspectWithHistory(prospectId, updates, effective_at, note);
      toast({ title: "Éxito", description: "Seguimiento actualizado." });
      setIsFollowUpModalOpen(false);
      refetch();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveNotes = async (prospectId, notes, effective_at, note) => {
    setProcessing(true);
    try {
      await updateProspectWithHistory(prospectId, { notes }, effective_at, note);
      toast({ title: "Éxito", description: "Notas guardadas correctamente." });
      setIsNotesDrawerOpen(false);
      refetch();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenCreateModal = () => setIsCreateModalOpen(true);
  const handleCloseCreateModal = () => setIsCreateModalOpen(false);

  const handleCreateProspect = async (formData) => {
    setIsCreating(true);
    try {
      const payload = {
        ...formData,
        follow_up_at: formData.follow_up_at ? new Date(formData.follow_up_at).toISOString() : null,
        last_contact_date: formData.last_contact_date || null,
        owner_user_id: formData.owner_user_id || user.id,
      };

      await createProspect(payload);
      toast({ title: "Éxito", description: "Prospecto creado correctamente." });
      handleCloseCreateModal();
      refetch();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenStatusModal = (prospect) => {
    setSelectedProspectForStatus(prospect);
    setMarkAsLostModalOpen(true);
  };

  const handleConfirmMarkAsLost = async (reason, notes, effectiveDate) => {
    console.log('📌 handleConfirmMarkAsLost started')
    console.log('📊 Prospect ID:', selectedProspectForStatus?.id)
    console.log('📝 Reason:', reason)
    console.log('📝 Notes:', notes)
    
    try {
      console.log('💾 Updating prospect with status: lost...')
      // Call service function that updates and creates history
      await updateProspectWithHistory(selectedProspectForStatus.id, {
        status: 'lost',  // ✅ AGREGAR STATUS
        stage: 'Lost',
        lost_reason: reason,
        lost_notes: notes,
        lost_at: effectiveDate
      }, effectiveDate, notes || `Marked as lost: ${reason}`)
      
      console.log('🔄 Refetching prospects...')
      await refetch()  // ✅ CON AWAIT
      
      console.log('✅ Prospect marked as lost')
      toast({ description: 'Prospect marcado como lost' })
      
      // Limpiar UI
      setMarkAsLostModalOpen(false)
      setSelectedProspectForStatus(null)
      
      if (selectedProspect?.id === selectedProspectForStatus?.id) {
        setSelectedProspect(null)
        setIsEditModalOpen(false)
      }
    } catch (error) {
      console.error('❌ handleConfirmMarkAsLost failed:', error)
      toast({ description: 'Error: ' + error.message, variant: 'destructive' })
    }
  }

  const handleRestore = (prospect) => {
    setSelectedProspectForStatus(prospect);
    setRestoreModalOpen(true);
  };

  const handleConfirmRestore = async (notes, effectiveDate) => {
    console.log('♻️ handleConfirmRestore started')
    console.log('📊 Prospect ID:', selectedProspectForStatus?.id)
    
    try {
      console.log('💾 Updating prospect with status: active...')
      await updateProspectWithHistory(selectedProspectForStatus.id, {
        status: 'active',  // ✅ AGREGAR STATUS
        stage: 'Active',
        lost_reason: null,
        lost_notes: null,
        lost_at: null
      }, effectiveDate, notes || 'Restored prospect')
      
      console.log('🔄 Refetching prospects...')
      await refetch()  // ✅ CON AWAIT
      
      console.log('✅ Prospect restored')
      toast({ description: 'Prospect restaurado' })
      
      // Limpiar UI
      setRestoreModalOpen(false)
      setSelectedProspectForStatus(null)
      
      if (selectedProspect?.id === selectedProspectForStatus?.id) {
        setSelectedProspect(null)
        setIsEditModalOpen(false)
      }
      
    } catch (error) {
      console.error('❌ handleConfirmRestore failed:', error)
      toast({ description: 'Error: ' + error.message, variant: 'destructive' })
    }
  }

  // Delete Handlers
  const handleOpenDeleteDialog = (prospect) => {
    setProspectToDelete(prospect);
    setDeleteReason('');
    setIsDeleteDialogOpen(true);
    console.log(`[handleOpenDeleteDialog] Opened delete dialog for prospect:`, prospect);
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setProspectToDelete(null);
    setDeleteReason('');
  };

  const handleConfirmDelete = async () => {
    const trimmedReason = deleteReason?.trim();
    if (!trimmedReason) {
      toast({ title: "Error", description: "El motivo de eliminación es obligatorio", variant: "destructive" });
      return;
    }
    
    const currentUserId = user?.id;
    if (!currentUserId) {
      toast({ title: "Error", description: "No se pudo verificar tu sesión. Por favor, recarga la página.", variant: "destructive" });
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteProspectWithReason(prospectToDelete.id, trimmedReason, currentUserId);
      toast({ title: "Éxito", description: "Prospecto eliminado permanentemente." });
      
      if (selectedProspect?.id === prospectToDelete.id) {
        setSelectedProspect(null);
        setIsEditModalOpen(false);
      }
      
      handleCancelDelete();
      refetch();
    } catch (error) {
      console.error("Delete error caught in handleConfirmDelete:", error);
      toast({ title: "Error", description: error.message || "Error al eliminar el prospecto", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const loading = prospectsLoading || tagsLoading || isLoadingSegments;

  if (loading && !prospects.length) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Mis Prospectos</h1>
        <Button onClick={handleOpenCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Añadir Prospecto
        </Button>
      </div>

      <ProspectsFilterPanel 
        filters={filters} 
        onFiltersChange={(newFilters) => { setFilters(newFilters); setActiveSegmentId(null); }} 
        onReset={handleResetFilters}
        availableTags={availableTags}
        includeTagIds={includeTagIds}
        excludeTagIds={excludeTagIds}
        includeMode={includeMode}
        setIncludeTagIds={(ids) => { setIncludeTagIds(ids); setActiveSegmentId(null); }}
        setExcludeTagIds={(ids) => { setExcludeTagIds(ids); setActiveSegmentId(null); }}
        setIncludeMode={(mode) => { setIncludeMode(mode); setActiveSegmentId(null); }}
        
        savedSegments={savedSegments}
        activeSegmentId={activeSegmentId}
        onSaveSegmentClick={() => setIsSaveSegmentModalOpen(true)}
        onApplySegment={handleApplySegment}
        onRenameSegment={(id) => { setSegmentActionId(id); setIsRenameSegmentModalOpen(true); }}
        onUpdateSegment={handleUpdateSegmentFilters}
        onDeleteSegment={(id) => { setSegmentActionId(id); setIsDeleteSegmentModalOpen(true); }}
        onToggleFavorite={handleToggleFavorite}
        onClearSegment={handleClearSegment}
        activeTab={activeTab}
      />

      <div className="flex flex-wrap gap-2 items-center text-sm mb-4">
        {(activeFilterCount > 0 && !activeSegmentId) && (
          <span className="text-muted-foreground font-medium mr-2">Filtros Activos ({activeFilterCount}):</span>
        )}
        
        {quickFilter && (
          <Badge variant="default" className="bg-pink-600 hover:bg-pink-700 font-semibold px-3 py-1">
            Filtro Rápido: {quickFilter.name}
            <Button variant="ghost" size="icon" className="h-4 w-4 ml-2 hover:bg-transparent text-white hover:text-white" onClick={clearQuickFilter}>
              <FilterX className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {activeFilterCount > 0 && !activeSegmentId && (
          <>
            {isAdmin && selectedOwner !== 'all' && <Badge variant="secondary">Owner: {salesMembers.find(m => m.user_id === selectedOwner)?.name || selectedOwner} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeFilter('owner')} /></Badge>}
            {filters.search && <Badge variant="secondary">Búsqueda <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeFilter('search')} /></Badge>}
            {filters.documentsSent !== 'all' && <Badge variant="secondary">Docs: {filters.documentsSent} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeFilter('documentsSent')} /></Badge>}
            {filters.source !== 'all' && <Badge variant="secondary">Origen: {filters.source} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeFilter('source')} /></Badge>}
            {filters.portfolio && <Badge variant="secondary">Portafolio: Sí <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeFilter('portfolio')} /></Badge>}
            {filters.propertyType?.map(pt => <Badge key={`filter-pt-${pt}`} variant="secondary">{pt} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => {
              setFilters(prev => ({ ...prev, propertyType: prev.propertyType.filter(t => t !== pt) }));
              setActiveSegmentId(null);
            }} /></Badge>)}
            {filters.followUpRange !== 'all' && <Badge variant="secondary">FollowUp: {filters.followUpRange} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeFilter('followUpRange')} /></Badge>}
            
            {includeTagIds.length > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                Includes: {includeTagIds.length} ({includeMode}) <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeFilter('includeTags')} />
              </Badge>
            )}
            {excludeTagIds.length > 0 && (
              <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">
                Excludes: {excludeTagIds.length} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeFilter('excludeTags')} />
              </Badge>
            )}
          </>
        )}
      </div>

      {isAdmin && (
        <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
          <Label className="font-semibold text-gray-700 whitespace-nowrap">Filter by Owner:</Label>
          <Select value={selectedOwner} onValueChange={setSelectedOwner}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="All Members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {salesMembers.map(m => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {activeTab === 'active' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProspectsFunnel 
            filteredProspects={sortedFilteredProspects} 
            onQuickFilter={handleQuickFilter}
            activeQuickFilter={quickFilter}
          />
          <OverdueFollowUpsKPI filteredProspects={sortedFilteredProspects} />
        </div>
      )}

      {activeTab === 'lost' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-medium text-muted-foreground mb-2">Total Prospectos Perdidos</div>
              <div className="text-3xl font-bold">{sortedFilteredProspectsLost.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-medium text-muted-foreground mb-2">Valor Total Perdido</div>
              <div className="text-3xl font-bold text-destructive">${formatM(sortedFilteredProspectsLost.reduce((sum, p) => sum + Number(p.estimated_property_value || 0), 0))}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-between items-center border-b pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
          <TabsList>
            <TabsTrigger value="active">Activos ({sortedFilteredProspects.length})</TabsTrigger>
            <TabsTrigger value="lost">Perdidos ({sortedFilteredProspectsLost.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {activeTab === 'active' && (
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'table' ? 'default' : 'outline'} 
              onClick={() => setViewMode('table')}
              className="w-32"
            >
              <TableIcon className="w-4 h-4 mr-2" /> Table View
            </Button>
            <Button 
              variant={viewMode === 'calendar' ? 'default' : 'outline'} 
              onClick={() => setViewMode('calendar')}
              className="w-32"
            >
              <Calendar className="w-4 h-4 mr-2" /> Calendar
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} className="w-full" onValueChange={() => {}}>
        <TabsContent value="active" className="space-y-6 mt-0">
          {viewMode === 'calendar' ? (
            <div className="space-y-6">
              <ProspectsCalendar 
                filteredProspects={sortedFilteredProspects} 
                currentMonth={currentMonth} 
                onMonthChange={setCurrentMonth} 
                onDayClick={handleDayClick} 
              />
            </div>
          ) : (
            <div className="space-y-6">
              {!isAdmin && (
                <>
                  <PipelineMetrics filteredProspects={sortedFilteredProspects} isLoading={loading} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <MonthlyGapCard gap={gapToGoal} quota={memberQuota} achieved={achievedMTD} isLoading={loading} />
                    <CoverageRatios hotCoveragePct={hotCoveragePct} expectedCoveragePct={expectedCoveragePct} gapToGoal={gapToGoal} isLoading={loading} />
                  </div>

                  <FollowUpTimeline filteredProspects={sortedFilteredProspects} isLoading={loading} />
                  
                  <TopTagsMetrics filteredProspects={sortedFilteredProspects} isLoading={loading} />
                </>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold">Prospectos Filtrados ({sortedFilteredProspects.length})</h2>
                    <div className="max-h-[600px] overflow-y-auto overflow-x-auto border rounded-lg bg-white relative">
                      <TopProspectsTable 
                        filteredProspects={sortedFilteredProspects.map(p => ({ ...p, prospect_tags: prospectTagsMap[p.id]?.map(t => ({ tags: t })) || [] }))} 
                        isLoading={loading}
                        onEdit={handleEditProspect}
                        onConvert={handleConvertClick}
                        onScheduleFollowUp={handleUpdateFollowUp}
                        onOpenNotesDrawer={handleOpenNotesDrawer}
                        onMarkAsLost={handleOpenStatusModal}
                        refetch={refetch}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="lg:col-span-1">
                  <UrgentFollowUps overdue={urgentFollowUps} upcoming={upcomingFollowUps} isLoading={loading} />
                </div>
              </div>
            </div>
          )}

          {viewMode === 'table' && (
            <div className="space-y-4 pt-8 border-t">
              <h2 className="text-xl font-bold">Lista Detallada (Filtrada)</h2>
              <div className="max-h-[600px] overflow-y-auto overflow-x-auto border rounded-lg bg-white shadow relative">
                <Table className="relative border-collapse">
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="bg-white">ID Externo</TableHead>
                      <TableHead className="bg-white">Nombre</TableHead>
                      <TableHead className="bg-white">Tags</TableHead>
                      <TableHead className="bg-white">Origen</TableHead>
                      <TableHead className="bg-white">Tipo Propiedad</TableHead>
                      <TableHead className="bg-white">Valor Est.</TableHead>
                      <TableHead className="bg-white">Calificación (0-10)</TableHead>
                      <TableHead className="bg-white">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedFilteredProspects.map(p => {
                      const tags = prospectTagsMap[p.id] || [];
                      const uniqueDisplayTags = Array.from(new Map(tags.map(t => [t.id, t])).values());
                      return (
                      <TableRow key={p.id}>
                        <TableCell>{p.external_id || 'N/A'}</TableCell>
                        <TableCell>{p.prospect_name || '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[100px]">
                            {uniqueDisplayTags.map(t => (
                              <Badge key={`tag-${p.id}-${t.id}`} style={{backgroundColor: t.color, color: '#fff'}} className="text-[10px] px-1 py-0 h-4">
                                {t.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{p.source_lead === 'Assigned' ? 'Asignado' : p.source_lead}</TableCell>
                        <TableCell>{p.property_type === 'Residential' ? 'Residencial' : 'Comercial'}</TableCell>
                        <TableCell>${Number(p.estimated_property_value || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          {p.qualification}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditProspect(p)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleOpenStatusModal(p)} className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200">
                              Perdido
                            </Button>
                            <Button size="sm" onClick={() => handleConvertClick(p)}>
                              <ArrowRight className="h-4 w-4 mr-1" /> Convertir
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleOpenDeleteDialog(p)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                              <Trash2 className="h-4 w-4" /> Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )})}
                    {sortedFilteredProspects.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-gray-500 py-4">No se encontraron prospectos que coincidan con los filtros.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lost" className="space-y-6 mt-0">
          <LostProspectsTable 
            prospects={sortedFilteredProspectsLost} 
            onRestore={handleRestore} 
            isLoading={loading} 
          />
        </TabsContent>
      </Tabs>

      {/* Segment Modals */}
      <SavedSegmentsModal
        isOpen={isSaveSegmentModalOpen}
        onClose={() => setIsSaveSegmentModalOpen(false)}
        onSave={handleSaveSegment}
        scope="prospects"
      />

      <RenameSegmentModal
        isOpen={isRenameSegmentModalOpen}
        onClose={() => { setIsRenameSegmentModalOpen(false); setSegmentActionId(null); }}
        onRename={handleRenameSegment}
        currentName={savedSegments.find(s => s.id === segmentActionId)?.name}
      />

      <DeleteSegmentModal
        isOpen={isDeleteSegmentModalOpen}
        onClose={() => { setIsDeleteSegmentModalOpen(false); setSegmentActionId(null); }}
        onDelete={handleDeleteSegment}
        segmentName={savedSegments.find(s => s.id === segmentActionId)?.name}
      />

      {/* Modals and Drawers */}
      <CreateProspectModal 
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSubmit={handleCreateProspect}
        isLoading={isCreating}
        currentUser={user}
        isAdmin={isAdmin}
        salesMembers={salesMembers}
      />

      <EditProspectModal
        key={selectedProspect ? `${selectedProspect.id}-${selectedProspect.updated_at}` : 'edit-modal'}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        prospect={selectedProspect}
        onSave={handleSaveEdit}
        isLoading={processing}
      />

      <UpdateFollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        prospect={selectedProspect}
        onSave={handleSaveFollowUp}
        isLoading={processing}
      />

      <RescheduleFollowUpModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        prospect={selectedProspect}
        onSave={refetch}
      />

      <DayFollowUpsDrawer 
        isOpen={isDayDrawerOpen}
        onClose={() => setIsDayDrawerOpen(false)}
        selectedDate={selectedDayDate}
        dayProspects={selectedDayProspects}
        onReschedule={handleRescheduleFromCalendar}
        onEdit={handleEditProspect}
        onNotes={handleOpenNotesDrawer}
      />

      <NotesHistoryDrawer
        isOpen={isNotesDrawerOpen}
        onClose={() => setIsNotesDrawerOpen(false)}
        prospect={selectedProspect}
        onSaveNotes={handleSaveNotes}
        onEdit={(p) => { setIsNotesDrawerOpen(false); handleEditProspect(p); }}
        onFollowUp={(p) => { setIsNotesDrawerOpen(false); handleUpdateFollowUp(p); }}
        isLoading={processing}
      />

      <ProspectHistoryDrawer 
        open={isHistoryOpen} 
        onOpenChange={setIsHistoryOpen} 
        prospectId={selectedProspectForHistory} 
      />

      <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convertir a Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fecha Efectiva (Obligatorio)</Label>
              <Input type="datetime-local" value={effectiveAt} onChange={(e) => setEffectiveAt(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Nota Adicional</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Aceptó propuesta financiera" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertModalOpen(false)}>Cancelar</Button>
            <Button onClick={submitConversion} disabled={processing || !effectiveAt}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MarkAsLostModal 
        isOpen={markAsLostModalOpen}
        onClose={() => setMarkAsLostModalOpen(false)}
        onConfirm={handleConfirmMarkAsLost}
        prospect={selectedProspectForStatus}
      />

      <RestoreProspectModal 
        isOpen={restoreModalOpen}
        onClose={() => setRestoreModalOpen(false)}
        onConfirm={handleConfirmRestore}
        prospect={selectedProspectForStatus}
      />

      {/* Delete Prospect Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Eliminar Prospect</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-red-50 text-red-800 p-4 rounded-md text-sm border border-red-200">
              <p className="font-bold mb-2">¡Atención!</p>
              <p>Esta acción eliminará el prospecto permanentemente y no se puede deshacer.</p>
              <p className="mt-2 text-xs">Si el prospecto no está interesado, considera usar la opción "Marcar como Perdido" en lugar de eliminarlo.</p>
            </div>
            
            <div className="space-y-2">
              <Label>Prospecto a eliminar:</Label>
              <p className="font-semibold">{prospectToDelete?.prospect_name || prospectToDelete?.external_id}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-reason">Motivo de eliminación <span className="text-red-500">*</span></Label>
              <textarea 
                id="delete-reason"
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Ej: Prospect duplicado, datos incorrectos, etc."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                disabled={isDeleting}
              />
              {deleteReason.trim() === '' && (
                <p className="text-xs text-red-500">El motivo de eliminación es requerido.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelDelete} 
              disabled={isDeleting}
              className="text-gray-600"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmDelete} 
              disabled={isDeleting || deleteReason.trim() === ''}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProspectsPage;
