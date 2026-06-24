
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useClientsData } from '@/hooks/useClientsData';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getRapportMetrics } from '@/lib/clientTouchpointsService';
import { supabase } from '@/lib/customSupabaseClient';
import RapportPlanDrawer from './RapportPlanDrawer';
import RapportMetrics from './RapportMetrics';
import RevertClientModal from './RevertClientModal';
import ClientSalesProtocolModal from './ClientSalesProtocolModal';
import EditClientModal from './EditClientModal';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertCircle, X, Edit, Calendar } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ClientHistoryDrawer from './ClientHistoryDrawer';
import { useReminders } from '@/hooks/useReminders';
import { format, formatDistanceToNow } from 'date-fns';
import ClientsFilterPanel from './ClientsFilterPanel';
import { getAvailableTags } from '@/lib/tagsService';
import { buildClientTagsMap } from '@/lib/clientsService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// UI components for filter
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Segments Service and Modals
import { getSavedSegments, createSavedSegment, updateSavedSegment, deleteSavedSegment, toggleFavorite } from '@/lib/savedSegmentsService';
import SavedSegmentsModal from '@/components/common/SavedSegmentsModal';
import RenameSegmentModal from '@/components/common/RenameSegmentModal';
import DeleteSegmentModal from '@/components/common/DeleteSegmentModal';

const defaultFilters = {
  search: '',
  conversionChannel: 'all',
  seniorManagerInvolved: 'all'
};

const ClientsPage = () => {
  const { user, isAdmin } = useAuth();
  const [filters, setFilters] = useState(defaultFilters);
  const { clients, loading: clientsLoading, error, refetch } = useClientsData(filters);
  const { toast } = useToast();
  
  const [availableTags, setAvailableTags] = useState([]);
  const [includeTagIds, setIncludeTagIds] = useState([]);
  const [excludeTagIds, setExcludeTagIds] = useState([]);
  const [includeMode, setIncludeMode] = useState('any'); // 'any' or 'all'
  const [clientTagsMap, setClientTagsMap] = useState({});
  const [tagsLoading, setTagsLoading] = useState(true);

  // Admin Seller Filter
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [salesMembers, setSalesMembers] = useState([]);

  // Segments State
  const [savedSegments, setSavedSegments] = useState([]);
  const [activeSegmentId, setActiveSegmentId] = useState(null);
  const [isLoadingSegments, setIsLoadingSegments] = useState(true);
  
  const [isSaveSegmentModalOpen, setIsSaveSegmentModalOpen] = useState(false);
  const [isRenameSegmentModalOpen, setIsRenameSegmentModalOpen] = useState(false);
  const [isDeleteSegmentModalOpen, setIsDeleteSegmentModalOpen] = useState(false);
  const [segmentActionId, setSegmentActionId] = useState(null);

  const [selectedClientForHistory, setSelectedClientForHistory] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [selectedClientForRapport, setSelectedClientForRapport] = useState(null);
  const [isRapportOpen, setIsRapportOpen] = useState(false);

  // Sales Protocol State
  const [selectedClientForProtocol, setSelectedClientForProtocol] = useState(null);
  const [isSalesProtocolOpen, setIsSalesProtocolOpen] = useState(false);

  // Revert Client State
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [clientToRevert, setClientToRevert] = useState(null);
  const [isReverting, setIsReverting] = useState(false);

  // Edit Client State
  const [selectedClientForEdit, setSelectedClientForEdit] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [metrics, setMetrics] = useState(null);
  const { overdueList, upcomingList } = useReminders();

  useEffect(() => {
    if (!isAdmin) return;
    const fetchSalesTeam = async () => {
      const { data, error } = await supabase
        .from('sales_team')
        .select('id, name, user_id, linked_user_id, email');
        
      if (error) {
        console.error('Error fetching sales team:', error);
        return;
      }
      
      if (data) {
        const uniqueMembers = Array.from(new Map(data.map(m => [m.id, m])).values());
        setSalesMembers(uniqueMembers);
      }
    };
    fetchSalesTeam();
  }, [isAdmin]);

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
    if (!clients || clients.length === 0) {
      setClientTagsMap({});
      setTagsLoading(false);
      return;
    }
    const buildMap = async () => {
      setTagsLoading(true);
      try {
        const map = await buildClientTagsMap(clients);
        setClientTagsMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setTagsLoading(false);
      }
    };
    buildMap();
  }, [clients]);

  // Load Segments
  const fetchSegments = useCallback(async () => {
    if (!user) return;
    setIsLoadingSegments(true);
    try {
      const data = await getSavedSegments(user.id, 'clients');
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
    const saved = localStorage.getItem('memberClientsFiltersV3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFilters(parsed.filters || defaultFilters);
        setIncludeTagIds(parsed.includeTagIds || []);
        setExcludeTagIds(parsed.excludeTagIds || []);
        setIncludeMode(parsed.includeMode || 'any');
      } catch (e) {
        console.error('Failed to parse clients filters', e);
      }
    }

    const savedSegment = localStorage.getItem('activeSegmentId:clients');
    if (savedSegment) {
      setActiveSegmentId(savedSegment);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem('memberClientsFiltersV3', JSON.stringify({ filters, includeTagIds, excludeTagIds, includeMode }));
    if (activeSegmentId) {
      localStorage.setItem('activeSegmentId:clients', activeSegmentId);
    } else {
      localStorage.removeItem('activeSegmentId:clients');
    }
  }, [filters, includeTagIds, excludeTagIds, includeMode, user, activeSegmentId]);

  useEffect(() => {
    if (user?.id) {
      getRapportMetrics(user.id).then(setMetrics).catch(console.error);
    }
  }, [user, clients]);

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
      const newSegment = await createSavedSegment(user.id, 'clients', name, payload, isFavorite);
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
    setSelectedOwner('all');
  };

  // Revert Client Handlers
  const handleOpenRevertDialog = (client) => {
    setClientToRevert(client);
    setShowRevertDialog(true);
  };

  const handleConfirmRevert = async (reason) => {
    if (!clientToRevert || !user) return;

    setIsReverting(true);
    try {
      const { data, error } = await supabase.rpc('revert_client_to_prospect', {
        p_client_id: clientToRevert.id,
        p_reason: reason || null,
        p_reverted_by: user.id
      });

      if (error) {
        throw new Error(error.message || 'Failed to revert client to prospect');
      }

      if (data?.success) {
        toast({
          title: "Éxito",
          description: "Cliente revertido a prospecto exitosamente",
        });

        setShowRevertDialog(false);
        setClientToRevert(null);

        // Refresh the clients list
        await refetch();
      } else {
        throw new Error(data?.message || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Revert client error:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo revertir el cliente a prospecto. Por favor, intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsReverting(false);
    }
  };

  const handleOpenSalesProtocol = (client) => {
    setSelectedClientForProtocol(client);
    setIsSalesProtocolOpen(true);
  };

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    let result = clients;
    
    // Owner filter (Admin only)
    if (isAdmin && selectedOwner !== 'all') {
      const selectedMember = salesMembers.find(m => m.id === selectedOwner);
      const targetUserId = selectedMember?.linked_user_id || selectedMember?.user_id || selectedOwner;
      result = result.filter(c => c.owner_user_id === targetUserId);
    }

    // Search
    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(c => {
        const name = String(c.prospect_name || c.client_name || '').toLowerCase();
        const notes = (c.client_notes || '').toLowerCase();
        return name.includes(term) || notes.includes(term);
      });
    }

    // Apply Tags Filter using clientTagsMap
    if (Object.keys(clientTagsMap).length > 0) {
      if (includeTagIds.length > 0) {
        if (includeMode === 'any') {
          result = result.filter(c => {
            const cTags = clientTagsMap[c.id] || [];
            return cTags.some(ct => includeTagIds.includes(ct.id));
          });
        } else {
          result = result.filter(c => {
            const cTags = clientTagsMap[c.id] || [];
            return includeTagIds.every(tagId => cTags.some(ct => ct.id === tagId));
          });
        }
      }

      if (excludeTagIds.length > 0) {
        result = result.filter(c => {
          const cTags = clientTagsMap[c.id] || [];
          return !cTags.some(ct => excludeTagIds.includes(ct.id));
        });
      }
    }

    return result;
  }, [clients, filters, includeTagIds, excludeTagIds, includeMode, clientTagsMap, isAdmin, selectedOwner, salesMembers]);

  const totalPotencial = filteredClients.reduce((sum, c) => sum + Number(c.estimated_property_value || 0), 0);
  const pendingCount = filteredClients.filter(c => c.pending_for_financials).length;
  const totalClients = filteredClients.length;

  const handleEdit = (client) => {
    setSelectedClientForEdit(client);
    setIsEditModalOpen(true);
  };

  const handleViewRapport = (client) => {
    setSelectedClientForRapport(client);
    setIsRapportOpen(true);
  };

  const formatChannel = (channel) => {
    switch(channel) {
      case 'email': return 'Email';
      case 'phone': return 'Phone';
      case 'both': return 'Email + Phone';
      case 'other': return 'Other';
      default: return '-';
    }
  };

  const loading = clientsLoading || tagsLoading || isLoadingSegments;

  if (loading && (!clients || clients.length === 0)) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Mis Clientes</h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Hubo un problema al cargar los clientes: {error.message}
          </AlertDescription>
        </Alert>
      )}

      <RapportMetrics metrics={metrics} />

      {overdueList.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-bold mb-3 flex items-center"><AlertCircle className="w-4 h-4 mr-2" /> Overdue Touchpoints</h3>
          <div className="space-y-2">
            {overdueList.map(tp => (
              <div key={`overdue-tp-${tp.id}`} className="flex justify-between items-center bg-white p-3 rounded shadow-sm text-sm">
                <div>
                  <span className="font-semibold">{tp.clients?.prospect_name || 'Unknown'}</span>
                  <span className="text-muted-foreground ml-2">• Step {tp.step} ({tp.purpose})</span>
                  <span className="text-red-600 ml-2 block sm:inline mt-1 sm:mt-0">
                    Due: {format(new Date(tp.due_at), 'MMM d, yyyy')} ({formatDistanceToNow(new Date(tp.due_at))} ago)
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleViewRapport({id: tp.client_id, prospect_name: tp.clients?.prospect_name})}>
                  Plan
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ClientsFilterPanel 
        filters={filters}
        onFiltersChange={(newFilters) => { setFilters(newFilters); setActiveSegmentId(null); }}
        onReset={handleClearSegment}
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
      />

      {isAdmin && (
        <div className="flex items-center space-x-3 mb-4 bg-muted/30 p-3 rounded-lg border">
          <Label className="font-semibold text-muted-foreground whitespace-nowrap">Vendedor:</Label>
          <Select 
            value={selectedOwner} 
            onValueChange={(val) => { 
              setSelectedOwner(val); 
              setActiveSegmentId(null); 
            }}
          >
            <SelectTrigger className="w-[280px] bg-background">
              <SelectValue placeholder="Todos los vendedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los vendedores</SelectItem>
              {salesMembers.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name || member.email || 'Sin nombre'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(filters.search || filters.conversionChannel !== 'all' || filters.seniorManagerInvolved !== 'all' || includeTagIds.length > 0 || excludeTagIds.length > 0 || (isAdmin && selectedOwner !== 'all')) && !activeSegmentId && (
        <div className="flex flex-wrap gap-2 items-center text-sm mb-4">
          <span className="text-muted-foreground font-medium">Filtros Activos:</span>
          {filters.search && <Badge variant="secondary">Búsqueda <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => { setFilters(prev => ({...prev, search: ''})); setActiveSegmentId(null); }} /></Badge>}
          {filters.conversionChannel !== 'all' && <Badge variant="secondary">Canal: {filters.conversionChannel} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => { setFilters(prev => ({...prev, conversionChannel: 'all'})); setActiveSegmentId(null); }} /></Badge>}
          {filters.seniorManagerInvolved !== 'all' && <Badge variant="secondary">Sr/Mgr Involucrado: {filters.seniorManagerInvolved} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => { setFilters(prev => ({...prev, seniorManagerInvolved: 'all'})); setActiveSegmentId(null); }} /></Badge>}
          {includeTagIds.length > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
              Includes: {includeTagIds.length} ({includeMode}) <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => { setIncludeTagIds([]); setActiveSegmentId(null); }} />
            </Badge>
          )}
          {excludeTagIds.length > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">
              Excludes: {excludeTagIds.length} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => { setExcludeTagIds([]); setActiveSegmentId(null); }} />
            </Badge>
          )}
          {isAdmin && selectedOwner !== 'all' && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
              Vendedor: {salesMembers.find(m => m.id === selectedOwner)?.name || 'Específico'} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => { setSelectedOwner('all'); setActiveSegmentId(null); }} />
            </Badge>
          )}
        </div>
      )}

      {/* Segment Modals */}
      <SavedSegmentsModal
        isOpen={isSaveSegmentModalOpen}
        onClose={() => setIsSaveSegmentModalOpen(false)}
        onSave={handleSaveSegment}
        scope="clients"
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

      {/* Revert Client Modal */}
      <RevertClientModal
        isOpen={showRevertDialog}
        onClose={() => {
          setShowRevertDialog(false);
          setClientToRevert(null);
        }}
        client={clientToRevert}
        onConfirm={handleConfirmRevert}
        isLoading={isReverting}
      />

      {/* Sales Protocol Modal */}
      <ClientSalesProtocolModal
        isOpen={isSalesProtocolOpen}
        onClose={() => setIsSalesProtocolOpen(false)}
        client={selectedClientForProtocol}
        onSaved={refetch}
      />

      {/* Edit Client Modal */}
      <EditClientModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        client={selectedClientForEdit}
        onSave={refetch}
      />

      {/* KPIs Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-lg shadow border">
          <h3 className="text-sm text-muted-foreground font-semibold mb-2">Total Clientes</h3>
          <p className="text-3xl font-bold">{totalClients}</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow border">
          <h3 className="text-sm text-muted-foreground font-semibold mb-2">Valor Total Estimado</h3>
          <p className="text-3xl font-bold">${totalPotencial.toLocaleString()}</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow border">
          <h3 className="text-sm text-muted-foreground font-semibold mb-2">Pendientes de Finanzas</h3>
          <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Lista de Clientes</h2>
        <div className="max-h-[600px] overflow-y-auto overflow-x-auto border rounded-lg bg-white shadow relative">
          <Table className="relative border-collapse w-full">
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow>
                <TableHead className="bg-white">Ext ID</TableHead>
                <TableHead className="bg-white">Nombre</TableHead>
                <TableHead className="bg-white">Tags</TableHead>
                <TableHead className="bg-white">Conversión</TableHead>
                <TableHead className="bg-white">Valor Est.</TableHead>
                <TableHead className="bg-white">Tipo</TableHead>
                <TableHead className="bg-white">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map(c => {
                const tags = clientTagsMap[c.id] || [];
                const uniqueDisplayTags = Array.from(new Map(tags.map(t => [t.id, t])).values());

                return (
                  <TableRow key={c.id}>
                    <TableCell>{c.external_id || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <span>{c.prospect_name || c.client_name || '—'}</span>
                        {c.pending_for_financials && (
                          <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-200 bg-orange-50 px-1 py-0 h-4">
                            Pendiente Finanzas
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[100px]">
                        {uniqueDisplayTags.map(t => (
                          <Badge key={`tag-${c.id}-${t.id}`} style={{backgroundColor: t.color, color: '#fff'}} className="text-[10px] px-1 py-0 h-4">
                            {t.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="text-xs w-fit">
                          Ch: {formatChannel(c.conversion_channel)}
                        </Badge>
                        <Badge variant={c.senior_manager_involved ? "default" : "secondary"} className="text-xs w-fit">
                          Sr/Mgr: {c.senior_manager_involved ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>${Number(c.estimated_property_value || 0).toLocaleString()}</TableCell>
                    <TableCell>{c.property_type}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(c)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleViewRapport(c)}>Plan</Button>
                        <Button variant="outline" size="sm" onClick={() => handleOpenSalesProtocol(c)}>Protocolo</Button>
                        <Button variant="outline" size="sm" onClick={() => handleOpenRevertDialog(c)} className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200">Revertir</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredClients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-4">No se encontraron clientes que coincidan con los filtros.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ClientHistoryDrawer 
        open={isHistoryOpen} 
        onOpenChange={setIsHistoryOpen} 
        clientId={selectedClientForHistory} 
      />

      <RapportPlanDrawer
        isOpen={isRapportOpen}
        onClose={() => setIsRapportOpen(false)}
        clientId={selectedClientForRapport?.id}
        clientName={selectedClientForRapport?.prospect_name || selectedClientForRapport?.client_name || 'Client'}
      />
    </div>
  );
};

export default ClientsPage;
